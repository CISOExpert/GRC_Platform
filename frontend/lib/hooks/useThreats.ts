import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export type Threat = {
  id: string
  threat_id: string | null
  name: string
  description: string | null
  category: 'natural' | 'manmade'
  threat_grouping: string | null
  is_material_threat: boolean
  threat_references: string | null
  metadata: Record<string, unknown>
  created_at: string
  // Computed fields
  control_count?: number
}

export type ThreatWithControls = Threat & {
  threat_controls: {
    control_id: string
    mitigation_level: string | null
    notes: string | null
    external_controls: {
      id: string
      ref_code: string
      description: string | null
      framework_id: string
    }
  }[]
}

export type ThreatStats = {
  totalThreats: number
  naturalThreats: number
  manmadeThreats: number
  materialThreats: number
  byGrouping: Record<string, number>
  totalControlMappings: number
}

/**
 * Query keys for threats
 */
export const threatQueryKeys = {
  threats: ['threats'] as const,
  threat: (id: string) => ['threats', id] as const,
  threatWithControls: (id: string) => ['threats', id, 'controls'] as const,
  threatStats: ['threats', 'stats'] as const,
}

/**
 * Hook to fetch all threats
 */
export function useThreats() {
  const supabase = createClient()

  return useQuery({
    queryKey: threatQueryKeys.threats,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('threats')
        .select(`
          id,
          threat_id,
          name,
          description,
          category,
          threat_grouping,
          is_material_threat,
          threat_references,
          metadata,
          created_at
        `)
        .order('threat_id', { ascending: true })

      if (error) throw error
      return data as Threat[]
    },
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Hook to fetch a single threat with its control mappings
 */
export function useThreatWithControls(threatId: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: threatQueryKeys.threatWithControls(threatId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('threats')
        .select(`
          *,
          threat_controls (
            control_id,
            mitigation_level,
            notes,
            external_controls (
              id,
              ref_code,
              description,
              framework_id
            )
          )
        `)
        .eq('id', threatId)
        .single()

      if (error) throw error
      return data as ThreatWithControls
    },
    enabled: !!threatId,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Hook to fetch threat catalog statistics
 */
export function useThreatStats() {
  const supabase = createClient()

  return useQuery({
    queryKey: threatQueryKeys.threatStats,
    queryFn: async (): Promise<ThreatStats> => {
      // Get all threats
      const { data: threats, error: threatsError } = await supabase
        .from('threats')
        .select('id, category, threat_grouping, is_material_threat')

      if (threatsError) throw threatsError

      // Get total control mappings count
      const { count: mappingCount, error: mappingError } = await supabase
        .from('threat_controls')
        .select('*', { count: 'exact', head: true })

      if (mappingError) throw mappingError

      // Calculate groupings
      const byGrouping: Record<string, number> = {}
      let naturalThreats = 0
      let manmadeThreats = 0
      let materialThreats = 0

      threats?.forEach(threat => {
        if (threat.category === 'natural') naturalThreats++
        if (threat.category === 'manmade') manmadeThreats++
        if (threat.is_material_threat) materialThreats++
        if (threat.threat_grouping) {
          byGrouping[threat.threat_grouping] = (byGrouping[threat.threat_grouping] || 0) + 1
        }
      })

      return {
        totalThreats: threats?.length || 0,
        naturalThreats,
        manmadeThreats,
        materialThreats,
        byGrouping,
        totalControlMappings: mappingCount || 0,
      }
    },
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Hook to fetch controls mapped to a specific threat (direct SCF mappings only)
 * @deprecated Use useThreatControlsForFramework instead for framework-specific controls
 */
export function useThreatControls(threatId: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['threat-controls', threatId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('threat_controls')
        .select(`
          control_id,
          mitigation_level,
          notes,
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
        .eq('threat_id', threatId)

      if (error) throw error
      return data
    },
    enabled: !!threatId,
    staleTime: 5 * 60 * 1000,
  })
}

export type ThreatControlForFramework = {
  control_id: string
  ref_code: string
  description: string | null
  framework_id: string
  framework_code: string
  framework_name: string
  mapping_via_scf_control: string | null
  mitigation_level: string | null
}

/**
 * Hook to fetch controls mapped to a specific threat for a specific framework
 * Uses crosswalk mappings to show controls from any framework (not just SCF)
 */
export function useThreatControlsForFramework(threatId: string, frameworkId: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['threat-controls-framework', threatId, frameworkId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_threat_controls_for_framework', {
        p_threat_id: threatId,
        p_framework_id: frameworkId,
      })

      if (error) throw error
      return data as ThreatControlForFramework[]
    },
    enabled: !!threatId && !!frameworkId,
    staleTime: 5 * 60 * 1000,
  })
}
