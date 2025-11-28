import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export type Risk = {
  id: string
  risk_id: string | null
  title: string
  description: string | null
  category: string | null
  risk_grouping: string | null
  nist_csf_function: string | null
  status: string
  risk_owner: string | null
  impact_effect: number | null
  occurrence_likelihood: number | null
  inherent_risk_score: number | null
  residual_risk_score: number | null
  risk_tolerance_band: string | null
  org_id: string | null
  created_at: string
  updated_at: string
  // Computed fields
  control_count?: number
}

export type RiskWithControls = Risk & {
  risk_controls: {
    control_id: string
    control_effectiveness: string | null
    external_controls: {
      id: string
      ref_code: string
      description: string | null
      framework_id: string
    }
  }[]
}

export type RiskStats = {
  totalRisks: number
  catalogRisks: number
  byGrouping: Record<string, number>
  byCategory: Record<string, number>
  byNistFunction: Record<string, number>
  totalControlMappings: number
}

/**
 * Query keys for risks
 */
export const riskQueryKeys = {
  risks: ['risks'] as const,
  catalogRisks: ['risks', 'catalog'] as const,
  risk: (id: string) => ['risks', id] as const,
  riskWithControls: (id: string) => ['risks', id, 'controls'] as const,
  riskStats: ['risks', 'stats'] as const,
}

/**
 * Hook to fetch all catalog risks (status = 'catalog')
 * These are the SCF Risk Taxonomy entries
 */
export function useCatalogRisks() {
  const supabase = createClient()

  return useQuery({
    queryKey: riskQueryKeys.catalogRisks,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('risks')
        .select(`
          id,
          risk_id,
          title,
          description,
          category,
          risk_grouping,
          nist_csf_function,
          status,
          created_at,
          updated_at
        `)
        .eq('status', 'catalog')
        .order('risk_id', { ascending: true })

      if (error) throw error
      return data as Risk[]
    },
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Hook to fetch a single risk with its control mappings
 */
export function useRiskWithControls(riskId: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: riskQueryKeys.riskWithControls(riskId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('risks')
        .select(`
          *,
          risk_controls (
            control_id,
            control_effectiveness,
            external_controls (
              id,
              ref_code,
              description,
              framework_id
            )
          )
        `)
        .eq('id', riskId)
        .single()

      if (error) throw error
      return data as RiskWithControls
    },
    enabled: !!riskId,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Hook to fetch risk catalog statistics
 */
export function useRiskStats() {
  const supabase = createClient()

  return useQuery({
    queryKey: riskQueryKeys.riskStats,
    queryFn: async (): Promise<RiskStats> => {
      // Get all catalog risks
      const { data: risks, error: risksError } = await supabase
        .from('risks')
        .select('id, risk_grouping, category, nist_csf_function, status')

      if (risksError) throw risksError

      // Get total control mappings count
      const { count: mappingCount, error: mappingError } = await supabase
        .from('risk_controls')
        .select('*', { count: 'exact', head: true })

      if (mappingError) throw mappingError

      const catalogRisks = risks?.filter(r => r.status === 'catalog') || []

      // Calculate groupings
      const byGrouping: Record<string, number> = {}
      const byCategory: Record<string, number> = {}
      const byNistFunction: Record<string, number> = {}

      catalogRisks.forEach(risk => {
        if (risk.risk_grouping) {
          byGrouping[risk.risk_grouping] = (byGrouping[risk.risk_grouping] || 0) + 1
        }
        if (risk.category) {
          byCategory[risk.category] = (byCategory[risk.category] || 0) + 1
        }
        if (risk.nist_csf_function) {
          byNistFunction[risk.nist_csf_function] = (byNistFunction[risk.nist_csf_function] || 0) + 1
        }
      })

      return {
        totalRisks: risks?.length || 0,
        catalogRisks: catalogRisks.length,
        byGrouping,
        byCategory,
        byNistFunction,
        totalControlMappings: mappingCount || 0,
      }
    },
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Hook to fetch controls mapped to a specific risk (direct SCF mappings only)
 * @deprecated Use useRiskControlsForFramework instead for framework-specific controls
 */
export function useRiskControls(riskId: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['risk-controls', riskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('risk_controls')
        .select(`
          control_id,
          control_effectiveness,
          external_controls (
            id,
            ref_code,
            description,
            framework_id,
            frameworks (
              id,
              code,
              name
            )
          )
        `)
        .eq('risk_id', riskId)

      if (error) throw error
      return data
    },
    enabled: !!riskId,
    staleTime: 5 * 60 * 1000,
  })
}

export type RiskControlForFramework = {
  control_id: string
  ref_code: string
  description: string | null
  framework_id: string
  framework_code: string
  framework_name: string
  mapping_via_scf_control: string | null
  control_effectiveness: string | null
}

/**
 * Hook to fetch controls mapped to a specific risk for a specific framework
 * Uses crosswalk mappings to show controls from any framework (not just SCF)
 */
export function useRiskControlsForFramework(riskId: string, frameworkId: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['risk-controls-framework', riskId, frameworkId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_risk_controls_for_framework', {
        p_risk_id: riskId,
        p_framework_id: frameworkId,
      })

      if (error) throw error
      return data as RiskControlForFramework[]
    },
    enabled: !!riskId && !!frameworkId,
    staleTime: 5 * 60 * 1000,
  })
}
