import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { queryKeys } from '@/lib/react-query/hooks'

export type Organization = {
  id: string
  name: string
  org_type: string | null
  metadata: {
    industry?: string
    size?: string
    contact_email?: string
    contact_phone?: string
    address?: string
    city?: string
    state?: string
    country?: string
    postal_code?: string
    website?: string
    description?: string
  }
  created_at: string
}

type CreateOrganizationInput = {
  name: string
  org_type?: string | null
  metadata?: Record<string, unknown>
}

/**
 * Hook to fetch all organizations
 */
export function useOrganizations() {
  const supabase = createClient()

  return useQuery({
    queryKey: queryKeys.organizations,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as Organization[]
    },
  })
}

/**
 * Hook to fetch a single organization by ID
 */
export function useOrganization(id: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: queryKeys.organization(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      return data as Organization
    },
    enabled: !!id,
  })
}

/**
 * Hook to create a new organization
 */
export function useCreateOrganization() {
  const queryClient = useQueryClient()
  const supabase = createClient()

  return useMutation({
    mutationFn: async (input: CreateOrganizationInput) => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      // Create the organization
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert([input])
        .select()
        .single()

      if (orgError) throw orgError

      // Add the creator as an admin member
      const { error: memberError } = await supabase
        .from('organization_members')
        .insert([{
          org_id: org.id,
          user_id: user.id,
          role: 'admin'
        }])

      if (memberError) throw memberError

      return org as Organization
    },
    onSuccess: () => {
      // Invalidate and refetch organizations list
      queryClient.invalidateQueries({ queryKey: queryKeys.organizations })
    },
  })
}

/**
 * Hook to update an organization
 */
export function useUpdateOrganization() {
  const queryClient = useQueryClient()
  const supabase = createClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Organization> & { id: string }) => {
      const { data, error } = await supabase
        .from('organizations')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as Organization
    },
    onSuccess: (data) => {
      // Invalidate both the list and the specific organization
      queryClient.invalidateQueries({ queryKey: queryKeys.organizations })
      queryClient.invalidateQueries({ queryKey: queryKeys.organization(data.id) })
    },
  })
}

/**
 * Hook to delete an organization
 */
export function useDeleteOrganization() {
  const queryClient = useQueryClient()
  const supabase = createClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('organizations')
        .delete()
        .eq('id', id)

      if (error) throw error
      return id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.organizations })
    },
  })
}
