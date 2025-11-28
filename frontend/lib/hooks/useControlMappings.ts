import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'

// =============================================================================
// TYPES - Updated for Unified Framework Mapping Architecture
// =============================================================================

export type ExternalControl = {
  id: string
  ref_code: string
  title?: string // Display name (e.g., "Identify" for ref_code "ID")
  description: string
  metadata: any
  framework_id?: string
  parent_id?: string
  hierarchy_level?: string
  display_order?: number
}

export type Framework = {
  id: string
  code: string
  name: string
  version: string
}

// Unified mapping type for framework_crosswalks
export type FrameworkCrosswalk = {
  id: string
  source_framework_id: string
  source_ref: string
  source_control_id: string
  target_framework_id: string
  target_ref: string
  target_control_id: string
  mapping_origin: string
  mapping_strength: string
  confidence: number
  notes: string | null
  source_framework: Framework
  target_framework: Framework
  source_control: ExternalControl
  target_control: ExternalControl
}

// Legacy type alias for backwards compatibility
export type SCFControl = {
  id: string
  control_id: string
  title: string
  domain: string
  description: string
}

// Legacy mapping type - kept for backwards compatibility during transition
export type ControlMapping = {
  id: string
  scf_control_id: string
  framework_id: string
  external_control_id: string
  mapping_strength: string
  notes: string | null
  scf_control: SCFControl
  framework: Framework
  external_control: ExternalControl
  // New fields from unified model
  scfMappings?: any[]
}

// =============================================================================
// HOOKS - Updated to use Unified Tables
// =============================================================================

/**
 * Hook to fetch control mappings with optional filtering
 * NOW USES: framework_crosswalks (unified mapping table)
 */
export function useControlMappings(filters?: {
  frameworkIds?: string[]
  scfControlId?: string
  searchQuery?: string
  enabled?: boolean
}) {
  const supabase = createClient()

  const queryKey = [
    'control-mappings',
    'v3', // Version bump for unified model
    filters?.frameworkIds?.slice().sort().join(',') || 'none',
    filters?.scfControlId || 'none',
    filters?.searchQuery || 'none'
  ]

  console.log('[useControlMappings] Query key:', queryKey)

  return useQuery({
    queryKey,
    queryFn: async () => {
      console.log('[useControlMappings] Query executing with filters:', filters)

      // Get SCF framework ID for filtering
      const { data: scfFramework } = await supabase
        .from('frameworks')
        .select('id')
        .eq('code', 'SCF')
        .single()

      const scfFrameworkId = scfFramework?.id

      // Fetch all mappings with pagination
      let allData: any[] = []
      let from = 0
      const pageSize = 1000
      let hasMore = true

      while (hasMore) {
        let query = supabase
          .from('framework_crosswalks')
          .select(`
            *,
            source_framework:source_framework_id (id, code, name, version),
            target_framework:target_framework_id (id, code, name, version),
            source_control:source_control_id (id, ref_code, title, description, metadata, display_order),
            target_control:target_control_id (id, ref_code, title, description, metadata, display_order)
          `)
          .eq('source_framework_id', scfFrameworkId) // SCF as source
          .range(from, from + pageSize - 1)

        // Apply filters - filter by target framework
        if (filters?.frameworkIds && filters.frameworkIds.length > 0) {
          console.log('[useControlMappings] Filtering by framework IDs:', filters.frameworkIds)
          query = query.in('target_framework_id', filters.frameworkIds)
        }

        if (filters?.scfControlId) {
          query = query.eq('source_control_id', filters.scfControlId)
        }

        const { data, error } = await query

        if (error) throw error

        if (data && data.length > 0) {
          // Transform to legacy format for backwards compatibility
          const transformed = data.map((row: any) => ({
            id: row.id,
            scf_control_id: row.source_control_id,
            framework_id: row.target_framework_id,
            external_control_id: row.target_control_id,
            mapping_strength: row.mapping_strength,
            notes: row.notes,
            scf_control: row.source_control ? {
              id: row.source_control.id,
              control_id: row.source_control.ref_code,
              title: row.source_control.description,
              domain: row.source_control.metadata?.domain || 'Unknown',
              description: row.source_control.description
            } : null,
            framework: row.target_framework,
            external_control: row.target_control
          }))
          allData = allData.concat(transformed)
          from += pageSize
          hasMore = data.length === pageSize
        } else {
          hasMore = false
        }
      }

      console.log('[useControlMappings] Fetched mappings:', allData.length, 'records (paginated)')
      return allData as unknown as ControlMapping[]
    },
    staleTime: 0,
    gcTime: 0,
    enabled: filters?.enabled ?? true,
  })
}

