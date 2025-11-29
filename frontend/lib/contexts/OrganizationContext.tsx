'use client'

import { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

// Types
export type SelectionStatus = 'active' | 'evaluating'

export type OrganizationFramework = {
  id: string
  framework_id: string
  selection_status: SelectionStatus
  is_primary: boolean
  compliance_status: string | null
  display_order: number
  target_completion_date: string | null
  notes: string | null
  framework_code: string
  framework_name: string
  framework_version: string | null
  framework_description: string | null
  external_control_count: number
  mapping_count: number
}

type OrganizationContextValue = {
  // Current organization
  currentOrgId: string | null
  setCurrentOrgId: (id: string | null) => void
  isAllOrgsMode: boolean

  // Organization frameworks (from database function)
  selectedFrameworks: OrganizationFramework[]
  activeFrameworks: OrganizationFramework[]
  evaluatingFrameworks: OrganizationFramework[]
  primaryFramework: OrganizationFramework | null

  // Loading states
  isLoadingFrameworks: boolean
  frameworksError: Error | null

  // Permissions
  isAdmin: boolean

  // Refetch function
  refetchFrameworks: () => void
}

const OrganizationContext = createContext<OrganizationContextValue | undefined>(undefined)

const STORAGE_KEY = 'grc-selected-org-id'

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const [currentOrgId, setCurrentOrgIdState] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const supabase = createClient()

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved && saved !== 'all' && saved !== 'null') {
      setCurrentOrgIdState(saved)
    }
  }, [])

  // Persist to localStorage
  const setCurrentOrgId = (id: string | null) => {
    setCurrentOrgIdState(id)
    if (id) {
      localStorage.setItem(STORAGE_KEY, id)
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  }

  // Fetch organization frameworks using the database function
  const {
    data: frameworksData,
    isLoading: isLoadingFrameworks,
    error: frameworksError,
    refetch: refetchFrameworks
  } = useQuery({
    queryKey: ['organization-frameworks-prioritized', currentOrgId],
    queryFn: async () => {
      if (!currentOrgId) return []

      const { data, error } = await supabase
        .rpc('get_organization_frameworks_prioritized', { org_uuid: currentOrgId })

      if (error) throw error
      return (data || []) as OrganizationFramework[]
    },
    enabled: !!currentOrgId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  })

  // Check if user is admin for the current org
  useEffect(() => {
    async function checkAdminStatus() {
      if (!currentOrgId) {
        setIsAdmin(false)
        return
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setIsAdmin(false)
        return
      }

      const { data: membership } = await supabase
        .from('organization_members')
        .select('role')
        .eq('org_id', currentOrgId)
        .eq('user_id', user.id)
        .single()

      setIsAdmin(membership?.role === 'admin')
    }

    checkAdminStatus()
  }, [currentOrgId, supabase])

  // Compute filtered lists
  const selectedFrameworks = frameworksData || []

  const activeFrameworks = useMemo(
    () => selectedFrameworks.filter(f => f.selection_status === 'active'),
    [selectedFrameworks]
  )

  const evaluatingFrameworks = useMemo(
    () => selectedFrameworks.filter(f => f.selection_status === 'evaluating'),
    [selectedFrameworks]
  )

  const primaryFramework = useMemo(
    () => selectedFrameworks.find(f => f.is_primary) || activeFrameworks[0] || null,
    [selectedFrameworks, activeFrameworks]
  )

  const value: OrganizationContextValue = {
    currentOrgId,
    setCurrentOrgId,
    isAllOrgsMode: !currentOrgId,
    selectedFrameworks,
    activeFrameworks,
    evaluatingFrameworks,
    primaryFramework,
    isLoadingFrameworks,
    frameworksError: frameworksError as Error | null,
    isAdmin,
    refetchFrameworks: () => refetchFrameworks(),
  }

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  )
}

/**
 * Hook to access organization context
 */
export function useOrganizationContext() {
  const context = useContext(OrganizationContext)
  if (context === undefined) {
    throw new Error('useOrganizationContext must be used within OrganizationProvider')
  }
  return context
}

/**
 * Hook for just the current org ID (lighter weight)
 */
export function useCurrentOrgId() {
  const { currentOrgId, setCurrentOrgId, isAllOrgsMode } = useOrganizationContext()
  return { currentOrgId, setCurrentOrgId, isAllOrgsMode }
}

/**
 * Hook for just the organization frameworks
 */
export function useOrgFrameworks() {
  const {
    selectedFrameworks,
    activeFrameworks,
    evaluatingFrameworks,
    primaryFramework,
    isLoadingFrameworks,
    frameworksError,
    refetchFrameworks
  } = useOrganizationContext()

  return {
    selectedFrameworks,
    activeFrameworks,
    evaluatingFrameworks,
    primaryFramework,
    isLoading: isLoadingFrameworks,
    error: frameworksError,
    refetch: refetchFrameworks,
  }
}
