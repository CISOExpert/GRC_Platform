'use client'

import { useState, useMemo, useEffect } from 'react'
import { useFrameworks } from '@/lib/hooks/useFrameworks'
import { useControlMappingsBySCF, useControlMappingsByFrameworkGrouped } from '@/lib/hooks/useControlMappings'
import { SaveViewModal } from './components/SaveViewModal'
import { LoadViewModal } from './components/LoadViewModal'
import { MappingOverview } from './MappingOverview'
import type { SavedView } from '@/lib/hooks/useSavedViews'

export default function FrameworkMappingsPage() {
  // View configuration state - UNIFIED MODEL
  const [primaryFramework, setPrimaryFramework] = useState<string>('') // Can be SCF or any framework
  const [additionalFrameworks, setAdditionalFrameworks] = useState<Set<string>>(new Set())
  const [compareToFramework, setCompareToFramework] = useState<string>('') // Only used when displayMode=expanded AND 2+ additional
  const [displayMode, setDisplayMode] = useState<'compact' | 'expanded'>('compact') // compact=inline tags, expanded=nested controls
  const [searchQuery, setSearchQuery] = useState('')
  const [frameworkSearchQuery, setFrameworkSearchQuery] = useState('')
  const [showFilterPanel, setShowFilterPanel] = useState(true)
  const [filterPanelWidth, setFilterPanelWidth] = useState(320)
  const [showDebugInfo, setShowDebugInfo] = useState(false)
  const [showAllPrimaryControls, setShowAllPrimaryControls] = useState(true) // Show all controls even without mappings
  const [includeOrganizationalControls, setIncludeOrganizationalControls] = useState(true) // Include parent controls with children (default: true for better hierarchy)
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false) // Toggle for advanced filters section
  
  // UI state
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [showLoadModal, setShowLoadModal] = useState(false)

  // Fetch data with React Query
  const { data: frameworks = [], isLoading: frameworksLoading } = useFrameworks()
  
  // Determine if primary is SCF (special handling for SCF's domain-based structure)
  const scfFramework = frameworks.find(f => f.code === 'SCF')
  const isPrimarySCF = primaryFramework === scfFramework?.id
  
  // Build framework IDs for additional frameworks (used when displayMode=expanded and 2+)
  const additionalFrameworkIds = Array.from(additionalFrameworks)
  const shouldShowCompareToSelector = displayMode === 'expanded' && additionalFrameworkIds.length >= 2

  // Check if SCF is explicitly selected in additional frameworks (to control when SCF mappings are shown)
  const isSCFInAdditional = scfFramework && additionalFrameworkIds.includes(scfFramework.id)
  
  // Auto-set compareToFramework to first additional if not already set
  const effectiveCompareToFramework = shouldShowCompareToSelector 
    ? (compareToFramework || additionalFrameworkIds[0])
    : undefined
  
  // Unified data fetching - uses same hook structure regardless of primary framework
  const { data: groupedMappings, isLoading: mappingsLoading, error: mappingsError } = useControlMappingsByFrameworkGrouped(
    primaryFramework,
    effectiveCompareToFramework,
    additionalFrameworkIds.length > 0 ? additionalFrameworkIds : undefined,
    showAllPrimaryControls,
    includeOrganizationalControls
  )

  const loading = frameworksLoading || mappingsLoading

  // Filter and sort frameworks for the filter panel
  const filteredAndSortedFrameworks = useMemo(() => {
    if (!frameworks) return []
    
    // Exclude primary framework from additional frameworks list
    const availableForAdditional = frameworks.filter(f => f.id !== primaryFramework)
    
    // Filter by search query
    const filtered = frameworkSearchQuery.trim() === ''
      ? availableForAdditional
      : availableForAdditional.filter(f => 
          f.name.toLowerCase().includes(frameworkSearchQuery.toLowerCase()) ||
          f.code.toLowerCase().includes(frameworkSearchQuery.toLowerCase()) ||
          f.version?.toLowerCase().includes(frameworkSearchQuery.toLowerCase())
        )
    
    // Sort: selected frameworks first, then unselected, both alphabetically
    const selected = filtered.filter(f => additionalFrameworks.has(f.id)).sort((a, b) => a.name.localeCompare(b.name))
    const unselected = filtered.filter(f => !additionalFrameworks.has(f.id)).sort((a, b) => a.name.localeCompare(b.name))
    
    return [...selected, ...unselected]
  }, [frameworks, frameworkSearchQuery, additionalFrameworks, primaryFramework])

  // Debug logging
  console.log('=== Framework Mappings Debug ===')
  console.log('Total frameworks loaded:', frameworks.length)
  console.log('All frameworks:', frameworks.map(f => `${f.code}: ${f.name} (ID: ${f.id.substring(0, 8)}...)`))
  console.log('SCF Framework:', frameworks.find(f => f.code === 'SCF'))
  console.log('Primary Framework:', primaryFramework, frameworks.find(f => f.id === primaryFramework)?.name)
  console.log('Display Mode:', displayMode)
  console.log('Additional Frameworks:', additionalFrameworkIds.map(id => frameworks.find(f => f.id === id)?.name))
  console.log('Compare To Framework:', effectiveCompareToFramework, frameworks.find(f => f.id === effectiveCompareToFramework)?.name)
  console.log('Should Show Compare To Selector:', shouldShowCompareToSelector)
  console.log('Is Primary SCF:', isPrimarySCF)
  console.log('Grouped mappings keys:', groupedMappings ? Object.keys(groupedMappings).length : 'undefined')
  if (groupedMappings && Object.keys(groupedMappings).length > 0) {
    const firstKey = Object.keys(groupedMappings)[0]
    const firstNode = groupedMappings[firstKey]
    console.log('Sample node:', firstKey, {
      scfMappings: firstNode.scfMappings?.length || 0,
      comparisonMappings: firstNode.comparisonMappings?.length || 0,
      relatedMappings: firstNode.relatedMappings?.length || 0,
      children: Object.keys(firstNode.children || {}).length
    })
  }
  console.log('Mappings error:', mappingsError)

  // Initialize default frameworks on first load
  useEffect(() => {
    if (frameworks.length > 0 && !primaryFramework) {
      // Default primary to SCF
      const scfFw = frameworks.find(f => f.code === 'SCF')
      if (scfFw) setPrimaryFramework(scfFw.id)

      // Set default additional framework - NIST CSF has best mappings
      const nistCsf = frameworks.find(f => f.code === 'NIST-CSF' && f.version === '2.0')
      if (nistCsf) {
        setAdditionalFrameworks(new Set([nistCsf.id]))
      }
    }
  }, [frameworks, primaryFramework])

  // Handle primary framework change - also remove from additional if it was selected there
  const handlePrimaryFrameworkChange = (newPrimaryId: string) => {
    setPrimaryFramework(newPrimaryId)

    // Remove the new primary from additional frameworks if it was selected
    if (additionalFrameworks.has(newPrimaryId)) {
      setAdditionalFrameworks(prev => {
        const newSet = new Set(prev)
        newSet.delete(newPrimaryId)
        return newSet
      })

      // Also clear compareToFramework if it was the same
      if (compareToFramework === newPrimaryId) {
        setCompareToFramework('')
      }
    }
  }

  const toggleFramework = (frameworkId: string) => {
    setAdditionalFrameworks(prev => {
      const newSet = new Set(prev)
      if (newSet.has(frameworkId)) {
        newSet.delete(frameworkId)
        // If we're removing the compareToFramework, clear it
        if (frameworkId === compareToFramework) {
          setCompareToFramework('')
        }
      } else {
        newSet.add(frameworkId)
      }
      return newSet
    })
  }

  const clearFilters = () => {
    setAdditionalFrameworks(new Set())
    setCompareToFramework('')
    setSearchQuery('')
  }

  const toggleExpand = (itemId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(itemId)) {
        newSet.delete(itemId)
      } else {
        newSet.add(itemId)
      }
      return newSet
    })
  }

  // Recursive component to render framework hierarchy
  const renderFrameworkNode = (nodeKey: string, node: any, depth = 0) => {
    const isExpanded = expandedItems.has(nodeKey)
    const hasChildren = node.children && Object.keys(node.children).length > 0
    // Only show scfMappings when SCF is explicitly selected in additional frameworks (not just because primary isn't SCF)
    const hasSCFMappings = !isPrimarySCF && isSCFInAdditional && node.scfMappings && node.scfMappings.length > 0
    const hasComparisonMappings = node.comparisonMappings && node.comparisonMappings.length > 0
    const hasRelatedMappings = node.relatedMappings && node.relatedMappings.length > 0
    const totalSCFMappings = !isPrimarySCF && isSCFInAdditional ? (node.scfMappings?.length || 0) : 0
    const totalRelatedMappings = node.relatedMappings?.length || 0
    
    // Calculate mapping statistics for display
    const mappingStats = {
      totalMappings: (node.comparisonMappings?.length || 0) + (node.relatedMappings?.length || 0),
      uniqueFrameworks: new Set([
        ...(node.comparisonMappings?.map((m: any) => m.framework.id) || []),
        ...(node.relatedMappings?.map((m: any) => m.framework.id) || [])
      ]).size
    }
    const hasMappingsAtThisLevel = mappingStats.totalMappings > 0
    
    // For grouping: check if we should show grouped SCF mappings vs individual
    const scfMappingsExpandKey = `${nodeKey}-scf-mappings`
    const scfMappingsExpanded = expandedItems.has(scfMappingsExpandKey)
    const otherMappingsExpandKey = `${nodeKey}-other-mappings`
    const otherMappingsExpanded = expandedItems.has(otherMappingsExpandKey)
    
    // Group comparison AND related mappings by SCF control
    const comparisonBySCF: Record<string, any[]> = {}
    if (node.comparisonMappings) {
      node.comparisonMappings.forEach((compMapping: any) => {
        const scfId = compMapping.scf_control.control_id
        if (!comparisonBySCF[scfId]) {
          comparisonBySCF[scfId] = []
        }
        comparisonBySCF[scfId].push(compMapping)
      })
    }
    
    const relatedBySCF: Record<string, any[]> = {}
    if (node.relatedMappings) {
      node.relatedMappings.forEach((relMapping: any) => {
        const scfId = relMapping.scf_control.control_id
        if (!relatedBySCF[scfId]) {
          relatedBySCF[scfId] = []
        }
        relatedBySCF[scfId].push(relMapping)
      })
    }
    
    // Count total SCF mappings including children (only when SCF is explicitly selected in additional frameworks)
    const countTotalMappings = (n: any): number => {
      let count = !isPrimarySCF && isSCFInAdditional ? (n.scfMappings?.length || 0) : 0
      if (n.children) {
        Object.values(n.children).forEach((child: any) => {
          count += countTotalMappings(child)
        })
      }
      return count
    }
    
    // Count aggregate mapping statistics including children
    const countAggregateMappingStats = (n: any): { totalMappings: number, uniqueFrameworks: Set<string> } => {
      const frameworks = new Set<string>()
      let total = 0
      
      // Count at this level
      if (n.comparisonMappings) {
        total += n.comparisonMappings.length
        n.comparisonMappings.forEach((m: any) => frameworks.add(m.framework.id))
      }
      if (n.relatedMappings) {
        total += n.relatedMappings.length
        n.relatedMappings.forEach((m: any) => frameworks.add(m.framework.id))
      }
      
      // Count in children
      if (n.children) {
        Object.values(n.children).forEach((child: any) => {
          const childStats = countAggregateMappingStats(child)
          total += childStats.totalMappings
          childStats.uniqueFrameworks.forEach(fw => frameworks.add(fw))
        })
      }
      
      return { totalMappings: total, uniqueFrameworks: frameworks }
    }
    
    const totalMappings = countTotalMappings(node)
    const aggregateStats = countAggregateMappingStats(node)
    const hasAnyMappings = aggregateStats.totalMappings > 0
    
    // Determine if we should show the chevron (only if expandable content exists)
    const isExpandable = hasChildren || hasSCFMappings || hasMappingsAtThisLevel
    
    // Determine colors based on depth for visual hierarchy
    const colors = [
      { ref: 'text-purple-700 dark:text-purple-300', bg: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-purple-300 dark:border-purple-700' },
      { ref: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-100/50 dark:bg-purple-900/10', border: 'border-purple-200 dark:border-purple-800' },
      { ref: 'text-purple-600 dark:text-purple-400', bg: 'bg-white dark:bg-gray-800', border: 'border-gray-200 dark:border-gray-700' },
    ]
    const colorScheme = colors[Math.min(depth, colors.length - 1)]
    
    return (
      <div key={nodeKey} className={depth > 0 ? 'ml-6 mt-3' : 'mb-4'}>
        <div className={`rounded-lg border ${colorScheme.border} overflow-hidden ${colorScheme.bg}`}>
          <button
            onClick={() => toggleExpand(nodeKey)}
            className="w-full px-4 py-3 flex items-center justify-between hover:opacity-80 transition-opacity"
          >
            <div className="flex items-center gap-3 flex-1 text-left">
              {/* Always reserve space for chevron, but only show if expandable */}
              <div className="w-4 flex-shrink-0">
                {isExpandable && (
                  isExpanded ? (
                    <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  )
                )}
              </div>
              <div className="flex-1">
                <div className={`font-mono text-sm font-semibold ${colorScheme.ref}`}>
                  {node.title || node.ref_code}
                  {hasChildren && <span className="ml-2 text-xs text-gray-500 font-normal">({Object.keys(node.children).length} items)</span>}
                </div>
                {node.description && node.description !== node.ref_code && node.description !== node.title && (
                  <div className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                    {node.description}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Visual indicator for mappings - show aggregate stats for groups/domains */}
              {hasAnyMappings && (
                <div className="flex items-center gap-2 px-3 py-1 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-md">
                  <svg className="h-4 w-4 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
                    {aggregateStats.uniqueFrameworks.size} framework{aggregateStats.uniqueFrameworks.size !== 1 ? 's' : ''} → {aggregateStats.totalMappings} control{aggregateStats.totalMappings !== 1 ? 's' : ''}
                  </span>
                </div>
              )}
            </div>
          </button>
          
          {isExpanded && (
            <div className="border-t border-gray-200 dark:border-gray-700">
              {/* Show SCF mappings at this level if they exist AND primary is NOT SCF (for controls mapped to parent levels like GV or GV.RM) */}
              {hasSCFMappings && (
                <div className="px-4 py-3 space-y-2">
                  {/* Collapsed group for direct mappings */}
                  <div className="bg-purple-50 dark:bg-purple-900/10 rounded-lg border border-purple-200 dark:border-purple-800">
                    <button
                      onClick={() => toggleExpand(`${nodeKey}-direct-mappings`)}
                      className="w-full px-3 py-2 flex items-center justify-between text-left hover:bg-purple-100 dark:hover:bg-purple-900/20 transition-colors rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        {expandedItems.has(`${nodeKey}-direct-mappings`) ? (
                          <svg className="h-4 w-4 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        ) : (
                          <svg className="h-4 w-4 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        )}
                        <span className="text-sm font-semibold text-purple-700 dark:text-purple-300">
                          SCF Mappings ({node.scfMappings.length})
                        </span>
                      </div>
                    </button>
                    
                    {expandedItems.has(`${nodeKey}-direct-mappings`) && (
                      <div className="px-3 pb-3 pt-1 space-y-2">
                        {node.scfMappings.map((mapping: any) => {
                          const scfId = mapping.scf_control.control_id
                          
                          // Find comparison framework controls that map to this SCF control
                          const comparisonForThisSCF = node.comparisonMappings?.filter((comp: any) => 
                            comp.scf_control?.control_id === scfId
                          ) || []
                          
                          // Find additional framework controls that map to this SCF control
                          const additionalForThisSCF = node.relatedMappings?.filter((rel: any) => 
                            rel.scf_control?.control_id === scfId
                          ) || []
                          
                          return (
                            <div 
                              key={mapping.id}
                              className="bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700"
                            >
                              <div className="p-3">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="font-mono text-sm font-medium text-purple-600 dark:text-purple-400">
                                      SCF {mapping.scf_control.control_id}
                                    </div>
                                    {mapping.scf_control.title && (
                                      <div className="text-sm text-gray-900 dark:text-gray-100 mt-1">
                                        {mapping.scf_control.title}
                                      </div>
                                    )}
                                  </div>
                                  <span className={`ml-2 px-2 py-0.5 text-xs font-medium rounded flex-shrink-0 ${
                                    mapping.mapping_strength === 'exact'
                                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                                      : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                                  }`}>
                                    {mapping.mapping_strength}
                                  </span>
                                </div>
                                
                                {/* Show mapped framework controls as tags below */}
                                {(comparisonForThisSCF.length > 0 || additionalForThisSCF.length > 0) && (
                                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                                    <div className="flex flex-wrap gap-2">
                                      {/* Comparison framework tags (blue) */}
                                      {comparisonForThisSCF.map((comp: any) => (
                                        <div 
                                          key={comp.id}
                                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md"
                                        >
                                          <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                                            {comp.framework.name}
                                          </span>
                                          <span className="text-xs text-blue-600 dark:text-blue-400">
                                            {comp.external_control.ref_code}
                                          </span>
                                        </div>
                                      ))}
                                      
                                      {/* Additional framework tags (orange) */}
                                      {additionalForThisSCF.map((rel: any) => (
                                        <div 
                                          key={rel.id}
                                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-md"
                                        >
                                          <span className="text-xs font-semibold text-orange-700 dark:text-orange-300">
                                            {rel.framework.name}
                                          </span>
                                          <span className="text-xs text-orange-600 dark:text-orange-400">
                                            {rel.external_control.ref_code}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Show Compare To framework mappings if selected */}
              {compareToFramework && hasComparisonMappings && (
                <div className="px-4 py-3 space-y-2">
                  {/* Compare To Framework Mapped Controls - Collapsed Group */}
                  <div className="bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-200 dark:border-blue-800">
                    <button
                      onClick={() => toggleExpand(scfMappingsExpandKey)}
                      className="w-full px-3 py-2 flex items-center justify-between text-left hover:bg-blue-100 dark:hover:bg-blue-900/20 transition-colors rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        {scfMappingsExpanded ? (
                          <svg className="h-4 w-4 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        ) : (
                          <svg className="h-4 w-4 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        )}
                        <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                          {frameworks.find(f => f.id === compareToFramework)?.name || 'Compare To'} Mapped Controls ({node.comparisonMappings.length})
                        </span>
                      </div>
                    </button>
                    
                    {scfMappingsExpanded && (
                      <div className="px-3 pb-3 pt-1 space-y-2">
                        {node.comparisonMappings.map((compMapping: any) => {
                          const compControlId = compMapping.external_control.ref_code
                          const compExpandKey = `comp-${nodeKey}-${compControlId}`
                          const compExpanded = expandedItems.has(compExpandKey)
                          
                          // Find additional frameworks that map to the same primary control as this comparison control
                          const additionalForThisControl = node.relatedMappings?.filter((relMapping: any) => 
                            relMapping.scf_control?.control_id === compMapping.scf_control?.control_id
                          ) || []
                          
                          return (
                            <div 
                              key={compMapping.id}
                              className="bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700"
                            >
                              <div className="p-3">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="font-mono text-sm font-medium text-blue-600 dark:text-blue-400">
                                      {compMapping.external_control.ref_code}
                                    </div>
                                    <div className="text-sm text-gray-900 dark:text-gray-100 mt-1">
                                      {compMapping.external_control.description}
                                    </div>
                                  </div>
                                  <span className={`ml-2 px-2 py-0.5 text-xs font-medium rounded flex-shrink-0 ${
                                    compMapping.mapping_strength === 'exact'
                                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                                      : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                                  }`}>
                                    {compMapping.mapping_strength}
                                  </span>
                                </div>
                                
                                {/* Show additional frameworks badge */}
                                {additionalForThisControl.length > 0 && (
                                  <button
                                    onClick={() => toggleExpand(compExpandKey)}
                                    className="mt-2 flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300"
                                  >
                                    {compExpanded ? (
                                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                      </svg>
                                    ) : (
                                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                      </svg>
                                    )}
                                    <span>
                                      +{additionalForThisControl.length} also map here
                                    </span>
                                  </button>
                                )}
                              </div>
                              
                              {/* Show additional frameworks that also map here */}
                              {compExpanded && additionalForThisControl.length > 0 && (
                                <div className="px-3 pb-3 pt-1">
                                  <div className="text-xs font-semibold text-orange-700 dark:text-orange-400 uppercase mb-2">
                                    Additional Frameworks
                                  </div>
                                  <div className="space-y-2">
                                    {additionalForThisControl.map((relMapping: any) => (
                                      <div 
                                        key={relMapping.id}
                                        className="bg-orange-50 dark:bg-orange-900/10 p-2 rounded border border-orange-200 dark:border-orange-800"
                                      >
                                        <div className="flex items-start justify-between">
                                          <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                              <span className="text-xs font-medium text-orange-600 dark:text-orange-400">
                                                {relMapping.framework.name}
                                              </span>
                                              <span className="font-mono text-xs font-semibold text-orange-700 dark:text-orange-300">
                                                {relMapping.external_control.ref_code}
                                              </span>
                                            </div>
                                            <div className="text-xs text-gray-700 dark:text-gray-300 mt-1">
                                              {relMapping.external_control.description}
                                            </div>
                                          </div>
                                          <span className={`ml-2 px-1.5 py-0.5 text-xs font-medium rounded flex-shrink-0 ${
                                            relMapping.mapping_strength === 'exact'
                                              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                                              : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                                          }`}>
                                            {relMapping.mapping_strength}
                                          </span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Show additional framework mappings (relatedMappings) - especially important when SCF is primary */}
              {hasRelatedMappings && (
                <div className="px-4 py-3 space-y-2">
                  <div className="bg-orange-50 dark:bg-orange-900/10 rounded-lg border border-orange-200 dark:border-orange-800">
                    <button
                      onClick={() => toggleExpand(otherMappingsExpandKey)}
                      className="w-full px-3 py-2 flex items-center justify-between text-left hover:bg-orange-100 dark:hover:bg-orange-900/20 transition-colors rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        {otherMappingsExpanded ? (
                          <svg className="h-4 w-4 text-orange-600 dark:text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        ) : (
                          <svg className="h-4 w-4 text-orange-600 dark:text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        )}
                        <span className="text-sm font-semibold text-orange-700 dark:text-orange-300">
                          {isPrimarySCF ? 'Framework' : 'Additional Framework'} Mappings ({node.relatedMappings.length})
                        </span>
                      </div>
                    </button>
                    
                    {otherMappingsExpanded && (
                      <div className="px-3 pb-3 pt-1 space-y-2">
                        {/* Group by framework */}
                        {Object.entries(
                          node.relatedMappings.reduce((acc: any, mapping: any) => {
                            const fwName = mapping.framework.name
                            if (!acc[fwName]) acc[fwName] = []
                            acc[fwName].push(mapping)
                            return acc
                          }, {})
                        ).map(([fwName, mappings]: [string, any]) => (
                          <div key={fwName} className="space-y-1">
                            <div className="text-xs font-semibold text-orange-600 dark:text-orange-400 uppercase tracking-wide">
                              {fwName}
                            </div>
                            {mappings.map((mapping: any) => (
                              <div 
                                key={mapping.id}
                                className="bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 p-2"
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="font-mono text-sm font-medium text-orange-600 dark:text-orange-400">
                                      {mapping.external_control.ref_code}
                                    </div>
                                    <div className="text-xs text-gray-700 dark:text-gray-300 mt-0.5">
                                      {mapping.external_control.description}
                                    </div>
                                  </div>
                                  <span className={`ml-2 px-1.5 py-0.5 text-xs font-medium rounded flex-shrink-0 ${
                                    mapping.mapping_strength === 'exact'
                                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                                      : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                                  }`}>
                                    {mapping.mapping_strength}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Show message if no frameworks selected to compare */}
              {!compareToFramework && !hasRelatedMappings && !hasSCFMappings && additionalFrameworks.size === 0 && (
                <div className="px-4 py-3 text-center text-sm text-gray-500 dark:text-gray-400">
                  Select additional frameworks to see mappings
                </div>
              )}
              
              {/* Render children recursively */}
              {hasChildren && (
                <div className="px-4 py-3">
                  {Object.entries(node.children).map(([childKey, childNode]: [string, any]) => 
                    renderFrameworkNode(childKey, childNode, depth + 1)
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  const loadView = (view: SavedView) => {
    const config = view.configuration
    setPrimaryFramework(config.primaryFramework || '')
    setDisplayMode(config.displayMode || 'compact')
    setCompareToFramework(config.compareToFramework || '')
    setAdditionalFrameworks(new Set(config.additionalFrameworks || []))
    setSearchQuery(config.searchQuery || '')
    setShowFilterPanel(config.showFilterPanel !== false)
    setFilterPanelWidth(config.filterPanelWidth || 320)
  }

  const currentConfiguration = {
    primaryFramework,
    displayMode,
    compareToFramework: effectiveCompareToFramework || '',
    additionalFrameworks: additionalFrameworkIds,
    searchQuery,
    showFilterPanel,
    filterPanelWidth
  }

  // Calculate overview statistics
  const overviewStats = useMemo(() => {
    const primaryFw = frameworks.find(f => f.id === primaryFramework)
    if (!primaryFw || !groupedMappings) {
      return null
    }

    let totalControls = 0
    let controlsWithMappings = 0
    let totalMappings = 0
    const frameworkCounts: Record<string, { mappings: number, uniqueControls: Set<string> }> = {}

    // Initialize all additional frameworks with 0 counts
    additionalFrameworks.forEach((fwId) => {
      const fw = frameworks.find(f => f.id === fwId)
      if (fw) {
        const fwName = `${fw.name} ${fw.version}`.trim()
        frameworkCounts[fwName] = { mappings: 0, uniqueControls: new Set() }
      }
    })

    const countNode = (node: any) => {
      // Count logic depends on includeOrganizationalControls setting
      // When true: count ALL controls (leaf nodes + organizational parents)
      // When false: count ONLY leaf nodes (excludes organizational parents)
      const hasChildren = node.children && Object.keys(node.children).length > 0
      const isControl = node.ref_code || node.control_id
      const isLeafControl = isControl && !hasChildren
      const isOrganizationalParent = isControl && hasChildren
      
      const shouldCount = includeOrganizationalControls 
        ? isControl // Count all controls (leaf + organizational)
        : isLeafControl // Count only leaf controls
      
      if (shouldCount) {
        totalControls++
        // Only count SCF mappings when SCF is explicitly selected in additional frameworks
        const scfMappingCount = isPrimarySCF || !isSCFInAdditional ? 0 : (node.scfMappings?.length || 0)
        const hasMappings = scfMappingCount + (node.comparisonMappings?.length || 0) + (node.relatedMappings?.length || 0) > 0
        if (hasMappings) {
          controlsWithMappings++
          totalMappings += scfMappingCount + (node.comparisonMappings?.length || 0) + (node.relatedMappings?.length || 0)
          
          // Count related framework mappings - both mapping count and unique controls
          const nodeId = node.ref_code || node.control_id
          const processedFrameworks = new Set<string>()
          
          // Count comparison mappings
          node.comparisonMappings?.forEach((m: any) => {
            const fwKey = m.framework.id
            const fwName = `${m.framework.name} ${m.framework.version}`.trim()
            
            if (!frameworkCounts[fwName]) {
              frameworkCounts[fwName] = { mappings: 0, uniqueControls: new Set() }
            }
            frameworkCounts[fwName].mappings++
            
            if (!processedFrameworks.has(fwKey)) {
              frameworkCounts[fwName].uniqueControls.add(nodeId)
              processedFrameworks.add(fwKey)
            }
          })
          
          // Count related mappings (additional frameworks)
          node.relatedMappings?.forEach((m: any) => {
            const fwKey = m.framework.id
            const fwName = `${m.framework.name} ${m.framework.version}`.trim()
            
            if (!frameworkCounts[fwName]) {
              frameworkCounts[fwName] = { mappings: 0, uniqueControls: new Set() }
            }
            frameworkCounts[fwName].mappings++
            
            if (!processedFrameworks.has(fwKey)) {
              frameworkCounts[fwName].uniqueControls.add(nodeId)
              processedFrameworks.add(fwKey)
            }
          })
        }
      }
      if (node.children) {
        Object.values(node.children).forEach(countNode)
      }
    }

    Object.values(groupedMappings).forEach(countNode)

    const comparedFrameworks = Object.entries(frameworkCounts).map(([name, data]: [string, any]) => ({
      id: name,
      name,
      count: data.mappings,
      uniqueControls: data.uniqueControls.size
    }))

    return {
      primaryFrameworkName: `${primaryFw.name} ${primaryFw.version || ''}`.trim(),
      comparedFrameworks,
      totalControls,
      controlsWithMappings,
      totalMappings,
      controlsWithoutMappings: totalControls - controlsWithMappings,
      selectedFrameworkCount: additionalFrameworks.size
    }
  }, [groupedMappings, frameworks, primaryFramework, additionalFrameworks, isPrimarySCF, isSCFInAdditional, includeOrganizationalControls])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
      {/* Filter Panel - Collapsible */}
      <div
        className={`bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col transition-all duration-300 ${
          showFilterPanel ? 'w-80' : 'w-12'
        }`}
      >
        {/* Collapse Toggle - Always visible */}
        <div className={`flex items-center ${showFilterPanel ? 'justify-between p-4 border-b border-gray-200 dark:border-gray-700' : 'justify-center p-2'}`}>
          {showFilterPanel && (
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              Additional Mappings
              {additionalFrameworks.size > 0 && (
                <span className="px-2 py-0.5 text-xs font-medium bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full">
                  {additionalFrameworks.size}
                </span>
              )}
            </h3>
          )}
          <button
            onClick={() => setShowFilterPanel(!showFilterPanel)}
            className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
            title={showFilterPanel ? 'Collapse panel' : 'Expand panel'}
          >
            {showFilterPanel ? (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
            )}
          </button>
        </div>

        {/* Collapsed state - show icon indicators */}
        {!showFilterPanel && (
          <div className="flex flex-col items-center py-4 gap-3">
            <div className="relative" title={`${additionalFrameworks.size} frameworks selected`}>
              <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              {additionalFrameworks.size > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 text-xs font-medium bg-indigo-600 text-white rounded-full flex items-center justify-center">
                  {additionalFrameworks.size}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Panel Content - only when expanded */}
        {showFilterPanel && (
          <div className="flex-1 overflow-y-auto p-4">
            <div className="flex items-center justify-between mb-4">
            </div>
          
          {/* Search Input */}
          <div className="mb-4 relative">
            <input
              type="text"
              value={frameworkSearchQuery}
              onChange={(e) => setFrameworkSearchQuery(e.target.value)}
              placeholder="Search frameworks..."
              className="w-full px-3 py-2 pl-9 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <svg className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {frameworkSearchQuery && (
              <button
                onClick={() => setFrameworkSearchQuery('')}
                className="absolute right-2 top-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          
          <div className="space-y-2">
            {filteredAndSortedFrameworks.length === 0 ? (
              <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                No frameworks found
              </div>
            ) : (
              filteredAndSortedFrameworks.map(fw => {
                const isSelected = additionalFrameworks.has(fw.id)
                return (
                  <label
                    key={fw.id}
                    className={`flex items-center gap-3 p-2 rounded cursor-pointer transition-all duration-150 ${
                      isSelected 
                        ? 'bg-indigo-50 dark:bg-indigo-900/20 border-l-4 border-indigo-600' 
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700 border-l-4 border-transparent'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleFramework(fw.id)}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded ml-1"
                    />
                    <div className="flex-1">
                      <div className={`text-sm font-medium ${
                        isSelected 
                          ? 'text-indigo-700 dark:text-indigo-300' 
                          : 'text-gray-900 dark:text-gray-100'
                      }`}>
                        {fw.name}
                        {fw.mapping_count !== undefined && (
                          <span className={`ml-2 font-normal ${
                            isSelected 
                              ? 'text-indigo-600 dark:text-indigo-400' 
                              : 'text-gray-500 dark:text-gray-400'
                          }`}>
                            ({fw.mapping_count})
                          </span>
                        )}
                      </div>
                      {fw.version && (
                        <div className={`text-xs ${
                          isSelected 
                            ? 'text-indigo-600 dark:text-indigo-400' 
                            : 'text-gray-500 dark:text-gray-400'
                        }`}>
                          {fw.version}
                        </div>
                      )}
                    </div>
                  </label>
                )
              })
            )}
          </div>

          {additionalFrameworks.size > 0 && (
            <button
              onClick={clearFilters}
              className="mt-4 w-full text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium"
            >
              Clear all filters
            </button>
          )}
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Framework Mapping Explorer
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Explore relationships between SCF controls and {frameworks.length} compliance frameworks
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowLoadModal(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
                Load View
              </button>
              <button
                onClick={() => setShowSaveModal(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-indigo-600 rounded-md hover:bg-indigo-700"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
                Save View
              </button>
            </div>
          </div>

          {/* Search and Primary Framework Selection */}
          <div className="flex items-center gap-4">
            {/* Primary Framework Selector */}
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Primary Framework
              </label>
              <select
                value={primaryFramework}
                onChange={(e) => handlePrimaryFrameworkChange(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Select Primary...</option>
                {frameworks.map(fw => (
                  <option key={fw.id} value={fw.id}>
                    {fw.name} {fw.version}
                  </option>
                ))}
              </select>
            </div>

            {/* Display Mode Toggle */}
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Display Mode
              </label>
              <div className="inline-flex rounded-lg border border-gray-300 dark:border-gray-600 p-1 bg-gray-50 dark:bg-gray-700">
                <button
                  onClick={() => setDisplayMode('compact')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    displayMode === 'compact'
                      ? 'bg-white dark:bg-gray-800 text-indigo-700 dark:text-indigo-400 shadow-sm'
                      : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
                  }`}
                >
                  Compact
                </button>
                <button
                  onClick={() => setDisplayMode('expanded')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    displayMode === 'expanded'
                      ? 'bg-white dark:bg-gray-800 text-indigo-700 dark:text-indigo-400 shadow-sm'
                      : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
                  }`}
                >
                  Expanded
                </button>
              </div>
            </div>

            {/* Compare To Selector - Only shown when displayMode=expanded AND 2+ additional frameworks */}
            {shouldShowCompareToSelector && (
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Compare To (Highlight)
                </label>
                <select
                  value={compareToFramework}
                  onChange={(e) => setCompareToFramework(e.target.value)}
                  className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  {additionalFrameworkIds.map(fwId => {
                    const fw = frameworks.find(f => f.id === fwId)
                    return fw ? (
                      <option key={fw.id} value={fw.id}>
                        {fw.name} {fw.version}
                      </option>
                    ) : null
                  })}
                </select>
              </div>
            )}

            {/* Debug Info Checkbox */}
            <div className="flex items-center">
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showDebugInfo}
                  onChange={(e) => setShowDebugInfo(e.target.checked)}
                  className="rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
                />
                Show Debug Info
              </label>
            </div>
            
            {/* Advanced Filters Toggle */}
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
            >
              <svg
                className={`h-4 w-4 transition-transform ${showAdvancedFilters ? 'rotate-90' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              Advanced Filters
            </button>
            
            {/* Advanced Filters Section */}
            {showAdvancedFilters && (
              <div className="flex flex-col gap-3 pl-6 border-l-2 border-gray-200 dark:border-gray-700">
                {/* Filter by mappings */}
                <div className="flex items-center gap-1.5">
                  <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!showAllPrimaryControls}
                      onChange={(e) => setShowAllPrimaryControls(!e.target.checked)}
                      className="rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
                    />
                    Hide controls without mappings
                  </label>
                  <div className="group/tooltip relative">
                    <svg className="h-3.5 w-3.5 text-gray-400 hover:text-indigo-600 cursor-help" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="invisible group-hover/tooltip:visible absolute left-0 bottom-full mb-2 w-64 px-3 py-2 text-xs text-white bg-gray-900 dark:bg-gray-700 rounded-lg shadow-lg z-50">
                      Only show controls that have mappings to your selected frameworks. Useful for focusing on coverage gaps.
                      <div className="absolute top-full left-4 -mt-1">
                        <div className="border-4 border-transparent border-t-gray-900 dark:border-t-gray-700"></div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Include organizational parents */}
                <div className="flex items-center gap-1.5">
                  <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeOrganizationalControls}
                      onChange={(e) => setIncludeOrganizationalControls(e.target.checked)}
                      className="rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
                    />
                    Show parent control groupings
                    <span className="text-xs text-gray-500 dark:text-gray-400">(+248)</span>
                  </label>
                  <div className="group/tooltip relative">
                    <svg className="h-3.5 w-3.5 text-gray-400 hover:text-indigo-600 cursor-help" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="invisible group-hover/tooltip:visible absolute left-0 bottom-full mb-2 w-72 px-3 py-2 text-xs text-white bg-gray-900 dark:bg-gray-700 rounded-lg shadow-lg z-50">
                      <div className="font-semibold mb-1">Organizational Parent Controls</div>
                      Shows 248 parent controls (like AAT-01) that group related sub-controls. These provide hierarchy structure and can have their own mappings. Uncheck to show only the 1,172 implementable leaf controls.
                      <div className="absolute top-full left-4 -mt-1">
                        <div className="border-4 border-transparent border-t-gray-900 dark:border-t-gray-700"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex-1 max-w-md">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search controls..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Active Filters Summary */}
          {additionalFrameworks.size > 0 && (
            <div className="mt-3 flex items-center gap-2">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                Showing {additionalFrameworks.size} additional framework{additionalFrameworks.size !== 1 ? 's' : ''}
              </span>
              <button
                onClick={clearFilters}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium"
              >
                Clear all
              </button>
            </div>
          )}
          
          {/* Debug Panel */}
          {showDebugInfo && (
            <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded text-xs">
              <div className="font-semibold text-yellow-800 dark:text-yellow-300 mb-1">Debug Info:</div>
              <div className="text-yellow-700 dark:text-yellow-400 space-y-1">
                <div>Primary: {frameworks.find(f => f.id === primaryFramework)?.name || 'None'}</div>
                <div>Display Mode: {displayMode}</div>
                <div>Additional Frameworks: {additionalFrameworkIds.map(id => frameworks.find(f => f.id === id)?.name).join(', ') || 'None'}</div>
                <div>Compare To: {frameworks.find(f => f.id === effectiveCompareToFramework)?.name || 'None'}</div>
                <div>Should Show Compare Selector: {shouldShowCompareToSelector ? 'Yes' : 'No'}</div>
                <div>Is Primary SCF: {isPrimarySCF ? 'Yes' : 'No'}</div>
                <div>Total Controls: {groupedMappings ? Object.keys(groupedMappings).length : 0}</div>
              </div>
            </div>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 p-6 overflow-auto">
          {/* Mapping Overview */}
          {!loading && overviewStats && (additionalFrameworks.size > 0 || primaryFramework) && (
            <MappingOverview
              viewMode={displayMode}
              primaryFrameworkName={overviewStats.primaryFrameworkName}
              comparedFrameworks={overviewStats.comparedFrameworks}
              totalControls={overviewStats.totalControls}
              controlsWithMappings={overviewStats.controlsWithMappings}
              totalMappings={overviewStats.totalMappings}
              controlsWithoutMappings={overviewStats.controlsWithoutMappings}
              selectedFrameworkCount={overviewStats.selectedFrameworkCount}
            />
          )}

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Loading mappings...</p>
            </div>
          ) : (frameworksLoading) ? (
            <div className="text-center py-12">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Loading frameworks...</p>
            </div>
          ) : (mappingsError) ? (
            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 p-8 text-center">
              <svg className="h-12 w-12 text-red-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">
                Database Error
              </h3>
              <p className="text-red-700 dark:text-red-300 mb-4">
                {mappingsError?.message || 'Unknown error occurred'}
              </p>
              <details className="text-left bg-white dark:bg-gray-800 p-4 rounded border border-red-300 dark:border-red-700">
                <summary className="cursor-pointer text-sm font-medium text-red-900 dark:text-red-100">
                  Error Details
                </summary>
                <pre className="mt-2 text-xs text-red-800 dark:text-red-200 overflow-auto">
                  {JSON.stringify(mappingsError, null, 2)}
                </pre>
              </details>
            </div>
          ) : !primaryFramework ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
              <svg className="h-12 w-12 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Select a Framework
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Choose a primary framework from the dropdown above to view its control mappings
              </p>
            </div>
          ) : additionalFrameworks.size === 0 && !showAllPrimaryControls ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
              <svg className="h-12 w-12 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                No Additional Frameworks Selected
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Select one or more frameworks from the "Show Additional Mappings" panel to view cross-framework mappings
                {', or uncheck "Show only controls with mappings" in Advanced Filters to see all controls'}
              </p>
            </div>
          ) : (
            // UNIFIED RENDERING - All views use framework hierarchy rendering
            <div className="space-y-4">
              {Object.entries(groupedMappings || {}).map(([nodeKey, node]: [string, any]) => 
                renderFrameworkNode(nodeKey, node, 0)
              )}

              {Object.keys(groupedMappings || {}).length === 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
                  <svg className="h-12 w-12 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    No Results Found
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Try adjusting your search or select different frameworks
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <SaveViewModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        configuration={currentConfiguration}
      />

      <LoadViewModal
        isOpen={showLoadModal}
        onClose={() => setShowLoadModal(false)}
        onLoadView={loadView}
      />
    </div>
  )
}