/**
 * Hook to fetch mappings grouped by SCF control with hierarchy
 * NOW USES: external_controls (unified controls table) for SCF controls
 */
export function useControlMappingsBySCF(filters?: {
  frameworkIds?: string[]
  searchQuery?: string
  showAllControls?: boolean
  enabled?: boolean
}) {
  const supabase = createClient()
  const hasFrameworkFilters = filters?.frameworkIds && filters.frameworkIds.length > 0
  const shouldFetchMappings = hasFrameworkFilters
  const { data: mappings, ...rest } = useControlMappings({
    ...filters,
    enabled: (filters?.enabled ?? true) && shouldFetchMappings
  })

  // Fetch all SCF controls from external_controls (unified table)
  const { data: allControls } = useQuery({
    queryKey: ['all-scf-controls', filters?.searchQuery],
    queryFn: async () => {
      if (!filters?.showAllControls) return null

      // Get SCF framework ID
      const { data: scfFramework } = await supabase
        .from('frameworks')
        .select('id')
        .eq('code', 'SCF')
        .single()

      if (!scfFramework) return null

      let query = supabase
        .from('external_controls')
        .select('id, ref_code, title, description, metadata, parent_id, display_order')
        .eq('framework_id', scfFramework.id)
        .order('ref_code')

      if (filters?.searchQuery) {
        const search = filters.searchQuery.toLowerCase()
        query = query.or(`
          ref_code.ilike.%${search}%,
          description.ilike.%${search}%
        `)
      }

      const { data, error } = await query
      if (error) throw error

      // Transform to legacy format
      return data?.map(c => ({
        id: c.id,
        control_id: c.ref_code,
        title: c.description,
        domain: c.metadata?.domain || 'Unknown',
        description: c.description
      }))
    },
    enabled: filters?.showAllControls === true,
    staleTime: 5 * 60 * 1000,
  })

  const groupedMappings = useMemo(() => {
    console.log('[useControlMappingsBySCF] Building grouped mappings')
    console.log('[useControlMappingsBySCF] hasFrameworkFilters:', hasFrameworkFilters)
    console.log('[useControlMappingsBySCF] mappings count:', mappings?.length || 0)
    console.log('[useControlMappingsBySCF] showAllControls:', filters?.showAllControls)
    console.log('[useControlMappingsBySCF] allControls count:', allControls?.length || 0)

    const domainGroups: Record<string, any> = {}

    if (filters?.showAllControls && allControls) {
      allControls.forEach(control => {
        const domain = control.domain || 'Other'
        const controlId = control.control_id
        const isSubControl = /^[A-Z]+-\d+\.\d+/.test(controlId)

        if (!domainGroups[domain]) {
          domainGroups[domain] = {
            domain,
            controls: {}
          }
        }

        if (isSubControl) {
          const parentId = controlId.match(/^[A-Z]+-\d+/)?.[0]
          if (parentId) {
            if (!domainGroups[domain].controls[parentId]) {
              domainGroups[domain].controls[parentId] = {
                control: { control_id: parentId, title: '', domain, description: '' },
                mappings: [],
                subControls: {}
              }
            }
            domainGroups[domain].controls[parentId].subControls[controlId] = {
              control,
              mappings: []
            }
          }
        } else {
          if (!domainGroups[domain].controls[controlId]) {
            domainGroups[domain].controls[controlId] = {
              control,
              mappings: [],
              subControls: {}
            }
          }
        }
      })
    }

    if (mappings && hasFrameworkFilters) {
      console.log('[useControlMappingsBySCF] Adding', mappings.length, 'mappings to structure')
      mappings.forEach(mapping => {
        if (!mapping.scf_control) return

        const domain = mapping.scf_control.domain || 'Other'
        const controlId = mapping.scf_control.control_id
        const isSubControl = /^[A-Z]+-\d+\.\d+/.test(controlId)

        if (!domainGroups[domain]) {
          domainGroups[domain] = {
            domain,
            controls: {}
          }
        }

        if (isSubControl) {
          const parentId = controlId.match(/^[A-Z]+-\d+/)?.[0]

          if (parentId) {
            if (!domainGroups[domain].controls[parentId]) {
              domainGroups[domain].controls[parentId] = {
                control: {
                  ...mapping.scf_control,
                  control_id: parentId,
                },
                mappings: [],
                subControls: {}
              }
            }

            if (!domainGroups[domain].controls[parentId].subControls[controlId]) {
              domainGroups[domain].controls[parentId].subControls[controlId] = {
                control: mapping.scf_control,
                mappings: []
              }
            }
            domainGroups[domain].controls[parentId].subControls[controlId].mappings.push(mapping)
          } else {
            if (!domainGroups[domain].controls[controlId]) {
              domainGroups[domain].controls[controlId] = {
                control: mapping.scf_control,
                mappings: [],
                subControls: {}
              }
            }
            domainGroups[domain].controls[controlId].mappings.push(mapping)
          }
        } else {
          if (!domainGroups[domain].controls[controlId]) {
            domainGroups[domain].controls[controlId] = {
              control: mapping.scf_control,
              mappings: [],
              subControls: {}
            }
          } else if (!domainGroups[domain].controls[controlId].control.title) {
            domainGroups[domain].controls[controlId].control = mapping.scf_control
          }
          domainGroups[domain].controls[controlId].mappings.push(mapping)
        }
      })
    }

    console.log('[useControlMappingsBySCF] Final domain count:', Object.keys(domainGroups).length)
    return filters?.showAllControls || mappings ? domainGroups : undefined
  }, [mappings, allControls, filters?.showAllControls, filters?.searchQuery, hasFrameworkFilters])

  return {
    ...rest,
    data: groupedMappings || {},
    mappings
  }
}

