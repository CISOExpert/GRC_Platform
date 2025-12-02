import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export type EvidenceRequest = {
  id: string
  sort_order: number
  erl_id: string
  area_of_focus: string
  documentation_artifact: string
  artifact_description: string | null
}

export type EvidenceRequestWithControls = EvidenceRequest & {
  controls: Array<{
    id: string
    ref_code: string
    description: string
  }>
}

export type EvidenceRequestMapping = {
  id: string
  evidence_request_id: string
  control_id: string
  control_ref: string
}

/**
 * Hook to fetch all evidence requests
 */
export function useEvidenceRequests() {
  const supabase = createClient()

  return useQuery({
    queryKey: ['evidence-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('evidence_requests')
        .select('*')
        .order('sort_order')

      if (error) throw error
      return data as EvidenceRequest[]
    },
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Hook to fetch evidence requests for a specific SCF control by UUID
 */
export function useEvidenceRequestsForControl(controlId: string | null) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['evidence-requests-for-control', controlId],
    queryFn: async () => {
      if (!controlId) return []

      const { data, error } = await supabase
        .rpc('get_evidence_requests_for_control', { control_uuid: controlId })

      if (error) throw error
      return data as EvidenceRequest[]
    },
    enabled: !!controlId,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Hook to fetch evidence requests for a specific SCF control by ref code (e.g., "GOV-01")
 */
export function useEvidenceRequestsForControlRef(refCode: string | undefined) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['evidence-requests-for-control-ref', refCode],
    queryFn: async () => {
      if (!refCode) return []

      // First, get the control UUID from the ref code
      const { data: control, error: controlError } = await supabase
        .from('external_controls')
        .select('id')
        .eq('ref_code', refCode)
        .single()

      if (controlError || !control) {
        console.log('[useEvidenceRequestsForControlRef] No control found for ref:', refCode)
        return []
      }

      // Now get the evidence requests for this control
      const { data, error } = await supabase
        .rpc('get_evidence_requests_for_control', { control_uuid: control.id })

      if (error) throw error
      return data as EvidenceRequest[]
    },
    enabled: !!refCode,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Hook to fetch controls for a specific evidence request
 */
export function useControlsForEvidenceRequest(evidenceRequestId: string | null) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['controls-for-evidence-request', evidenceRequestId],
    queryFn: async () => {
      if (!evidenceRequestId) return []

      const { data, error } = await supabase
        .rpc('get_controls_for_evidence_request', { erl_uuid: evidenceRequestId })

      if (error) throw error
      return data as Array<{ id: string; ref_code: string; description: string }>
    },
    enabled: !!evidenceRequestId,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Hook to fetch evidence request statistics
 */
export function useEvidenceRequestStats() {
  const supabase = createClient()

  return useQuery({
    queryKey: ['evidence-request-stats'],
    queryFn: async () => {
      // Get total count
      const { count: totalRequests } = await supabase
        .from('evidence_requests')
        .select('*', { count: 'exact', head: true })

      // Get count by area of focus
      const { data: areaData, error: areaError } = await supabase
        .from('evidence_requests')
        .select('area_of_focus')

      if (areaError) throw areaError

      const areasCounts: Record<string, number> = {}
      areaData?.forEach(row => {
        const area = row.area_of_focus || 'Unknown'
        areasCounts[area] = (areasCounts[area] || 0) + 1
      })

      // Get total mappings
      const { count: totalMappings } = await supabase
        .from('evidence_request_control_mappings')
        .select('*', { count: 'exact', head: true })

      return {
        totalRequests: totalRequests || 0,
        totalMappings: totalMappings || 0,
        areasOfFocus: Object.keys(areasCounts).length,
        byArea: Object.entries(areasCounts)
          .map(([area, count]) => ({ area, count }))
          .sort((a, b) => b.count - a.count)
      }
    },
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Hook to fetch evidence requests grouped by area of focus
 */
export function useEvidenceRequestsByArea() {
  const supabase = createClient()

  return useQuery({
    queryKey: ['evidence-requests-by-area'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('evidence_requests')
        .select('*')
        .order('sort_order')

      if (error) throw error

      // Group by area of focus
      const byArea: Record<string, EvidenceRequest[]> = {}
      data?.forEach(er => {
        const area = er.area_of_focus || 'Unknown'
        if (!byArea[area]) byArea[area] = []
        byArea[area].push(er as EvidenceRequest)
      })

      return byArea
    },
    staleTime: 5 * 60 * 1000,
  })
}
