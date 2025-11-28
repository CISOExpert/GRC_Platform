import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { queryKeys } from '@/lib/react-query/hooks'

export type Framework = {
  id: string
  code: string
  name: string
  version: string | null
  description: string | null
  geography?: string | null
  source_organization?: string | null
  mapping_count?: number  // Number of SCF control mappings
  external_control_count?: number  // Number of external controls
}

export type FrameworkStats = {
  totalControls: number
  totalDomains: number
  scfMappingCount: number
  mappingCoverage: number // percentage
  controlsByLevel: Record<string, number>
}

/**
 * Hook to fetch all frameworks
 */
export function useFrameworks() {
  const supabase = createClient()

  return useQuery({
    queryKey: queryKeys.frameworks,
    queryFn: async () => {
      console.log('[useFrameworks] Calling get_frameworks_with_counts RPC...')
      
      // Use RPC to get frameworks with counts via SQL aggregation
      const { data, error } = await supabase.rpc('get_frameworks_with_counts')

      if (error) {
        console.error('[useFrameworks] RPC Error:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        throw error
      }
      
      console.log('[useFrameworks] Success:', data?.length, 'frameworks')
      return (data || []) as Framework[]
    },
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Hook to fetch a single framework
 */
export function useFramework(id: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: queryKeys.framework(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('frameworks')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      return data as Framework
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Hook to fetch organization frameworks
 */
export function useOrganizationFrameworks(orgId: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: queryKeys.organizationFrameworks(orgId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organization_frameworks')
        .select(`
          *,
          frameworks (
            id,
            code,
            name,
            version,
            description
          )
        `)
        .eq('organization_id', orgId)

      if (error) throw error
      return data
    },
    enabled: !!orgId,
  })
}

/**
 * Hook to add framework to organization
 */
export function useAddOrganizationFramework() {
  const queryClient = useQueryClient()
  const supabase = createClient()

  return useMutation({
    mutationFn: async (input: {
      organization_id: string
      framework_id: string
      is_primary?: boolean
      compliance_status?: string
      notes?: string
    }) => {
      const { data, error } = await supabase
        .from('organization_frameworks')
        .insert([input])
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.organizationFrameworks(variables.organization_id)
      })
    },
  })
}

/**
 * Hook to remove framework from organization
 */
export function useRemoveOrganizationFramework() {
  const queryClient = useQueryClient()
  const supabase = createClient()

  return useMutation({
    mutationFn: async ({ id, orgId }: { id: string; orgId: string }) => {
      const { error } = await supabase
        .from('organization_frameworks')
        .delete()
        .eq('id', id)

      if (error) throw error
      return id
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.organizationFrameworks(variables.orgId)
      })
    },
  })
}

/**
 * Hook to update organization framework
 */
export function useUpdateOrganizationFramework() {
  const queryClient = useQueryClient()
  const supabase = createClient()

  return useMutation({
    mutationFn: async ({ id, orgId, updates }: {
      id: string
      orgId: string
      updates: {
        is_primary?: boolean
        compliance_status?: string
        target_completion_date?: string | null
        notes?: string | null
      }
    }) => {
      const { data, error } = await supabase
        .from('organization_frameworks')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.organizationFrameworks(variables.orgId)
      })
    },
  })
}

/**
 * Hook to fetch detailed framework statistics
 */
export function useFrameworkStats(frameworkId: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['frameworkStats', frameworkId],
    queryFn: async (): Promise<FrameworkStats> => {
      // Get all controls for this framework
      const { data: controls, error: controlsError } = await supabase
        .from('external_controls')
        .select('id, hierarchy_level, is_group, parent_id')
        .eq('framework_id', frameworkId)

      if (controlsError) throw controlsError

      // Get SCF framework ID
      const { data: scfFramework } = await supabase
        .from('frameworks')
        .select('id')
        .eq('code', 'SCF')
        .single()

      // Get mapping count (SCF controls that map to this framework)
      let scfMappingCount = 0
      let controlsWithMappings = 0

      if (scfFramework) {
        const { count: mappingCount } = await supabase
          .from('framework_crosswalks')
          .select('*', { count: 'exact', head: true })
          .eq('source_framework_id', scfFramework.id)
          .eq('target_framework_id', frameworkId)

        scfMappingCount = mappingCount || 0

        // Get unique controls that have mappings
        const { data: mappedControls } = await supabase
          .from('framework_crosswalks')
          .select('target_control_id')
          .eq('source_framework_id', scfFramework.id)
          .eq('target_framework_id', frameworkId)

        if (mappedControls) {
          const uniqueControlIds = new Set(mappedControls.map(m => m.target_control_id))
          controlsWithMappings = uniqueControlIds.size
        }
      }

      // Calculate stats
      const totalControls = controls?.length || 0
      const domains = controls?.filter(c => c.is_group || (!c.parent_id && !c.hierarchy_level)) || []
      const totalDomains = domains.length

      // Count by hierarchy level
      const controlsByLevel: Record<string, number> = {}
      controls?.forEach(c => {
        const level = c.hierarchy_level || 'control'
        controlsByLevel[level] = (controlsByLevel[level] || 0) + 1
      })

      // Calculate mapping coverage (controls with at least one SCF mapping)
      const leafControls = controls?.filter(c => !c.is_group) || []
      const mappingCoverage = leafControls.length > 0
        ? Math.round((controlsWithMappings / leafControls.length) * 100)
        : 0

      return {
        totalControls,
        totalDomains,
        scfMappingCount,
        mappingCoverage,
        controlsByLevel
      }
    },
    enabled: !!frameworkId,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Hook to fetch extended framework details including metadata
 */
export function useFrameworkDetails(frameworkId: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['frameworkDetails', frameworkId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('frameworks')
        .select('*')
        .eq('id', frameworkId)
        .single()

      if (error) throw error
      return data as Framework & {
        geography: string | null
        source_organization: string | null
        created_at: string
      }
    },
    enabled: !!frameworkId,
    staleTime: 5 * 60 * 1000,
  })
}