/**
 * Hook to fetch mappings grouped by framework
 * NOW USES: framework_crosswalks (unified mapping table)
 */
export function useControlMappingsByFramework(frameworkId: string, compareToFramework?: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['control-mappings-by-framework', frameworkId, compareToFramework],
    queryFn: async () => {
      // Get SCF framework ID
      const { data: scfFramework } = await supabase
        .from('frameworks')
        .select('id')
        .eq('code', 'SCF')
        .single()

      const scfFrameworkId = scfFramework?.id

      // Get all mappings FROM SCF TO the selected framework
      const { data, error } = await supabase
        .from('framework_crosswalks')
        .select(`
          *,
          source_framework:source_framework_id (id, code, name, version),
          target_framework:target_framework_id (id, code, name, version),
          source_control:source_control_id (id, ref_code, title, description, metadata, display_order),
          target_control:target_control_id (id, ref_code, description, metadata)
        `)
        .eq('source_framework_id', scfFrameworkId)
        .eq('target_framework_id', frameworkId)
        .order('target_ref')

      if (error) throw error

      // Transform to legacy format
      const transformToLegacy = (rows: any[]) => rows.map((row: any) => ({
        id: row.id,
        scf_control_id: row.source_control_id,
        framework_id: row.target_framework_id,
        external_control_id: row.target_control_id,
        mapping_strength: row.mapping_strength,
        notes: row.notes,
        scf_control: row.source_control ? {
          id: row.source_control.id,
          control_id: row.source_control.ref_code,
          title: row.source_control.description,
          domain: row.source_control.metadata?.domain || 'Unknown',
          description: row.source_control.description
        } : null,
        framework: row.target_framework,
        external_control: row.target_control
      }))

      let compareMappings: ControlMapping[] = []
      if (compareToFramework) {
        const { data: compareData } = await supabase
          .from('framework_crosswalks')
          .select(`
            *,
            source_framework:source_framework_id (id, code, name, version),
            target_framework:target_framework_id (id, code, name, version),
            source_control:source_control_id (id, ref_code, title, description, metadata, display_order),
            target_control:target_control_id (id, ref_code, title, description, metadata, display_order)
          `)
          .eq('source_framework_id', scfFrameworkId)
          .eq('target_framework_id', compareToFramework)

        compareMappings = transformToLegacy(compareData || []) as unknown as ControlMapping[]
      }

      return {
        primary: transformToLegacy(data || []) as unknown as ControlMapping[],
        comparison: compareMappings
      }
    },
    enabled: !!frameworkId,
    staleTime: 3 * 60 * 1000,
  })
}

/**
 * Hook to fetch mappings grouped by framework control with full hierarchy
 * NOW USES: framework_crosswalks + external_controls (unified tables)
 */
