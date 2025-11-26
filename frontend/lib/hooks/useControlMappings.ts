import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'

export type SCFControl = {
  id: string
  control_id: string
  title: string
  domain: string
  description: string
}

export type ExternalControl = {
  id: string
  ref_code: string
  description: string
  metadata: any
}

export type Framework = {
  id: string
  code: string
  name: string
  version: string
}

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
}

/**
 * Hook to fetch control mappings with optional filtering
 */
export function useControlMappings(filters?: {
  frameworkIds?: string[]
  scfControlId?: string
  searchQuery?: string
  enabled?: boolean
}) {
  const supabase = createClient()
  
  // Create a stable query key
  const queryKey = [
    'control-mappings',
    'v2', // Version bump to force cache invalidation
    filters?.frameworkIds?.slice().sort().join(',') || 'none',
    filters?.scfControlId || 'none',
    filters?.searchQuery || 'none'
  ]
  
  console.log('[useControlMappings] Query key:', queryKey)

  return useQuery({
    queryKey,
    queryFn: async () => {
      console.log('[useControlMappings] Query executing with filters:', filters)
      
      // Fetch all mappings with pagination if needed
      let allData: any[] = []
      let from = 0
      const pageSize = 1000
      let hasMore = true
      
      while (hasMore) {
        let query = supabase
          .from('scf_control_mappings')
          .select(`
            *,
            scf_control:scf_control_id (
              id,
              control_id,
              title,
              domain,
              description
            ),
            framework:framework_id (
              id,
              code,
              name,
              version
            ),
            external_control:external_control_id (
              id,
              ref_code,
              description,
              metadata
            )
          `)
          .range(from, from + pageSize - 1)

        // Apply filters
        if (filters?.frameworkIds && filters.frameworkIds.length > 0) {
          console.log('[useControlMappings] Filtering by framework IDs:', filters.frameworkIds)
          query = query.in('framework_id', filters.frameworkIds)
        }

        if (filters?.scfControlId) {
          query = query.eq('scf_control_id', filters.scfControlId)
        }

        if (filters?.searchQuery) {
          const search = filters.searchQuery.toLowerCase()
          query = query.or(`
            scf_control.control_id.ilike.%${search}%,
            scf_control.title.ilike.%${search}%,
            scf_control.description.ilike.%${search}%
          `)
        }

        const { data, error } = await query

        if (error) throw error
        
        if (data && data.length > 0) {
          allData = allData.concat(data)
          from += pageSize
          hasMore = data.length === pageSize
        } else {
          hasMore = false
        }
      }

      console.log('[useControlMappings] Fetched mappings:', allData.length, 'records (paginated)')
      console.log('[useControlMappings] Framework breakdown:', 
        allData.reduce((acc: any, m: any) => {
          const code = m.framework?.code
          acc[code] = (acc[code] || 0) + 1
          return acc
        }, {})
      )
      return allData as unknown as ControlMapping[]
    },
    staleTime: 0, // Disable caching during debug
    gcTime: 0, // Don't keep in cache
    enabled: filters?.enabled ?? true,
  })
}

/**
 * Hook to fetch mappings grouped by SCF control with hierarchy
 */
