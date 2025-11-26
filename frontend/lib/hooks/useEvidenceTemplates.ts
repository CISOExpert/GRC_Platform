import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { queryKeys } from '@/lib/react-query/hooks'

export type EvidenceTemplate = {
  id: string
  erl_id: string
  artifact_name: string
  area_of_focus: string
  evidence_documentation_guidance: string | null
  artifact_format: string | null
  retention_period: string | null
  examples: string[] | null
  notes: string | null
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