export function useControlMappingsByFrameworkGrouped(
  frameworkId: string,
  compareFrameworkId?: string,
  additionalFrameworkIds?: string[],
  showAllControls: boolean = true,
  includeOrganizationalControls: boolean = false
) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['control-mappings-framework-grouped', frameworkId, compareFrameworkId, additionalFrameworkIds, showAllControls, includeOrganizationalControls],
    queryFn: async () => {
      if (!frameworkId) return null

      // Check if primary framework is SCF
      const { data: primaryFramework } = await supabase
        .from('frameworks')
        .select('id, code')
        .eq('id', frameworkId)
        .single()

      const isPrimarySCF = primaryFramework?.code === 'SCF'
      console.log('[useControlMappingsByFrameworkGrouped] Primary framework is SCF:', isPrimarySCF)

      // Get SCF framework ID for mapping queries
      let scfFrameworkId = frameworkId
      if (!isPrimarySCF) {
        const { data: scfFw } = await supabase
          .from('frameworks')
          .select('id')
          .eq('code', 'SCF')
          .single()
        scfFrameworkId = scfFw?.id || ''
      }

      // Helper function to fetch all data with pagination
      const fetchAllData = async (query: any) => {
        let allData: any[] = []
        let from = 0
        const pageSize = 1000
        let hasMore = true

        while (hasMore) {
          const { data, error } = await query.range(from, from + pageSize - 1)
          if (error) throw error

          if (data && data.length > 0) {
            allData = allData.concat(data)
            from += pageSize
            hasMore = data.length === pageSize
          } else {
            hasMore = false
          }
        }

        return allData
      }

      let primaryMappings: ControlMapping[] = []

      if (isPrimarySCF) {
        // FOR SCF PRIMARY: Load all SCF controls from external_controls (unified)
        const scfQuery = supabase
          .from('external_controls')
          .select('id, ref_code, title, description, metadata, parent_id, display_order, risk_count, threat_count')
          .eq('framework_id', frameworkId)

        const scfControls = await fetchAllData(scfQuery)
        console.log('[useControlMappingsByFrameworkGrouped] Loaded', scfControls.length, 'SCF controls from external_controls')

        // Transform to mapping-like structure
        primaryMappings = scfControls.map((control: any) => ({
          id: control.id,
          scf_control_id: control.id,
          framework_id: frameworkId,
          external_control_id: control.id,
          mapping_strength: 'exact',
          notes: null,
          scf_control: {
            id: control.id,
            control_id: control.ref_code,
            title: control.description,
            domain: control.metadata?.domain || 'Unknown',
            description: control.description
          },
          framework: { id: frameworkId, code: 'SCF', name: 'Secure Controls Framework', version: '2025.3.1' },
          external_control: {
            id: control.id,
            ref_code: control.ref_code,
            description: control.description,
            metadata: control.metadata
          }
        })) as unknown as ControlMapping[]

      } else {
        // EXTERNAL FRAMEWORK as primary: Load external_controls for this framework
        const externalControlsQuery = supabase
          .from('external_controls')
          .select('id, ref_code, title, description, metadata, parent_id, hierarchy_level, display_order, risk_count, threat_count')
          .eq('framework_id', frameworkId)
          .order('display_order', { ascending: true })

        const externalControls = await fetchAllData(externalControlsQuery)
        console.log('[useControlMappingsByFrameworkGrouped] Loaded', externalControls.length, 'external controls')

        // Get framework info
        const { data: frameworkData } = await supabase
          .from('frameworks')
          .select('id, code, name, version')
          .eq('id', frameworkId)
          .single()

        // Get mappings FROM SCF TO these external controls using framework_crosswalks
        const externalControlIds = externalControls.map((c: any) => c.id)
        let mappingsData: any[] = []

        if (externalControlIds.length > 0) {
          const mappingsQuery = supabase
            .from('framework_crosswalks')
            .select(`
              *,
              source_control:source_control_id (id, ref_code, title, description, metadata, display_order)
            `)
            .eq('source_framework_id', scfFrameworkId)
            .in('target_control_id', externalControlIds)

          mappingsData = await fetchAllData(mappingsQuery)
          console.log('[useControlMappingsByFrameworkGrouped] Found', mappingsData.length, 'mappings from SCF')
        }

        // Group mappings by target control
        const mappingsByExtControl = mappingsData.reduce((acc: any, m: any) => {
          if (!acc[m.target_control_id]) acc[m.target_control_id] = []
          // Transform to legacy scf_control format
          acc[m.target_control_id].push({
            ...m,
            scf_control: m.source_control ? {
              id: m.source_control.id,
              control_id: m.source_control.ref_code,
              title: m.source_control.description,
              domain: m.source_control.metadata?.domain || 'Unknown',
              description: m.source_control.description
            } : null
          })
          return acc
        }, {})

        // Transform external controls to mapping-like structure with SCF mappings attached
        primaryMappings = externalControls.map((control: any) => ({
          id: control.id,
          scf_control_id: null,
          framework_id: frameworkId,
          external_control_id: control.id,
          mapping_strength: 'exact',
          notes: null,
          scf_control: null,
          framework: frameworkData,
          external_control: control,
          scfMappings: mappingsByExtControl[control.id] || []
        })) as unknown as ControlMapping[]
      }

      // Get mappings for comparison framework if specified
      let comparisonMappings: ControlMapping[] = []
      if (compareFrameworkId) {
        const compareQuery = supabase
          .from('framework_crosswalks')
          .select(`
            *,
            source_control:source_control_id (id, ref_code, title, description, metadata, display_order),
            target_framework:target_framework_id (id, code, name, version),
            target_control:target_control_id (id, ref_code, description, metadata)
          `)
          .eq('source_framework_id', scfFrameworkId)
          .eq('target_framework_id', compareFrameworkId)

        const compareData = await fetchAllData(compareQuery)
        comparisonMappings = compareData.map((row: any) => ({
          id: row.id,
          scf_control_id: row.source_control_id,
          framework_id: row.target_framework_id,
          external_control_id: row.target_control_id,
          mapping_strength: row.mapping_strength,
          notes: row.notes,
          scf_control: row.source_control ? {
            id: row.source_control.id,
            control_id: row.source_control.ref_code,
            title: row.source_control.description,
            domain: row.source_control.metadata?.domain || 'Unknown',
            description: row.source_control.description
          } : null,
          framework: row.target_framework,
          external_control: row.target_control
        })) as unknown as ControlMapping[]
      }

      // Get mappings for additional frameworks
      let additionalMappings: ControlMapping[] = []
      if (additionalFrameworkIds && additionalFrameworkIds.length > 0) {
        console.log('Fetching additional frameworks:', additionalFrameworkIds)
        const additionalQuery = supabase
          .from('framework_crosswalks')
          .select(`
            *,
            source_control:source_control_id (id, ref_code, title, description, metadata, display_order),
            target_framework:target_framework_id (id, code, name, version),
            target_control:target_control_id (id, ref_code, description, metadata)
          `)
          .eq('source_framework_id', scfFrameworkId)
          .in('target_framework_id', additionalFrameworkIds)

        const additionalData = await fetchAllData(additionalQuery)
        additionalMappings = additionalData.map((row: any) => ({
          id: row.id,
          scf_control_id: row.source_control_id,
          framework_id: row.target_framework_id,
          external_control_id: row.target_control_id,
          mapping_strength: row.mapping_strength,
          notes: row.notes,
          scf_control: row.source_control ? {
            id: row.source_control.id,
            control_id: row.source_control.ref_code,
            title: row.source_control.description,
            domain: row.source_control.metadata?.domain || 'Unknown',
            description: row.source_control.description
          } : null,
          framework: row.target_framework,
          external_control: row.target_control
        })) as unknown as ControlMapping[]
        console.log('Additional mappings fetched:', additionalMappings.length)
      }

      // Build hierarchy structure
      let hierarchy = buildFrameworkHierarchy(primaryMappings, comparisonMappings, additionalMappings)

      if (!includeOrganizationalControls) {
        hierarchy = filterOrganizationalParents(hierarchy)
      }

      if (!showAllControls) {
        hierarchy = filterHierarchyByMappings(hierarchy)
      }

      console.log('Hierarchy built with:', {
        primaryMappings: primaryMappings.length,
        comparisonMappings: comparisonMappings.length,
        additionalMappings: additionalMappings.length,
        showAllControls,
        includeOrganizationalControls
      })

      return hierarchy
    },
    enabled: !!frameworkId,
    staleTime: 3 * 60 * 1000,
  })
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Filter hierarchy to remove organizational parent controls
 */
