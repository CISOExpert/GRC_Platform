import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

/**
 * Query Keys for React Query
 * Centralized query keys for cache management
 */
export const queryKeys = {
  // Organizations
  organizations: ['organizations'] as const,
  organization: (id: string) => ['organizations', id] as const,

  // Frameworks
  frameworks: ['frameworks'] as const,
  framework: (id: string) => ['frameworks', id] as const,
  organizationFrameworks: (orgId: string) => ['organization-frameworks', orgId] as const,
  organizationFrameworksPrioritized: (orgId: string) => ['organization-frameworks-prioritized', orgId] as const,
  availableFrameworksForOrg: (orgId: string) => ['available-frameworks', orgId] as const,
  
  // SCF Controls
  scfControls: ['scf-controls'] as const,
  scfControl: (id: string) => ['scf-controls', id] as const,
  
  // Control Mappings
  controlMappings: ['control-mappings'] as const,
  controlMapping: (filters?: Record<string, unknown>) => ['control-mappings', filters] as const,
  
  // Saved Views
  savedViews: ['saved-views'] as const,
  savedView: (id: string) => ['saved-views', id] as const,
  userSavedViews: (userId: string) => ['saved-views', 'user', userId] as const,
  
  // External Controls
  externalControls: ['external-controls'] as const,
  externalControl: (id: string) => ['external-controls', id] as const,
} as const

/**
 * Hook to get Supabase client
 */
export function useSupabase() {
  return createClient()
}

/**
 * Hook to invalidate queries after mutations
 */
export function useInvalidateQueries() {
  const queryClient = useQueryClient()
  
  return {
    invalidateOrganizations: () => queryClient.invalidateQueries({ queryKey: queryKeys.organizations }),
    invalidateFrameworks: () => queryClient.invalidateQueries({ queryKey: queryKeys.frameworks }),
    invalidateSavedViews: () => queryClient.invalidateQueries({ queryKey: queryKeys.savedViews }),
    invalidateControlMappings: () => queryClient.invalidateQueries({ queryKey: queryKeys.controlMappings }),
  }
}
