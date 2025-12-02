import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { queryKeys } from '@/lib/react-query/hooks'

export type EvidenceTemplate = {
  id: string
  erl_id: string
  artifact_name: string
  area_of_focus: string
  description: string | null
  control_mappings: string | null  // Newline-separated SCF control refs (e.g., "GOV-01\nPRI-01")
  // Legacy fields for backwards compatibility (may not exist in DB)
  evidence_documentation_guidance?: string | null
  artifact_format?: string | null
  retention_period?: string | null
  examples?: string[] | null
  notes?: string | null
}

/**
 * Parse control_mappings string into array of SCF control refs
 */
export function parseControlMappings(mappings: string | null): string[] {
  if (!mappings) return []
  return mappings.split('\n').map(s => s.trim()).filter(Boolean)
}

/**
 * Hook to fetch all evidence templates
 */
export function useEvidenceTemplates() {
  const supabase = createClient()

  return useQuery({
    queryKey: ['evidence-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('evidence_templates')
        .select('*')
        .order('erl_id')

      if (error) throw error
      return data as EvidenceTemplate[]
    },
    staleTime: 5 * 60 * 1000,
  })
}