function filterOrganizationalParents(hierarchy: any): any {
  const filtered: any = {}

  for (const [key, node] of Object.entries(hierarchy)) {
    const nodeData = node as any
    const hasChildren = nodeData.children && Object.keys(nodeData.children).length > 0
    const isControl = nodeData.ref_code || nodeData.control_id

    if (isControl && hasChildren) {
      const promotedChildren = filterOrganizationalParents(nodeData.children)
      Object.assign(filtered, promotedChildren)
    } else if (hasChildren) {
      filtered[key] = {
        ...nodeData,
        children: filterOrganizationalParents(nodeData.children)
      }
    } else {
      filtered[key] = nodeData
    }
  }

  return filtered
}

/**
 * Filter hierarchy to only include nodes with mappings to ADDITIONAL frameworks
 * Note: scfMappings are internal (primary -> SCF), so we only check comparison/related
 * which represent mappings to the user-selected additional frameworks
 */
function filterHierarchyByMappings(hierarchy: any): any {
  const filtered: any = {}

  for (const [key, node] of Object.entries(hierarchy)) {
    const nodeData = node as any

    // Only check comparisonMappings and relatedMappings (mappings to additional frameworks)
    // scfMappings are always present for external controls - they just show the SCF mapping
    const hasMappingsToAdditional =
      (nodeData.comparisonMappings?.length || 0) > 0 ||
      (nodeData.relatedMappings?.length || 0) > 0

    let filteredChildren: any = {}
    if (nodeData.children && Object.keys(nodeData.children).length > 0) {
      filteredChildren = filterHierarchyByMappings(nodeData.children)
    }

    const hasChildren = Object.keys(filteredChildren).length > 0

    if (hasMappingsToAdditional || hasChildren) {
      filtered[key] = {
        ...nodeData,
        children: filteredChildren
      }
    }
  }

  return filtered
}

