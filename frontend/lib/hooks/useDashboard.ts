import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export type DashboardStats = {
  controlsCount: number
  aoCount: number
  evidenceCount: number
  organizations: Array<{
    id: string
    name: string
    created_at: string
  }>
  mcrCount: number
  domainCount: number
  pptdfStats: {
    people: number
    processes: number
    technology: number
    data: number
    facilities: number
  }
  topDomains: Array<[string, number]>
}

/**
 * Hook to fetch dashboard statistics
 */
export function useDashboardStats() {
  const supabase = createClient()

  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      // Fetch all SCF implementable controls (leaf nodes only - excluding organizational parents)
      // This filters out 248 parent controls that have sub-controls and only counts the 1,172 implementable controls
      let allControls: any[] = []
      let from = 0
      const pageSize = 1000
      let hasMore = true
      
      while (hasMore) {
        const { data, error } = await supabase
          .from('scf_controls')
          .select('id, domain, weight, is_mcr, applicability_people, applicability_processes, applicability_technology, applicability_data, applicability_facilities, parent_id, control_id')
          .range(from, from + pageSize - 1)
        
        if (error) throw error
        
        if (data && data.length > 0) {
          allControls = allControls.concat(data)
          from += pageSize
          hasMore = data.length === pageSize
        } else {
          hasMore = false
        }
      }
      
      // Filter to leaf controls only (controls without children)
      const controlIds = new Set(allControls.map(c => c.id))
      const leafControls = allControls.filter(control => {
        // A control is a leaf if no other control has it as a parent_id
        return !allControls.some(c => c.parent_id === control.id)
      })
      
      // Fetch other stats in parallel
      const [aoResult, evidenceResult, orgsResult, domainsResult] = await Promise.all([
        supabase.from('assessment_objectives').select('id', { count: 'exact', head: true }),
        supabase.from('evidence_templates').select('id', { count: 'exact', head: true }),
        supabase.from('organizations').select('*').order('created_at', { ascending: false }),
        supabase.from('scf_controls').select('domain').order('domain')
      ])

      const controlsData = leafControls
      const controlsCount = controlsData.length
      const aoCount = aoResult.count || 0
      const evidenceCount = evidenceResult.count || 0
      const organizations = orgsResult.data || []

      // Calculate PPTDF distribution
      const pptdfStats = controlsData.reduce((acc, control) => {
        if (control.applicability_people) acc.people++
        if (control.applicability_processes) acc.processes++
        if (control.applicability_technology) acc.technology++
        if (control.applicability_data) acc.data++
        if (control.applicability_facilities) acc.facilities++
        return acc
      }, { people: 0, processes: 0, technology: 0, data: 0, facilities: 0 })

      // Count MCR controls
      const mcrCount = controlsData.filter(c => c.is_mcr).length

      // Get unique domains
      const domains = [...new Set(domainsResult.data?.map(d => d.domain))]
      const domainCount = domains.length

      // Top domains by control count
      const domainCounts = controlsData.reduce((acc: Record<string, number>, c) => {
        acc[c.domain] = (acc[c.domain] || 0) + 1
        return acc
      }, {})
      const topDomains = Object.entries(domainCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5) as Array<[string, number]>

      return {
        controlsCount,
        aoCount,
        evidenceCount,
        organizations,
        mcrCount,
        domainCount,
        pptdfStats,
        topDomains
      } as DashboardStats
    },
    staleTime: 2 * 60 * 1000, // 2 minutes - dashboard updates less frequently
  })
}
