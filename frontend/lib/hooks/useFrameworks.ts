import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useMemo, useCallback } from 'react'
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

export type SelectionStatus = 'active' | 'evaluating'

/**
 * Hook to add framework to organization (enhanced with selection_status)
 */
export function useAddOrganizationFramework() {
  const queryClient = useQueryClient()
  const supabase = createClient()

  return useMutation({
    mutationFn: async (input: {
      organization_id: string
      framework_id: string
      is_primary?: boolean
      selection_status?: SelectionStatus
      compliance_status?: string
      notes?: string
    }) => {
      // Set default selection_status
      const insertData = {
        ...input,
        selection_status: input.selection_status || 'active'
      }

      const { data, error } = await supabase
        .from('organization_frameworks')
        .insert([insertData])
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.organizationFrameworks(variables.organization_id)
      })
      queryClient.invalidateQueries({
        queryKey: ['organization-frameworks-prioritized', variables.organization_id]
      })
      queryClient.invalidateQueries({
        queryKey: ['available-frameworks', variables.organization_id]
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
      queryClient.invalidateQueries({
        queryKey: ['organization-frameworks-prioritized', variables.orgId]
      })
      queryClient.invalidateQueries({
        queryKey: ['available-frameworks', variables.orgId]
      })
    },
  })
}

/**
 * Hook to update organization framework (enhanced with selection_status and display_order)
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
        selection_status?: SelectionStatus
        compliance_status?: string
        display_order?: number
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
      queryClient.invalidateQueries({
        queryKey: ['organization-frameworks-prioritized', variables.orgId]
      })
    },
  })
}

/**
 * Hook to get available frameworks for an organization (not yet selected)
 */
export function useAvailableFrameworksForOrg(orgId: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['available-frameworks', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_available_frameworks_for_org', { org_uuid: orgId })

      if (error) throw error
      return data as Array<{
        id: string
        code: string
        name: string
        version: string | null
        description: string | null
        external_control_count: number
        mapping_count: number
        is_selected: boolean
      }>
    },
    enabled: !!orgId,
    staleTime: 2 * 60 * 1000,
  })
}

/**
 * Hook to reorder frameworks (batch update display_order)
 */
export function useReorderOrganizationFrameworks() {
  const queryClient = useQueryClient()
  const supabase = createClient()

  return useMutation({
    mutationFn: async ({ orgId, orderedIds }: { orgId: string; orderedIds: string[] }) => {
      // Update display_order for each framework in order
      const updates = orderedIds.map((id, index) =>
        supabase
          .from('organization_frameworks')
          .update({ display_order: index })
          .eq('id', id)
      )

      await Promise.all(updates)
      return orderedIds
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.organizationFrameworks(variables.orgId)
      })
      queryClient.invalidateQueries({
        queryKey: ['organization-frameworks-prioritized', variables.orgId]
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

/**
 * Hook to get frameworks prioritized by organization selection
 * Returns frameworks in order: Active org frameworks > Evaluating org frameworks > Other frameworks
 * Also provides helper methods for filtering
 */
export function usePrioritizedFrameworks(orgId: string | null) {
  const { data: allFrameworks = [], isLoading: frameworksLoading } = useFrameworks()
  const supabase = createClient()

  // Fetch organization's selected frameworks if org is selected
  const { data: orgFrameworks = [], isLoading: orgFrameworksLoading } = useQuery({
    queryKey: ['organization-frameworks-prioritized', orgId],
    queryFn: async () => {
      if (!orgId) return []

      const { data, error } = await supabase
        .rpc('get_organization_frameworks_prioritized', { org_uuid: orgId })

      if (error) throw error
      return data || []
    },
    enabled: !!orgId,
    staleTime: 2 * 60 * 1000,
  })

  // Build prioritized list
  const prioritizedFrameworks = useMemo(() => {
    if (!allFrameworks.length) return []
    if (!orgId || !orgFrameworks.length) {
      // No org selected - just return all frameworks sorted by name
      return allFrameworks.slice().sort((a, b) => a.name.localeCompare(b.name))
    }

    // Build sets for quick lookup
    const activeIds = new Set(
      orgFrameworks
        .filter((of: any) => of.selection_status === 'active')
        .map((of: any) => of.framework_id)
    )
    const evaluatingIds = new Set(
      orgFrameworks
        .filter((of: any) => of.selection_status === 'evaluating')
        .map((of: any) => of.framework_id)
    )

    // Split frameworks into categories
    const activeFrameworks = allFrameworks.filter(f => activeIds.has(f.id))
    const evaluatingFrameworks = allFrameworks.filter(f => evaluatingIds.has(f.id))
    const otherFrameworks = allFrameworks.filter(f => !activeIds.has(f.id) && !evaluatingIds.has(f.id))

    // Sort each category by display_order (for org frameworks) or name
    const sortByDisplayOrder = (a: Framework, b: Framework) => {
      const aOrder = orgFrameworks.find((of: any) => of.framework_id === a.id)?.display_order ?? 999
      const bOrder = orgFrameworks.find((of: any) => of.framework_id === b.id)?.display_order ?? 999
      return aOrder - bOrder || a.name.localeCompare(b.name)
    }

    activeFrameworks.sort(sortByDisplayOrder)
    evaluatingFrameworks.sort(sortByDisplayOrder)
    otherFrameworks.sort((a, b) => a.name.localeCompare(b.name))

    return [...activeFrameworks, ...evaluatingFrameworks, ...otherFrameworks]
  }, [allFrameworks, orgFrameworks, orgId])

  // Helper: get only org-selected frameworks (active + evaluating)
  const selectedFrameworksOnly = useMemo(() => {
    if (!orgId || !orgFrameworks.length) return []

    const selectedIds = new Set(orgFrameworks.map((of: any) => of.framework_id))
    return prioritizedFrameworks.filter(f => selectedIds.has(f.id))
  }, [prioritizedFrameworks, orgFrameworks, orgId])

  // Helper: check if a framework is selected by the org
  const isFrameworkSelected = useCallback((frameworkId: string) => {
    if (!orgFrameworks.length) return false
    return orgFrameworks.some((of: any) => of.framework_id === frameworkId)
  }, [orgFrameworks])

  // Helper: get selection status for a framework
  const getSelectionStatus = useCallback((frameworkId: string): 'active' | 'evaluating' | null => {
    const of = orgFrameworks.find((of: any) => of.framework_id === frameworkId)
    return of?.selection_status || null
  }, [orgFrameworks])

  return {
    // All frameworks, prioritized by org selection
    frameworks: prioritizedFrameworks,
    // Only frameworks selected by the org
    selectedFrameworks: selectedFrameworksOnly,
    // Raw org framework data
    orgFrameworks,
    // Loading states
    isLoading: frameworksLoading || orgFrameworksLoading,
    // Helper methods
    isFrameworkSelected,
    getSelectionStatus,
  }
}