/**
 * Build hierarchical structure for framework controls
 */
function buildFrameworkHierarchy(
  primaryMappings: ControlMapping[],
  comparisonMappings: ControlMapping[],
  additionalMappings: ControlMapping[] = []
) {
  const hierarchy: any = {}

  // Check if this is SCF (primary mappings will have SCF controls with domain)
  const isSCF = primaryMappings.length > 0 && primaryMappings[0].scf_control?.domain !== undefined

  if (isSCF) {
    // SCF HIERARCHY: Group by Domain → Control → SubControl
    primaryMappings.forEach(mapping => {
      const domain = mapping.scf_control.domain || 'Other'
      const controlId = mapping.scf_control.control_id
      const isSubControl = /^[A-Z]+-\d+\.\d+/.test(controlId)

      if (!hierarchy[domain]) {
        hierarchy[domain] = {
          ref_code: domain,
          description: domain,
          scfMappings: [],
          comparisonMappings: [],
          relatedMappings: [],
          children: {}
        }
      }

      if (isSubControl) {
        const parentId = controlId.match(/^[A-Z]+-\d+/)?.[0]
        if (parentId) {
          if (!hierarchy[domain].children[parentId]) {
            hierarchy[domain].children[parentId] = {
              ref_code: parentId,
              description: `${parentId} (Parent Control)`,
              scfMappings: [],
              comparisonMappings: [],
              relatedMappings: [],
              children: {}
            }
          }
          hierarchy[domain].children[parentId].children[controlId] = {
            ref_code: controlId,
            description: mapping.scf_control.title,
            scfMappings: [mapping],
            comparisonMappings: [],
            relatedMappings: [],
            children: {}
          }
        }
      } else {
        if (!hierarchy[domain].children[controlId]) {
          hierarchy[domain].children[controlId] = {
            ref_code: controlId,
            description: mapping.scf_control.title,
            scfMappings: [],
            comparisonMappings: [],
            relatedMappings: [],
            children: {}
          }
        }
        hierarchy[domain].children[controlId].scfMappings.push(mapping)
      }
    })

    // Add comparison and additional mappings
    const allSecondaryMappings = [...comparisonMappings, ...additionalMappings]
    allSecondaryMappings.forEach(mapping => {
      if (!mapping.scf_control) return

      const domain = mapping.scf_control.domain || 'Other'
      const controlId = mapping.scf_control.control_id
      const isSubControl = /^[A-Z]+-\d+\.\d+/.test(controlId)

      if (!hierarchy[domain]) return

      if (isSubControl) {
        const parentId = controlId.match(/^[A-Z]+-\d+/)?.[0]
        if (parentId && hierarchy[domain].children[parentId]?.children[controlId]) {
          const targetArray = comparisonMappings.includes(mapping) ? 'comparisonMappings' : 'relatedMappings'
          hierarchy[domain].children[parentId].children[controlId][targetArray].push(mapping)
        }
      } else {
        if (hierarchy[domain].children[controlId]) {
          const targetArray = comparisonMappings.includes(mapping) ? 'comparisonMappings' : 'relatedMappings'
          hierarchy[domain].children[controlId][targetArray].push(mapping)
        }
      }
    })

    return hierarchy
  }

  // EXTERNAL FRAMEWORK HIERARCHY: Use parent_id relationships
  const buildNode = (control: any, allMappings: ControlMapping[]) => {
    const primaryMapping = allMappings.find(m => m.external_control_id === control.id)

    return {
      ref_code: control.ref_code,
      title: control.title,
      description: control.description,
      scfMappings: primaryMapping?.scfMappings || [],
      comparisonMappings: [],
      relatedMappings: [],
      children: {}
    }
  }

  const controlsByParent: Record<string, any[]> = { 'null': [] }
  primaryMappings.forEach(mapping => {
    const control = mapping.external_control
    const parentKey = control.parent_id || 'null'
    if (!controlsByParent[parentKey]) controlsByParent[parentKey] = []
    controlsByParent[parentKey].push(control)
  })

  const buildChildren = (parentId: string | null): any => {
    const children: any = {}
    const parentKey = parentId || 'null'
    const childControls = controlsByParent[parentKey] || []

    childControls.forEach(control => {
      const node = buildNode(control, primaryMappings)
      node.children = buildChildren(control.id)
      children[control.ref_code] = node
    })

    return children
  }

  const rootChildren = buildChildren(null)

  if (Object.keys(rootChildren).length === 0 && primaryMappings.length > 0) {
    return buildLegacyHierarchy(primaryMappings, comparisonMappings, additionalMappings)
  }

  // Add comparison and related mappings to the hierarchy based on SCF control matching
  // Group comparison and additional mappings by SCF control ID
  const comparisonBySCF: Record<string, ControlMapping[]> = {}
  comparisonMappings.forEach(mapping => {
    if (mapping.scf_control) {
      const scfId = mapping.scf_control.control_id
      if (!comparisonBySCF[scfId]) comparisonBySCF[scfId] = []
      comparisonBySCF[scfId].push(mapping)
    }
  })

  const additionalBySCF: Record<string, ControlMapping[]> = {}
  additionalMappings.forEach(mapping => {
    if (mapping.scf_control) {
      const scfId = mapping.scf_control.control_id
      if (!additionalBySCF[scfId]) additionalBySCF[scfId] = []
      additionalBySCF[scfId].push(mapping)
    }
  })

  // Recursively add comparison and related mappings to nodes
  function addMappingsToNodes(nodes: any) {
    Object.values(nodes).forEach((node: any) => {
      if (node.scfMappings && node.scfMappings.length > 0) {
        node.scfMappings.forEach((scfMapping: any) => {
          if (scfMapping.scf_control) {
            const scfId = scfMapping.scf_control.control_id

            // Add comparison mappings (framework selected for detailed comparison)
            if (comparisonBySCF[scfId]) {
              if (!node.comparisonMappings) node.comparisonMappings = []
              node.comparisonMappings.push(...comparisonBySCF[scfId])
            }

            // Add related mappings (other additional frameworks)
            if (additionalBySCF[scfId]) {
              if (!node.relatedMappings) node.relatedMappings = []
              node.relatedMappings.push(...additionalBySCF[scfId])
            }
          }
        })
      }

      // Recurse into children
      if (node.children && Object.keys(node.children).length > 0) {
        addMappingsToNodes(node.children)
      }
    })
  }

  addMappingsToNodes(rootChildren)

  return rootChildren
}

