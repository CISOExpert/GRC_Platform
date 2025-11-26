import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { queryKeys } from '@/lib/react-query/hooks'

export type Framework = {
  id: string
  code: string
  name: string
  version: string | null
  description: string | null
  mapping_count?: number  // Number of SCF control mappings
  external_control_count?: number  // Number of external controls
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
