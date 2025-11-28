'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { ArrowLeft, Search, ChevronDown, ChevronRight, Shield, Zap, Cloud, Skull, X } from 'lucide-react'
import { useThreats, useThreatStats, useThreatControlsForFramework, type Threat } from '@/lib/hooks/useThreats'
import { useFrameworks } from '@/lib/hooks/useFrameworks'

// Threat category colors and icons
const categoryConfig: Record<string, { bg: string; text: string; border: string; icon: React.ReactNode; label: string }> = {
  'natural': {
    bg: 'bg-teal-50',
    text: 'text-teal-700',
    border: 'border-teal-200',
    icon: <Cloud className="h-5 w-5" />,
    label: 'Natural Threat'
  },
  'manmade': {
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
    icon: <Skull className="h-5 w-5" />,
    label: 'Man-Made Threat'
  },
}

// Threat grouping colors
const groupingColors: Record<string, { bg: string; text: string; border: string }> = {
  'Natural Threat': { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' },
  'Man-Made Threat': { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
}

function ThreatDetailPanel({ threat, onClose }: { threat: Threat; onClose: () => void }) {
  const { data: frameworks, isLoading: frameworksLoading } = useFrameworks()
  const [selectedFrameworkId, setSelectedFrameworkId] = useState<string>('')
  const [controlSearchQuery, setControlSearchQuery] = useState('')

  const categoryInfo = categoryConfig[threat.category] || categoryConfig['manmade']

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
  const { data: controls, isLoading: controlsLoading } = useThreatControlsForFramework(
    threat.id,
    selectedFrameworkId
  )

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
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 font-mono">{threat.threat_id}</span>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${categoryInfo.bg} ${categoryInfo.text}`}>
              {categoryInfo.icon}
              {categoryInfo.label}
            </span>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mt-1">{threat.name}</h2>
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
        {threat.description && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Description</h3>
            <p className="text-sm text-gray-600 leading-relaxed">{threat.description}</p>
          </div>
        )}

        {/* Metadata */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase mb-1">Category</h3>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm font-medium ${categoryInfo.bg} ${categoryInfo.text}`}>
              {categoryInfo.icon}
              {threat.category === 'natural' ? 'Natural' : 'Man-Made'}
            </span>
          </div>
          {threat.threat_grouping && (
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase mb-1">Grouping</h3>
              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-sm font-medium bg-gray-100 text-gray-700">
                {threat.threat_grouping}
              </span>
            </div>
          )}
          {threat.is_material_threat && (
            <div className="col-span-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm font-medium bg-amber-100 text-amber-700">
                <Zap className="h-4 w-4" />
                Material Threat
              </span>
            </div>
          )}
        </div>

        {/* References */}
        {threat.threat_references && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">References</h3>
            <p className="text-sm text-gray-600">{threat.threat_references}</p>
          </div>
        )}

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
                    {ctrl.mitigation_level && (
                      <span className={`ml-2 px-2 py-0.5 text-xs font-medium rounded ${
                        ctrl.mitigation_level === 'mitigates'
                          ? 'bg-green-100 text-green-700'
                          : ctrl.mitigation_level === 'partially_mitigates'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {ctrl.mitigation_level.replace('_', ' ')}
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

export default function ThreatCatalogPage() {
  const { data: threats, isLoading: threatsLoading, error: threatsError } = useThreats()
  const { data: stats, isLoading: statsLoading } = useThreatStats()

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [selectedThreat, setSelectedThreat] = useState<Threat | null>(null)

  // Group threats by threat_grouping
  const groupedThreats = useMemo(() => {
    if (!threats) return {}

    const filtered = threats.filter(threat => {
      const matchesSearch = searchQuery === '' ||
        threat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        threat.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        threat.threat_id?.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesCategory = !selectedCategory || threat.category === selectedCategory

      return matchesSearch && matchesCategory
    })

    return filtered.reduce((acc, threat) => {
      const group = threat.threat_grouping || 'Uncategorized'
      if (!acc[group]) acc[group] = []
      acc[group].push(threat)
      return acc
    }, {} as Record<string, Threat[]>)
  }, [threats, searchQuery, selectedCategory])

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
    setExpandedGroups(new Set(Object.keys(groupedThreats)))
  }

  const collapseAll = () => {
    setExpandedGroups(new Set())
  }

  const clearFilters = () => {
    setSearchQuery('')
    setSelectedCategory(null)
  }

  const hasActiveFilters = searchQuery !== '' || selectedCategory !== null

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Main Content */}
      <div className={`flex-1 flex flex-col ${selectedThreat ? 'mr-[480px]' : ''}`}>
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
                  <Zap className="h-7 w-7 text-purple-600" />
                  Threat Catalog
                </h1>
                <p className="mt-1 text-sm text-gray-600">
                  Browse natural and man-made threats - {stats?.totalThreats || 0} threats mapped to {stats?.totalControlMappings?.toLocaleString() || 0} controls
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        {!statsLoading && stats && (
          <div className="bg-white border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 rounded-lg px-4 py-3">
                  <div className="text-xs text-gray-500 uppercase font-medium">Total Threats</div>
                  <div className="text-xl font-bold text-gray-900">{stats.totalThreats}</div>
                </div>
                <div className="bg-teal-50 rounded-lg px-4 py-3">
                  <div className="text-xs text-teal-600 uppercase font-medium flex items-center gap-1">
                    <Cloud className="h-3 w-3" />
                    Natural Threats
                  </div>
                  <div className="text-xl font-bold text-teal-700">{stats.naturalThreats}</div>
                </div>
                <div className="bg-red-50 rounded-lg px-4 py-3">
                  <div className="text-xs text-red-600 uppercase font-medium flex items-center gap-1">
                    <Skull className="h-3 w-3" />
                    Man-Made Threats
                  </div>
                  <div className="text-xl font-bold text-red-700">{stats.manmadeThreats}</div>
                </div>
                <div className="bg-gray-50 rounded-lg px-4 py-3">
                  <div className="text-xs text-gray-500 uppercase font-medium">Control Mappings</div>
                  <div className="text-xl font-bold text-gray-900">{stats.totalControlMappings.toLocaleString()}</div>
                </div>
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
                  placeholder="Search threats..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {/* Category Filter */}
              <select
                value={selectedCategory || ''}
                onChange={(e) => setSelectedCategory(e.target.value || null)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">All Categories</option>
                <option value="natural">Natural Threats</option>
                <option value="manmade">Man-Made Threats</option>
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
            {threatsLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                <span className="ml-3 text-gray-600">Loading threats...</span>
              </div>
            ) : threatsError ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                <Zap className="h-8 w-8 text-red-500 mx-auto mb-2" />
                <p className="text-red-700">Error loading threats: {threatsError.message}</p>
              </div>
            ) : Object.keys(groupedThreats).length === 0 ? (
              <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                <Search className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600">No threats found matching your criteria</p>
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(groupedThreats)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([group, groupThreats]) => {
                    const isExpanded = expandedGroups.has(group)
                    const groupColor = groupingColors[group] || { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' }
                    const GroupIcon = group === 'Natural Threat' ? Cloud : Skull

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
                            <GroupIcon className={`h-5 w-5 ${groupColor.text}`} />
                            <span className={`font-semibold ${groupColor.text}`}>{group}</span>
                            <span className={`text-sm ${groupColor.text} opacity-75`}>
                              ({groupThreats.length} threats)
                            </span>
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="bg-white divide-y divide-gray-100">
                            {groupThreats.map(threat => {
                              const catInfo = categoryConfig[threat.category] || categoryConfig['manmade']
                              return (
                                <button
                                  key={threat.id}
                                  onClick={() => setSelectedThreat(threat)}
                                  className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                                    selectedThreat?.id === threat.id ? 'bg-indigo-50 border-l-4 border-indigo-500' : ''
                                  }`}
                                >
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2">
                                        <span className="font-mono text-sm font-medium text-indigo-600">
                                          {threat.threat_id}
                                        </span>
                                        {threat.is_material_threat && (
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">
                                            <Zap className="h-3 w-3" />
                                            Material
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-sm text-gray-900 mt-1">{threat.name}</div>
                                      {threat.description && (
                                        <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                                          {threat.description}
                                        </div>
                                      )}
                                    </div>
                                    <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0 ml-4" />
                                  </div>
                                </button>
                              )
                            })}
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
      {selectedThreat && (
        <div className="fixed right-0 top-0 bottom-0 w-[480px] shadow-xl z-50">
          <ThreatDetailPanel threat={selectedThreat} onClose={() => setSelectedThreat(null)} />
        </div>
      )}
    </div>
  )
}