/**
 * Legacy hierarchy builder using ref_code pattern parsing
 */
function buildLegacyHierarchy(
  primaryMappings: ControlMapping[],
  comparisonMappings: ControlMapping[],
  additionalMappings: ControlMapping[] = []
) {
  const hierarchy: any = {}

  const nistCsfFunctions: Record<string, string> = {
    'GV': 'Govern',
    'ID': 'Identify',
    'PR': 'Protect',
    'DE': 'Detect',
    'RS': 'Respond',
    'RC': 'Recover'
  }

  const nistCsfCategories: Record<string, string> = {
    'GV.OC': 'Organizational Context',
    'GV.RM': 'Risk Management Strategy',
    'GV.RR': 'Roles, Responsibilities, and Authorities',
    'GV.PO': 'Policy',
    'GV.OV': 'Oversight',
    'GV.SC': 'Cybersecurity Supply Chain Risk Management',
    'ID.AM': 'Asset Management',
    'ID.RA': 'Risk Assessment',
    'ID.IM': 'Improvement',
    'PR.AA': 'Identity Management, Authentication and Access Control',
    'PR.AT': 'Awareness and Training',
    'PR.DS': 'Data Security',
    'PR.PS': 'Platform Security',
    'PR.IR': 'Technology Infrastructure Resilience',
    'DE.AE': 'Anomalies and Events',
    'DE.CM': 'Continuous Monitoring',
    'RS.MA': 'Incident Management',
    'RS.AN': 'Incident Analysis',
    'RS.RP': 'Incident Response Reporting and Communication',
    'RS.MI': 'Incident Mitigation',
    'RC.RP': 'Recovery Planning',
    'RC.CO': 'Recovery Communications'
  }

  primaryMappings.forEach(mapping => {
    const ref = mapping.external_control.ref_code
    let levels: string[] = []
    let labels: Record<string, string> = {}

    // NIST CSF patterns
    if (/^[A-Z]{2}$/.test(ref)) {
      levels = [ref]
      labels[ref] = nistCsfFunctions[ref] || ref
    } else if (/^[A-Z]{2}\.[A-Z]{2,}$/.test(ref)) {
      const func = ref.split('.')[0]
      levels = [func, ref]
      labels[func] = nistCsfFunctions[func] || func
      labels[ref] = nistCsfCategories[ref] || mapping.external_control.description || ref
    } else if (/^[A-Z]{2}\.[A-Z]{2,}-\d+$/.test(ref)) {
      const parts = ref.split('.')
      const func = parts[0]
      const category = `${func}.${parts[1].split('-')[0]}`
      levels = [func, category, ref]
      labels[func] = nistCsfFunctions[func] || func
      labels[category] = nistCsfCategories[category] || category
    }
    // NIST 800-53 patterns
    else if (/^[A-Z]{2,3}$/.test(ref)) {
      levels = [ref]
    } else if (/^[A-Z]{2,3}-\d+$/.test(ref)) {
      const family = ref.split('-')[0]
      levels = [family, ref]
    } else if (/^[A-Z]{2,3}-\d+\(\d+\)$/.test(ref)) {
      const match = ref.match(/^([A-Z]{2,3})-(\d+)/)
      if (match) {
        const family = match[1]
        const control = `${family}-${match[2]}`
        levels = [family, control, ref]
      }
    }
    // ISO patterns
    else if (/^A\.\d+$/.test(ref)) {
      levels = [ref]
    } else if (/^A\.\d+\.\d+$/.test(ref)) {
      const domain = `A.${ref.split('.')[1]}`
      levels = [domain, ref]
    } else if (/^A\.\d+\.\d+\.\d+$/.test(ref)) {
      const parts = ref.split('.')
      const domain = `A.${parts[1]}`
      const control = `A.${parts[1]}.${parts[2]}`
      levels = [domain, control, ref]
    }
    // Default
    else {
      levels = [ref]
    }

    let current = hierarchy
    levels.forEach((level, index) => {
      if (!current[level]) {
        current[level] = {
          ref_code: level,
          description: index === levels.length - 1
            ? mapping.external_control.description
            : (labels[level] || level),
          isLeaf: index === levels.length - 1,
          scfMappings: [],
          comparisonMappings: [],
          relatedMappings: [],
          children: {}
        }
      }

      if (index === levels.length - 1) {
        current[level].scfMappings.push(mapping)
      }

      current = current[level].children
    })
  })

  // Group secondary mappings by SCF control
  const additionalBySCF: Record<string, ControlMapping[]> = {}
  additionalMappings.forEach(mapping => {
    const scfId = mapping.scf_control.control_id
    if (!additionalBySCF[scfId]) additionalBySCF[scfId] = []
    additionalBySCF[scfId].push(mapping)
  })

  const comparisonBySCF: Record<string, ControlMapping[]> = {}
  comparisonMappings.forEach(mapping => {
    const scfId = mapping.scf_control.control_id
    if (!comparisonBySCF[scfId]) comparisonBySCF[scfId] = []
    comparisonBySCF[scfId].push(mapping)
  })

  function addComparisonAndRelatedMappings(node: any) {
    if (node.scfMappings && node.scfMappings.length > 0) {
      node.scfMappings.forEach((scfMapping: ControlMapping) => {
        const scfId = scfMapping.scf_control.control_id

        if (comparisonBySCF[scfId]) {
          node.comparisonMappings.push(...comparisonBySCF[scfId])
        }

        if (additionalBySCF[scfId]) {
          if (!node.relatedMappings) node.relatedMappings = []
          node.relatedMappings.push(...additionalBySCF[scfId])
        }
      })
    }

    Object.values(node.children || {}).forEach((child: any) => addComparisonAndRelatedMappings(child))
  }

  Object.values(hierarchy).forEach((node: any) => addComparisonAndRelatedMappings(node))

  return hierarchy
}
