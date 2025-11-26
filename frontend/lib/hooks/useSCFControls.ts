import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { queryKeys } from '@/lib/react-query/hooks'

export type SCFControl = {
  id: string
  control_id: string
  title: string
  description: string
  domain: string
  weight: number
  is_mcr: boolean
  is_dsr: boolean
  applicability_people: boolean
  applicability_processes: boolean
  applicability_technology: boolean
  applicability_data: boolean
  applicability_facilities: boolean
  nist_800_53: string | null
  iso_27001: string | null
  pci_dss: string | null
}

/**
 * Hook to fetch all SCF controls
 */
export function useSCFControls() {
  const supabase = createClient()

  return useQuery({
    queryKey: queryKeys.scfControls,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scf_controls')
        .select('*')
        .order('control_id')

      if (error) throw error
      return data as SCFControl[]
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - controls don't change often
  })
}

/**
 * Hook to fetch a single SCF control
 */
export function useSCFControl(id: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: queryKeys.scfControl(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scf_controls')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      return data as SCFControl
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  })
}
