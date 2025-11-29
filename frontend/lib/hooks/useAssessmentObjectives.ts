import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export type AssessmentObjective = {
  id: string
  control_id: string
  ao_id: string
  statement: string
  origin: string | null
  notes: string | null
  asset_type: string | null
  assessment_procedure: string | null
  evidence_expected: string | null
  metadata: {
    frameworks?: string[]
  }
  created_at: string
}

/**
 * Hook to fetch assessment objectives for a specific SCF control
 */
export function useAssessmentObjectivesByControl(controlId: string | undefined) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['assessment-objectives', 'by-control', controlId],
    queryFn: async () => {
      if (!controlId) return []

      const { data, error } = await supabase
        .from('assessment_objectives')
        .select('*')
        .eq('control_id', controlId)
        .order('ao_id')

      if (error) throw error
      return data as AssessmentObjective[]
    },
    enabled: !!controlId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}

/**
 * Hook to fetch assessment objectives for a control by its SCF control_id string
 * This first looks up the UUID from scf_controls, then fetches AOs
 */
export function useAssessmentObjectivesBySCFId(scfControlId: string | undefined) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['assessment-objectives', 'by-scf-id', scfControlId],
    queryFn: async () => {
      if (!scfControlId) return []

      // First get the UUID from scf_controls
      const { data: control, error: controlError } = await supabase
        .from('scf_controls')
        .select('id')
        .eq('control_id', scfControlId)
        .single()

      if (controlError) {
        if (controlError.code === 'PGRST116') return [] // Not found
        throw controlError
      }

      if (!control) return []

      // Then fetch assessment objectives
      const { data, error } = await supabase
        .from('assessment_objectives')
        .select('*')
        .eq('control_id', control.id)
        .order('ao_id')

      if (error) throw error
      return data as AssessmentObjective[]
    },
    enabled: !!scfControlId,
    staleTime: 10 * 60 * 1000,
  })
}

/**
 * Hook to fetch assessment objectives count for a framework
 * Uses metadata->'frameworks' to filter by applicable frameworks
 */
export function useAssessmentObjectivesCountByFramework(frameworkCode: string | undefined) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['assessment-objectives', 'count', frameworkCode],
    queryFn: async () => {
      if (!frameworkCode) return 0

      // Map common framework codes to metadata framework codes
      const frameworkMap: Record<string, string> = {
        'SCF': 'SCF_BASELINE',
        'NIST-800-53': 'NIST_800_53_R5',
        'NIST-800-171': 'NIST_800_171_R3',
        'NIST-800-172': 'NIST_800_172',
        'CMMC': 'CMMC_L1',
        'DHS-ZTCF': 'DHS_ZTCF',
      }

      const metadataFrameworkCode = frameworkMap[frameworkCode] || frameworkCode

      const { count, error } = await supabase
        .from('assessment_objectives')
        .select('*', { count: 'exact', head: true })
        .contains('metadata', { frameworks: [metadataFrameworkCode] })

      if (error) throw error
      return count || 0
    },
    enabled: !!frameworkCode,
    staleTime: 10 * 60 * 1000,
  })
}

/**
 * Hook to get assessment objectives statistics
 */
export function useAssessmentObjectivesStats() {
  const supabase = createClient()

  return useQuery({
    queryKey: ['assessment-objectives', 'stats'],
    queryFn: async () => {
      // Get total count
      const { count: total } = await supabase
        .from('assessment_objectives')
        .select('*', { count: 'exact', head: true })

      // Get counts by origin type
      const { data: byOrigin } = await supabase
        .from('assessment_objectives')
        .select('origin')

      const originCounts: Record<string, number> = {}
      byOrigin?.forEach(ao => {
        let originType = 'Other'
        if (ao.origin?.startsWith('SCF Created')) originType = 'SCF Created'
        else if (ao.origin?.startsWith('53A_')) originType = 'NIST 800-53A'
        else if (ao.origin?.startsWith('171A_')) originType = 'NIST 800-171A'
        originCounts[originType] = (originCounts[originType] || 0) + 1
      })

      return {
        total: total || 0,
        byOrigin: originCounts,
      }
    },
    staleTime: 10 * 60 * 1000,
  })
}
