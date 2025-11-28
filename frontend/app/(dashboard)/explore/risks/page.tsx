'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { ArrowLeft, Search, Filter, ChevronDown, ChevronRight, Shield, AlertTriangle, X } from 'lucide-react'
import { useCatalogRisks, useRiskStats, useRiskControlsForFramework, type Risk } from '@/lib/hooks/useRisks'
import { useFrameworks } from '@/lib/hooks/useFrameworks'

// Risk grouping colors
const groupingColors: Record<string, { bg: string; text: string; border: string }> = {
  'Access Control': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  'Asset Management': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  'Business Continuity': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  'Exposure': { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  'Governance': { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  'Incident Response': { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  'Situational Awareness': { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200' },
  'Supply Chain': { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200' },
}

// NIST CSF function colors
const nistColors: Record<string, { bg: string; text: string }> = {
  'Govern': { bg: 'bg-violet-100', text: 'text-violet-700' },
  'Identify': { bg: 'bg-blue-100', text: 'text-blue-700' },
  'Protect': { bg: 'bg-green-100', text: 'text-green-700' },
  'Detect': { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  'Respond': { bg: 'bg-orange-100', text: 'text-orange-700' },
  'Recover': { bg: 'bg-red-100', text: 'text-red-700' },
}

function RiskDetailPanel({ risk, onClose }: { risk: Risk; onClose: () => void }) {
  const { data: frameworks, isLoading: frameworksLoading } = useFrameworks()
  const [selectedFrameworkId, setSelectedFrameworkId] = useState<string>('')
  const [controlSearchQuery, setControlSearchQuery] = useState('')

  // Sort frameworks with SCF first, then alphabetically
  const sortedFrameworks = useMemo(() => {
    if (!frameworks) return []
    return [...frameworks].sort((a, b) => {
      if (a.code === 'SCF') return -1
      if (b.code === 'SCF') return 1
      return a.name.localeCompare(b.name)
    })
  }, [frameworks])

  // Set default to SCF when frameworks load
  useMemo(() => {
    if (sortedFrameworks.length > 0 && !selectedFrameworkId) {
      const scf = sortedFrameworks.find(f => f.code === 'SCF')
      if (scf) {
        setSelectedFrameworkId(scf.id)
      }
    }
  }, [sortedFrameworks, selectedFrameworkId])

  // Fetch controls for the selected framework using the new RPC
  const { data: controls, isLoading: controlsLoading } = useRiskControlsForFramework(
    risk.id,
    selectedFrameworkId
  )

  const groupingColor = risk.risk_grouping ? groupingColors[risk.risk_grouping] : null
  const nistColor = risk.nist_csf_function ? nistColors[risk.nist_csf_function] : null

  // Filter controls by search query only (framework filtering is done by the RPC)
  const filteredControls = useMemo(() => {
    if (!controls) return []

    if (!controlSearchQuery.trim()) return controls

    const query = controlSearchQuery.toLowerCase()
    return controls.filter((ctrl) =>
      ctrl.ref_code?.toLowerCase().includes(query) ||
      ctrl.description?.toLowerCase().includes(query)
    )
  }, [controls, controlSearchQuery])

  // Get the selected framework name for display
  const selectedFramework = sortedFrameworks.find(f => f.id === selectedFrameworkId)

  return (
    <div className="h-full flex flex-col bg-white border-l border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div>
          <div className="text-sm text-gray-500 font-mono">{risk.risk_id}</div>
          <h2 className="text-lg font-semibold text-gray-900">{risk.title}</h2>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
        >
          <X className="h-5 w-5 text-gray-500" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Description */}
        {risk.description && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Description</h3>
            <p className="text-sm text-gray-600 leading-relaxed">{risk.description}</p>
          </div>
        )}

        {/* Metadata */}
        <div className="grid grid-cols-2 gap-4">
          {risk.risk_grouping && groupingColor && (
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase mb-1">Grouping</h3>
              <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-sm font-medium ${groupingColor.bg} ${groupingColor.text}`}>
                {risk.risk_grouping}
              </span>
            </div>
          )}
          {risk.nist_csf_function && nistColor && (
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase mb-1">NIST CSF Function</h3>
              <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-sm font-medium ${nistColor.bg} ${nistColor.text}`}>
                {risk.nist_csf_function}
              </span>
            </div>
          )}
        </div>

        {/* Mapped Controls */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-3">
            <Shield className="h-4 w-4" />
            Mitigating Controls
          </h3>

          {/* Framework Dropdown */}
          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Framework</label>
            <select
              value={selectedFrameworkId}
              onChange={(e) => setSelectedFrameworkId(e.target.value)}
              disabled={frameworksLoading}
              className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
            >
              {frameworksLoading ? (
                <option>Loading frameworks...</option>
              ) : (
                sortedFrameworks.map(fw => (
                  <option key={fw.id} value={fw.id}>
                    {fw.name} ({fw.code})
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Search Filter */}
          <div className="mb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search controls..."
                value={controlSearchQuery}
                onChange={(e) => setControlSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Results count */}
          {!controlsLoading && (
            <div className="text-xs text-gray-500 mb-2">
              {filteredControls.length.toLocaleString()} control{filteredControls.length !== 1 ? 's' : ''} mapped
              {controlSearchQuery && ` (filtered)`}
            </div>
          )}

          {controlsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
            </div>
          ) : filteredControls.length > 0 ? (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {filteredControls.slice(0, 100).map((ctrl) => (
                <div
                  key={ctrl.control_id}
                  className="p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-mono text-sm font-medium text-indigo-600">
                        {ctrl.ref_code}
                      </div>
                      {ctrl.description && (
                        <div className="text-xs text-gray-600 mt-1 line-clamp-2">
                          {ctrl.description}
                        </div>
                      )}
                      {ctrl.mapping_via_scf_control && (
                        <div className="text-xs text-gray-400 mt-1">
                          via SCF: {ctrl.mapping_via_scf_control}
                        </div>
                      )}
                    </div>
                    {ctrl.control_effectiveness && (
                      <span className={`ml-2 px-2 py-0.5 text-xs font-medium rounded ${
                        ctrl.control_effectiveness === 'high'
                          ? 'bg-green-100 text-green-700'
                          : ctrl.control_effectiveness === 'medium'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {ctrl.control_effectiveness}
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {filteredControls.length > 100 && (
                <div className="text-center py-2 text-sm text-gray-500">
                  Showing 100 of {filteredControls.length.toLocaleString()} controls
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Shield className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">
                {controlSearchQuery
                  ? 'No controls match your search'
                  : `No controls mapped to ${selectedFramework?.code || 'this framework'}`}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function RiskCatalogPage() {
  const { data: risks, isLoading: risksLoading, error: risksError } = useCatalogRisks()
  const { data: stats, isLoading: statsLoading } = useRiskStats()

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedGrouping, setSelectedGrouping] = useState<string | null>(null)
  const [selectedNistFunction, setSelectedNistFunction] = useState<string | null>(null)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [selectedRisk, setSelectedRisk] = useState<Risk | null>(null)

  // Group risks by risk_grouping
  const groupedRisks = useMemo(() => {
    if (!risks) return {}

    const filtered = risks.filter(risk => {
      const matchesSearch = searchQuery === '' ||
        risk.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        risk.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        risk.risk_id?.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesGrouping = !selectedGrouping || risk.risk_grouping === selectedGrouping
      const matchesNist = !selectedNistFunction || risk.nist_csf_function === selectedNistFunction

      return matchesSearch && matchesGrouping && matchesNist
    })

    return filtered.reduce((acc, risk) => {
      const group = risk.risk_grouping || 'Uncategorized'
      if (!acc[group]) acc[group] = []
      acc[group].push(risk)
      return acc
    }, {} as Record<string, Risk[]>)
  }, [risks, searchQuery, selectedGrouping, selectedNistFunction])

  const toggleGroup = (group: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev)
      if (newSet.has(group)) {
        newSet.delete(group)
      } else {
        newSet.add(group)
      }
      return newSet
    })
  }

  const expandAll = () => {
    setExpandedGroups(new Set(Object.keys(groupedRisks)))
  }

  const collapseAll = () => {
    setExpandedGroups(new Set())
  }

  const clearFilters = () => {
    setSearchQuery('')
    setSelectedGrouping(null)
    setSelectedNistFunction(null)
  }

  const hasActiveFilters = searchQuery !== '' || selectedGrouping !== null || selectedNistFunction !== null

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Main Content */}
      <div className={`flex-1 flex flex-col ${selectedRisk ? 'mr-[480px]' : ''}`}>
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center gap-4 mb-4">
              <Link
                href="/explore"
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Explore
              </Link>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                  <AlertTriangle className="h-7 w-7 text-red-600" />
                  Risk Catalog
                </h1>
                <p className="mt-1 text-sm text-gray-600">
                  Browse the SCF Risk Taxonomy - {stats?.catalogRisks || 0} risks mapped to {stats?.totalControlMappings?.toLocaleString() || 0} controls
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        {!statsLoading && stats && (
          <div className="bg-white border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                <div className="bg-gray-50 rounded-lg px-4 py-3">
                  <div className="text-xs text-gray-500 uppercase font-medium">Total Risks</div>
                  <div className="text-xl font-bold text-gray-900">{stats.catalogRisks}</div>
                </div>
                <div className="bg-gray-50 rounded-lg px-4 py-3">
                  <div className="text-xs text-gray-500 uppercase font-medium">Control Mappings</div>
                  <div className="text-xl font-bold text-gray-900">{stats.totalControlMappings.toLocaleString()}</div>
                </div>
                {Object.entries(stats.byGrouping).slice(0, 4).map(([group, count]) => (
                  <div key={group} className="bg-gray-50 rounded-lg px-4 py-3">
                    <div className="text-xs text-gray-500 uppercase font-medium truncate">{group}</div>
                    <div className="text-xl font-bold text-gray-900">{count}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex flex-wrap items-center gap-4">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search risks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {/* Grouping Filter */}
              <select
                value={selectedGrouping || ''}
                onChange={(e) => setSelectedGrouping(e.target.value || null)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">All Groupings</option>
                {Object.keys(groupingColors).map(group => (
                  <option key={group} value={group}>{group}</option>
                ))}
              </select>

              {/* NIST Function Filter */}
              <select
                value={selectedNistFunction || ''}
                onChange={(e) => setSelectedNistFunction(e.target.value || null)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">All NIST Functions</option>
                {Object.keys(nistColors).map(func => (
                  <option key={func} value={func}>{func}</option>
                ))}
              </select>

              {/* Clear Filters */}
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  Clear filters
                </button>
              )}

              {/* Expand/Collapse */}
              <div className="flex items-center gap-2 ml-auto">
                <button
                  onClick={expandAll}
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Expand all
                </button>
                <span className="text-gray-300">|</span>
                <button
                  onClick={collapseAll}
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Collapse all
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {risksLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                <span className="ml-3 text-gray-600">Loading risks...</span>
              </div>
            ) : risksError ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                <p className="text-red-700">Error loading risks: {risksError.message}</p>
              </div>
            ) : Object.keys(groupedRisks).length === 0 ? (
              <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                <Search className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600">No risks found matching your criteria</p>
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(groupedRisks)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([group, groupRisks]) => {
                    const isExpanded = expandedGroups.has(group)
                    const groupColor = groupingColors[group] || { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' }

                    return (
                      <div key={group} className={`rounded-lg border ${groupColor.border} overflow-hidden`}>
                        <button
                          onClick={() => toggleGroup(group)}
                          className={`w-full px-4 py-3 flex items-center justify-between ${groupColor.bg} hover:opacity-90 transition-opacity`}
                        >
                          <div className="flex items-center gap-3">
                            {isExpanded ? (
                              <ChevronDown className={`h-5 w-5 ${groupColor.text}`} />
                            ) : (
                              <ChevronRight className={`h-5 w-5 ${groupColor.text}`} />
                            )}
                            <span className={`font-semibold ${groupColor.text}`}>{group}</span>
                            <span className={`text-sm ${groupColor.text} opacity-75`}>
                              ({groupRisks.length} risks)
                            </span>
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="bg-white divide-y divide-gray-100">
                            {groupRisks.map(risk => (
                              <button
                                key={risk.id}
                                onClick={() => setSelectedRisk(risk)}
                                className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                                  selectedRisk?.id === risk.id ? 'bg-indigo-50 border-l-4 border-indigo-500' : ''
                                }`}
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono text-sm font-medium text-indigo-600">
                                        {risk.risk_id}
                                      </span>
                                      {risk.nist_csf_function && nistColors[risk.nist_csf_function] && (
                                        <span className={`px-2 py-0.5 text-xs font-medium rounded ${nistColors[risk.nist_csf_function].bg} ${nistColors[risk.nist_csf_function].text}`}>
                                          {risk.nist_csf_function}
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-sm text-gray-900 mt-1">{risk.title}</div>
                                    {risk.description && (
                                      <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                                        {risk.description}
                                      </div>
                                    )}
                                  </div>
                                  <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0 ml-4" />
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detail Panel */}
      {selectedRisk && (
        <div className="fixed right-0 top-0 bottom-0 w-[480px] shadow-xl z-50">
          <RiskDetailPanel risk={selectedRisk} onClose={() => setSelectedRisk(null)} />
        </div>
      )}
    </div>
  )
}