export function useControlMappingsBySCF(filters?: {
  frameworkIds?: string[]
  searchQuery?: string
  showAllControls?: boolean
  enabled?: boolean
}) {
  const supabase = createClient()
  // Only fetch mappings if there are framework filters
  const hasFrameworkFilters = filters?.frameworkIds && filters.frameworkIds.length > 0
  const shouldFetchMappings = hasFrameworkFilters
  const { data: mappings, ...rest } = useControlMappings({
    ...filters,
    enabled: (filters?.enabled ?? true) && shouldFetchMappings
  })

  // Fetch all SCF controls when showAllControls is true
  const { data: allControls } = useQuery({
    queryKey: ['all-scf-controls', filters?.searchQuery],
    queryFn: async () => {
      if (!filters?.showAllControls) return null
      
      let query = supabase
        .from('scf_controls')
        .select('id, control_id, title, domain, description')
        .order('control_id')
      
      if (filters?.searchQuery) {
        const search = filters.searchQuery.toLowerCase()
        query = query.or(`
          control_id.ilike.%${search}%,
          title.ilike.%${search}%,
          description.ilike.%${search}%
        `)
      }
      
      const { data, error } = await query
      if (error) throw error
      return data
    },
    enabled: filters?.showAllControls === true,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  const groupedMappings = useMemo(() => {
    console.log('[useControlMappingsBySCF] Building grouped mappings')
    console.log('[useControlMappingsBySCF] hasFrameworkFilters:', hasFrameworkFilters)
    console.log('[useControlMappingsBySCF] mappings count:', mappings?.length || 0)
    console.log('[useControlMappingsBySCF] showAllControls:', filters?.showAllControls)
    console.log('[useControlMappingsBySCF] allControls count:', allControls?.length || 0)
    
    // Group by Domain -> Control -> SubControl hierarchy
    const domainGroups: Record<string, any> = {}
    
    if (filters?.showAllControls && allControls) {
      // Initialize with all SCF controls grouped by domain
      allControls.forEach(control => {
        const domain = control.domain || 'Other'
        const controlId = control.control_id
        const isSubControl = /^[A-Z]+-\d+\.\d+/.test(controlId)
        
        // Initialize domain if it doesn't exist
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
    
    // Now add mappings to the structure (only if we should have mappings)
    if (mappings && hasFrameworkFilters) {
      console.log('[useControlMappingsBySCF] Adding', mappings.length, 'mappings to structure')
      const frameworkCounts: Record<string, number> = {}
      mappings.forEach(mapping => {
        const fwCode = mapping.framework?.code
        frameworkCounts[fwCode] = (frameworkCounts[fwCode] || 0) + 1
        
        // Skip mappings without a valid control
        if (!mapping.scf_control) return
        
        const domain = mapping.scf_control.domain || 'Other'
        const controlId = mapping.scf_control.control_id
        const isSubControl = /^[A-Z]+-\d+\.\d+/.test(controlId)
        
        // Initialize domain if it doesn't exist
        if (!domainGroups[domain]) {
          domainGroups[domain] = {
            domain,
            controls: {}
          }
        }
        
        if (isSubControl) {
          // Extract parent control ID (e.g., "GOV-01" from "GOV-01.1")
          const parentId = controlId.match(/^[A-Z]+-\d+/)?.[0]
          
          if (parentId) {
            // Ensure parent exists in the map
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
            
            // Add sub-control under parent
            if (!domainGroups[domain].controls[parentId].subControls[controlId]) {
              domainGroups[domain].controls[parentId].subControls[controlId] = {
                control: mapping.scf_control,
                mappings: []
              }
            }
            domainGroups[domain].controls[parentId].subControls[controlId].mappings.push(mapping)
          } else {
            // Fallback: treat as regular control if pattern doesn't match
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
          // Parent control
          if (!domainGroups[domain].controls[controlId]) {
            domainGroups[domain].controls[controlId] = {
              control: mapping.scf_control,
              mappings: [],
              subControls: {}
            }
          } else if (!domainGroups[domain].controls[controlId].control.title) {
            // Update placeholder with real data
            domainGroups[domain].controls[controlId].control = mapping.scf_control
          }
          domainGroups[domain].controls[controlId].mappings.push(mapping)
        }
      })
      console.log('[useControlMappingsBySCF] Framework distribution in mappings:', frameworkCounts)
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
 */
export function useControlMappingsByFramework(frameworkId: string, compareToFramework?: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['control-mappings-by-framework', frameworkId, compareToFramework],
    queryFn: async () => {
      // Get all mappings for the selected framework
      const { data, error } = await supabase
        .from('scf_control_mappings')
        .select(`
          *,
          scf_control:scf_control_id (
            id,
            control_id,
            title,
            domain,
            description
          ),
          framework:framework_id (
            id,
            code,
            name,
            version
          ),
          external_control:external_control_id (
            id,
            ref_code,
            description,
            metadata
          )
        `)
        .eq('framework_id', frameworkId)
        .order('external_control_id')

      if (error) throw error

      // If compareToFramework is specified, get those mappings too
      let compareMappings: ControlMapping[] = []
      if (compareToFramework) {
        const { data: compareData } = await supabase
          .from('scf_control_mappings')
          .select(`
            *,
            scf_control:scf_control_id (
              id,
              control_id,
              title,
              domain,
              description
            ),
            framework:framework_id (
              id,
              code,
              name,
              version
            ),
            external_control:external_control_id (
              id,
              ref_code,
              description,
              metadata
            )
          `)
          .eq('framework_id', compareToFramework)

        compareMappings = (compareData || []) as unknown as ControlMapping[]
      }

      return {
        primary: data as unknown as ControlMapping[],
        comparison: compareMappings
      }
    },
    enabled: !!frameworkId,
    staleTime: 3 * 60 * 1000,
  })
}

/**
 * Hook to fetch mappings grouped by framework control with full hierarchy
 * Includes related mappings from other selected frameworks
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
        .select('code')
        .eq('id', frameworkId)
        .single()
      
      const isPrimarySCF = primaryFramework?.code === 'SCF'
      console.log('[useControlMappingsByFrameworkGrouped] Primary framework is SCF:', isPrimarySCF)

      // Helper function to fetch all mappings with pagination
      const fetchAllMappings = async (query: any) => {
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

      // FOR SCF PRIMARY: Load all SCF controls from scf_controls table
      // FOR OTHER: Load external controls and their mappings to/from SCF
      let primaryMappings: ControlMapping[] = []
      
      if (isPrimarySCF) {
        // Get all SCF controls - always load ALL controls to maintain hierarchy
        const scfQuery = supabase
          .from('scf_controls')
          .select('id, control_id, title, domain, description, parent_id')
        
        const scfControls = await fetchAllMappings(scfQuery)
        console.log('[useControlMappingsByFrameworkGrouped] Loaded', scfControls.length, 'SCF controls')
        
        // Transform SCF controls into mapping-like structure for hierarchy builder
        // The hierarchy builder expects ControlMapping objects
        primaryMappings = scfControls.map((control: any) => ({
          id: control.id,
          scf_control_id: control.id,
          framework_id: frameworkId,
          external_control_id: control.id, // Self-reference
          mapping_strength: 'exact',
          notes: null,
          scf_control: control,
          framework: { id: frameworkId, code: 'SCF', name: 'Secure Controls Framework', version: '2025.3.1' },
          external_control: {
            id: control.id,
            ref_code: control.control_id,
            description: control.description,
            metadata: {}
          }
        })) as unknown as ControlMapping[]
        
        console.log('[useControlMappingsByFrameworkGrouped] Loaded', primaryMappings.length, 'SCF controls')
      } else {
        // EXTERNAL FRAMEWORK as primary: Load external_controls for this framework
        // Then get their mappings to SCF
        const externalControlsQuery = supabase
          .from('external_controls')
          .select('id, ref_code, description, metadata, parent_id, hierarchy_level, display_order')
          .eq('framework_id', frameworkId)
          .order('display_order', { ascending: true })
        
        const externalControls = await fetchAllMappings(externalControlsQuery)
        console.log('[useControlMappingsByFrameworkGrouped] Loaded', externalControls.length, 'external controls')
        
        // Get framework info
        const { data: frameworkData } = await supabase
          .from('frameworks')
          .select('id, code, name, version')
          .eq('id', frameworkId)
          .single()
        
        // Transform external controls into mapping-like structure
        primaryMappings = externalControls.map((control: any) => ({
          id: control.id,
          scf_control_id: null, // No SCF control for now
          framework_id: frameworkId,
          external_control_id: control.id,
          mapping_strength: 'exact',
          notes: null,
          scf_control: null, // Will be populated if there are mappings
          framework: frameworkData,
          external_control: control
        })) as unknown as ControlMapping[]
        
        // Get mappings FROM SCF TO these external controls
        const externalControlIds = externalControls.map((c: any) => c.id)
        if (externalControlIds.length > 0) {
          const mappingsQuery = supabase
            .from('scf_control_mappings')
            .select(`
              *,
              scf_control:scf_control_id (
                id,
                control_id,
                title,
                domain,
                description
              )
            `)
            .in('external_control_id', externalControlIds)
          
          const mappingsData = await fetchAllMappings(mappingsQuery)
          console.log('[useControlMappingsByFrameworkGrouped] Found', mappingsData.length, 'mappings to SCF')
          
          // Attach SCF mappings to external controls
          const mappingsByExtControl = mappingsData.reduce((acc: any, m: any) => {
            if (!acc[m.external_control_id]) acc[m.external_control_id] = []
            acc[m.external_control_id].push(m)
            return acc
          }, {})
          
          primaryMappings.forEach((pm: any) => {
            const mappings = mappingsByExtControl[pm.external_control_id] || []
            pm.scfMappings = mappings
          })
        }
      }

      // Get mappings for comparison framework if specified
      let comparisonMappings: ControlMapping[] = []
      if (compareFrameworkId) {
        const compareQuery = supabase
          .from('scf_control_mappings')
          .select(`
            *,
            scf_control:scf_control_id (
              id,
              control_id,
              title,
              domain,
              description
            ),
            framework:framework_id (
              id,
              code,
              name,
              version
            ),
            external_control:external_control_id (
              id,
              ref_code,
              description,
              metadata
            )
          `)
          .eq('framework_id', compareFrameworkId)

        const compareData = await fetchAllMappings(compareQuery)
        comparisonMappings = compareData as unknown as ControlMapping[]
      }

      // Get mappings for additional frameworks from filter panel
      let additionalMappings: ControlMapping[] = []
      if (additionalFrameworkIds && additionalFrameworkIds.length > 0) {
        console.log('Fetching additional frameworks:', additionalFrameworkIds)
        const additionalQuery = supabase
          .from('scf_control_mappings')
          .select(`
            *,
            scf_control:scf_control_id (
              id,
              control_id,
              title,
              domain,
              description
            ),
            framework:framework_id (
              id,
              code,
              name,
              version
            ),
            external_control:external_control_id (
              id,
              ref_code,
              description,
              metadata
            )
          `)
          .in('framework_id', additionalFrameworkIds)

        const additionalData = await fetchAllMappings(additionalQuery)
        additionalMappings = additionalData as unknown as ControlMapping[]
        console.log('Additional mappings fetched:', additionalMappings.length)
      }

      // Build hierarchy structure based on framework type
      let hierarchy = buildFrameworkHierarchy(primaryMappings, comparisonMappings, additionalMappings)
      
      // Filter out organizational parents if includeOrganizationalControls is false
      // This must happen BEFORE filtering by mappings to maintain hierarchy structure
      if (!includeOrganizationalControls) {
        hierarchy = filterOrganizationalParents(hierarchy)
      }
      
      // Filter out controls without mappings if showAllControls is false
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

/**
 * Filter hierarchy to remove organizational parent controls (controls with children)
 * When a parent is removed, promote its children to the parent's level
 */
function filterOrganizationalParents(hierarchy: any): any {
  const filtered: any = {}
  
  for (const [key, node] of Object.entries(hierarchy)) {
    const nodeData = node as any
    const hasChildren = nodeData.children && Object.keys(nodeData.children).length > 0
    const isControl = nodeData.ref_code || nodeData.control_id
    
    if (isControl && hasChildren) {
      // This is an organizational parent - skip it and promote its children
      const promotedChildren = filterOrganizationalParents(nodeData.children)
      Object.assign(filtered, promotedChildren)
    } else if (hasChildren) {
      // This is a domain/group - keep it and recursively filter children
      filtered[key] = {
        ...nodeData,
        children: filterOrganizationalParents(nodeData.children)
      }
    } else {
      // This is a leaf control - keep it
      filtered[key] = nodeData
    }
  }
  
  return filtered
}

/**
 * Filter hierarchy to only include nodes with mappings (recursively)
 */
function filterHierarchyByMappings(hierarchy: any): any {
  const filtered: any = {}
  
  for (const [key, node] of Object.entries(hierarchy)) {
    const nodeData = node as any
    
    // Check if this node or any of its children have mappings
    const hasMappings = 
      (nodeData.comparisonMappings?.length || 0) > 0 ||
      (nodeData.relatedMappings?.length || 0) > 0
    
    // Recursively filter children
    let filteredChildren: any = {}
    if (nodeData.children && Object.keys(nodeData.children).length > 0) {
      filteredChildren = filterHierarchyByMappings(nodeData.children)
    }
    
    const hasChildren = Object.keys(filteredChildren).length > 0
    
    // Include this node if it has mappings OR has children with mappings
    if (hasMappings || hasChildren) {
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

  // Check if this is SCF (primary mappings will have SCF controls)
  const isSCF = primaryMappings.length > 0 && primaryMappings[0].scf_control?.domain !== undefined

  if (isSCF) {
    // SCF HIERARCHY: Group by Domain → Control → SubControl
    primaryMappings.forEach(mapping => {
      const domain = mapping.scf_control.domain || 'Other'
      const controlId = mapping.scf_control.control_id
      const isSubControl = /^[A-Z]+-\d+\.\d+/.test(controlId)
      
      // Initialize domain if needed
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
        // Sub-control: find parent
        const parentId = controlId.match(/^[A-Z]+-\d+/)?.[0]
        if (parentId) {
          // Ensure parent exists
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
          // Add sub-control
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
        // Parent control
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
    
    // Add comparison and additional mappings to the hierarchy
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

  // EXTERNAL FRAMEWORK HIERARCHY: Use parent_id relationships from external_controls
  // Build tree structure based on parent-child relationships
  const buildNode = (control: any, allMappings: ControlMapping[]) => {
    // Find the primary mapping for this control
    const primaryMapping = allMappings.find(m => m.external_control_id === control.id)
    
    return {
      ref_code: control.ref_code,
      description: control.description,
      scfMappings: primaryMapping?.scfMappings || [],
      comparisonMappings: [],
      relatedMappings: [],
      children: {}
    }
  }
  
  // Group controls by parent_id
  const controlsByParent: Record<string, any[]> = { 'null': [] }
  primaryMappings.forEach(mapping => {
    const control = mapping.external_control
    const parentKey = control.parent_id || 'null'
    if (!controlsByParent[parentKey]) controlsByParent[parentKey] = []
    controlsByParent[parentKey].push(control)
  })
  
  // Build hierarchy recursively
  const buildChildren = (parentId: string | null): any => {
    const children: any = {}
    const parentKey = parentId || 'null'
    const childControls = controlsByParent[parentKey] || []
    
    childControls.forEach(control => {
      const node = buildNode(control, primaryMappings)
      // Recursively build children
      node.children = buildChildren(control.id)
      children[control.ref_code] = node
    })
    
    return children
  }
  
  // Start from root (null parent_id)
  const rootChildren = buildChildren(null)
  
  // If there are no root children, it means all controls have parents - build from top-level controls
  if (Object.keys(rootChildren).length === 0 && primaryMappings.length > 0) {
    // Fall back to parsing hierarchy from ref_code patterns (for frameworks without parent_id set)
    return buildLegacyHierarchy(primaryMappings, comparisonMappings, additionalMappings)
  }
  
  return rootChildren
}

/**
 * Legacy hierarchy builder using ref_code pattern parsing
 * Used for frameworks that don't have parent_id relationships set yet
 */
function buildLegacyHierarchy(
  primaryMappings: ControlMapping[],
  comparisonMappings: ControlMapping[],
  additionalMappings: ControlMapping[] = []
) {
  const hierarchy: any = {}
  
  // Labels for NIST CSF Functions
  const nistCsfFunctions: Record<string, string> = {
    'GV': 'Govern',
    'ID': 'Identify',
    'PR': 'Protect',
    'DE': 'Detect',
    'RS': 'Respond',
    'RC': 'Recover'
  }

  // Labels for NIST CSF Categories (common ones)
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

  // Process primary framework mappings
  primaryMappings.forEach(mapping => {
    const ref = mapping.external_control.ref_code
    const metadata = mapping.external_control.metadata as any

    // Determine hierarchy levels based on ref_code patterns
    let levels: string[] = []
    let labels: Record<string, string> = {}

    // NIST CSF: GV, GV.OC, GV.OC-01
    if (/^[A-Z]{2}$/.test(ref)) {
      // Function level (GV, ID, PR, DE, RS, RC)
      levels = [ref]
      labels[ref] = nistCsfFunctions[ref] || ref
    } else if (/^[A-Z]{2}\.[A-Z]{2,}$/.test(ref)) {
      // Category level (GV.OC, PR.AA)
      const func = ref.split('.')[0]
      levels = [func, ref]
      labels[func] = nistCsfFunctions[func] || func
      labels[ref] = nistCsfCategories[ref] || mapping.external_control.description || ref
    } else if (/^[A-Z]{2}\.[A-Z]{2,}-\d+$/.test(ref)) {
      // Control level (GV.OC-01, PR.AA-02)
      const parts = ref.split('.')
      const func = parts[0]
      const category = `${func}.${parts[1].split('-')[0]}`
      levels = [func, category, ref]
      labels[func] = nistCsfFunctions[func] || func
      labels[category] = nistCsfCategories[category] || category
    }
    // NIST 800-53: AC, AC-1, AC-1(1)
    else if (/^[A-Z]{2,3}$/.test(ref)) {
      // Family level (AC, SI, CM)
      levels = [ref]
    } else if (/^[A-Z]{2,3}-\d+$/.test(ref)) {
      // Control level (AC-1, SI-2)
      const family = ref.split('-')[0]
      levels = [family, ref]
    } else if (/^[A-Z]{2,3}-\d+\(\d+\)$/.test(ref)) {
      // Enhancement level (AC-1(1))
      const match = ref.match(/^([A-Z]{2,3})-(\d+)/)
      if (match) {
        const family = match[1]
        const control = `${family}-${match[2]}`
        levels = [family, control, ref]
      }
    }
    // ISO 27001/27002: A.5, A.5.1, A.5.1.1
    else if (/^A\.\d+$/.test(ref)) {
      // Domain level (A.5, A.8)
      levels = [ref]
    } else if (/^A\.\d+\.\d+$/.test(ref)) {
      // Control level (A.5.1, A.8.2)
      const domain = `A.${ref.split('.')[1]}`
      levels = [domain, ref]
    } else if (/^A\.\d+\.\d+\.\d+$/.test(ref)) {
      // Sub-control level
      const parts = ref.split('.')
      const domain = `A.${parts[1]}`
      const control = `A.${parts[1]}.${parts[2]}`
      levels = [domain, control, ref]
    }
    // PCI DSS: 1, 1.1, 1.1.1
    else if (/^\d+$/.test(ref)) {
      // Requirement level (1, 2, 12)
      levels = [ref]
    } else if (/^\d+\.\d+$/.test(ref)) {
      // Sub-requirement level (1.1, 12.3)
      const requirement = ref.split('.')[0]
      levels = [requirement, ref]
    } else if (/^\d+\.\d+\.\d+$/.test(ref)) {
      // Sub-sub-requirement level (1.1.1)
      const parts = ref.split('.')
      const requirement = parts[0]
      const subReq = `${parts[0]}.${parts[1]}`
      levels = [requirement, subReq, ref]
    }
    // CIS Controls: 1, 1.1, etc.
    else if (/^\d+\.\d+$/.test(ref) && !ref.includes('.', ref.indexOf('.') + 1)) {
      // CIS format: Control.Safeguard
      const control = ref.split('.')[0]
      levels = [control, ref]
    }
    // Default: single level
    else {
      levels = [ref]
    }

    // Build nested structure
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
        // Leaf node - add SCF mapping
        current[level].scfMappings.push(mapping)
      }
      
      current = current[level].children
    })
  })

  // Group additional framework mappings by SCF control for related controls lookup
  const additionalBySCF: Record<string, ControlMapping[]> = {}
  additionalMappings.forEach(mapping => {
    const scfId = mapping.scf_control.control_id
    if (!additionalBySCF[scfId]) {
      additionalBySCF[scfId] = []
    }
    additionalBySCF[scfId].push(mapping)
  })

  // Group comparison mappings by SCF control
  const comparisonBySCF: Record<string, ControlMapping[]> = {}
  comparisonMappings.forEach(mapping => {
    const scfId = mapping.scf_control.control_id
    if (!comparisonBySCF[scfId]) {
      comparisonBySCF[scfId] = []
    }
    comparisonBySCF[scfId].push(mapping)
  })

  // Walk the primary hierarchy and add comparison and related mappings
  function addComparisonAndRelatedMappings(node: any) {
    if (node.scfMappings && node.scfMappings.length > 0) {
      // For each SCF mapping, add the corresponding comparison and related mappings
      node.scfMappings.forEach((scfMapping: ControlMapping) => {
        const scfId = scfMapping.scf_control.control_id
        
        // Add comparison mappings if they exist
        if (comparisonBySCF[scfId]) {
          node.comparisonMappings.push(...comparisonBySCF[scfId])
        }
        
        // Add related framework mappings from filter panel
        if (additionalBySCF[scfId]) {
          if (!node.relatedMappings) {
            node.relatedMappings = []
          }
          node.relatedMappings.push(...additionalBySCF[scfId])
        }
      })
    }

    // Recurse to children
    Object.values(node.children || {}).forEach((child: any) => addComparisonAndRelatedMappings(child))
  }

  Object.values(hierarchy).forEach((node: any) => addComparisonAndRelatedMappings(node))
  
  console.log('additionalBySCF keys:', Object.keys(additionalBySCF).length)
  console.log('comparisonBySCF keys:', Object.keys(comparisonBySCF).length)
  if (Object.keys(additionalBySCF).length > 0) {
    console.log('Sample additionalBySCF:', Object.keys(additionalBySCF).slice(0, 5))
  }

  return hierarchy
}

