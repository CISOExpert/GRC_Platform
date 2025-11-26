import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { queryKeys } from '@/lib/react-query/hooks'

export type SavedView = {
  id: string
  user_id: string
  organization_id: string | null
  view_name: string
  view_type: string
  configuration: {
    // New unified configuration structure
    primaryFramework: string
    displayMode: 'compact' | 'expanded'
    compareToFramework: string
    additionalFrameworks: string[]
    searchQuery: string
    showFilterPanel: boolean
    filterPanelWidth: number
    showAllPrimaryControls?: boolean
    // Legacy fields for backward compatibility
    viewMode?: 'scf' | 'framework'
    selectedFramework?: string
    selectedFrameworks?: string[]
  }
  created_at: string
  updated_at: string
}

/**
 * Hook to fetch all saved views for the current user
 */
export function useSavedViews(userId?: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: queryKeys.savedViews,
    queryFn: async () => {
      let query = supabase
        .from('saved_views')
        .select('*')
        .order('created_at', { ascending: false })

      if (userId) {
        query = query.eq('user_id', userId)
      }

      const { data, error } = await query

      if (error) throw error
      return data as SavedView[]
    },
    staleTime: 60 * 1000, // 1 minute
  })
}

/**
 * Hook to create a new saved view
 */
export function useCreateSavedView() {
  const queryClient = useQueryClient()
  const supabase = createClient()

  return useMutation({
    mutationFn: async (input: {
      organization_id?: string | null
      view_name: string
      view_type: string
      configuration: SavedView['configuration']
    }) => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('saved_views')
        .insert([{
          ...input,
          user_id: user.id
        }])
        .select()
        .single()

      if (error) throw error
      return data as SavedView
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.savedViews })
    },
  })
}

/**
 * Hook to update a saved view
 */
export function useUpdateSavedView() {
  const queryClient = useQueryClient()
  const supabase = createClient()

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string
      updates: Partial<{
        view_name: string
        view_type: string
        configuration: SavedView['configuration']
      }>
    }) => {
      const { data, error } = await supabase
        .from('saved_views')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as SavedView
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.savedViews })
    },
  })
}

/**
 * Hook to delete a saved view
 */
export function useDeleteSavedView() {
  const queryClient = useQueryClient()
  const supabase = createClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('saved_views')
        .delete()
        .eq('id', id)

      if (error) throw error
      return id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.savedViews })
    },
  })
}
