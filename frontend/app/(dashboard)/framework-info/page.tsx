'use client'

import { useState } from 'react'
import { useFrameworks, useFrameworkStats, useFrameworkDetails } from '@/lib/hooks/useFrameworks'
import { useControlMappingsByFrameworkGrouped } from '@/lib/hooks/useControlMappings'

// Framework metadata lookup (can be moved to database later)
const frameworkMetadata: Record<string, {
  source_organization: string
  geography: string
  category: string
  website?: string
  color: string
}> = {
  'NIST-CSF': {
    source_organization: 'National Institute of Standards and Technology',
    geography: 'United States (Global adoption)',
    category: 'Best Practice Framework',
    website: 'https://www.nist.gov/cyberframework',
    color: 'blue'
  },
  'ISO-27001': {
    source_organization: 'International Organization for Standardization',
    geography: 'Global',
    category: 'International Standard',
    website: 'https://www.iso.org/iso-27001-information-security.html',
    color: 'green'
  },
  'SOC2-TSC': {
    source_organization: 'American Institute of CPAs (AICPA)',
    geography: 'United States',
    category: 'Audit Framework',
    color: 'purple'
  },
  'GDPR': {
    source_organization: 'European Union',
    geography: 'European Union',
    category: 'Regulatory',
    color: 'yellow'
  },
  'HIPAA': {
    source_organization: 'U.S. Department of Health & Human Services',
    geography: 'United States',
    category: 'Regulatory',
    color: 'red'
  },
  'PCI-DSS': {
    source_organization: 'Payment Card Industry Security Standards Council',
    geography: 'Global',
    category: 'Industry Standard',
    color: 'orange'
  },
  'SCF': {
    source_organization: 'Secure Controls Framework Council',
    geography: 'Global',
    category: 'Meta-Framework',
    website: 'https://securecontrolsframework.com',
    color: 'indigo'
  },
  'CIS-CSC': {
    source_organization: 'Center for Internet Security',
    geography: 'Global',
    category: 'Best Practice Framework',
    website: 'https://www.cisecurity.org/controls',
    color: 'teal'
  }
}

function getCategoryBadgeColor(category: string) {
  switch (category) {
    case 'Regulatory': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
    case 'Best Practice Framework': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
    case 'International Standard': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
    case 'Audit Framework': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
    case 'Industry Standard': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
    case 'Meta-Framework': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300'
    default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
  }
}

export default function FrameworkInfoPage() {
  const { data: frameworks = [], isLoading, error } = useFrameworks()
  const [selectedFramework, setSelectedFramework] = useState<string>('')
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const info = frameworks.find(fw => fw.id === selectedFramework) || null
  const { data: stats, isLoading: statsLoading } = useFrameworkStats(selectedFramework)
  const { data: details } = useFrameworkDetails(selectedFramework)
  const { data: hierarchy = {} } = useControlMappingsByFrameworkGrouped(selectedFramework, undefined, undefined, true, true)

  // Get metadata for selected framework
  const metadata = info ? frameworkMetadata[info.code] || frameworkMetadata[info.code.split('-')[0]] : null

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-600">Error loading frameworks: {error.message}</div>
      </div>
    )
  }

  // Get display name for a node - prefer title, clean up generic descriptions
  function getDisplayName(node: any, refCode: string): string {
    if (node.title) return node.title
    if (node.description?.startsWith('External control ')) return ''
    return node.description || ''
  }

  // Recursive render function for hierarchy
  function renderNode(node: any, key: string, level: number = 0) {
    const isOpen = expanded[key]
    const hasChildren = node.children && Object.keys(node.children).length > 0
    const refCode = node.ref_code || key
    const displayName = getDisplayName(node, refCode)
    const childCount = hasChildren ? Object.keys(node.children).length : 0

    return (
      <div key={key} style={{ marginLeft: level * 20 }}>
        <button
          className={`w-full text-left py-2.5 px-4 rounded-lg font-medium transition-all ${
            level === 0
              ? 'text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/30'
              : 'text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
          } flex items-center justify-between group`}
          onClick={() => hasChildren && setExpanded(exp => ({ ...exp, [key]: !isOpen }))}
        >
          <div className="flex items-center gap-2">
            {hasChildren && (
              <span className={`transition-transform text-gray-400 ${isOpen ? 'rotate-90' : ''}`}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </span>
            )}
            <span>{displayName ? `${displayName} (${refCode})` : refCode}</span>
          </div>
          {hasChildren && (
            <span className="text-xs text-gray-500 dark:text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
              {childCount} items
            </span>
          )}
        </button>
        {isOpen && hasChildren && (
          <div className="mt-1 space-y-1">
            {Object.entries(node.children).map(([childKey, childNode]) => renderNode(childNode, childKey, level + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Framework Information
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Explore compliance frameworks, their structure, and SCF mappings
        </p>
      </div>

      {/* Framework Selector */}
      <div className="mb-8">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Select Framework
        </label>
        <select
          className="w-full max-w-md p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          value={selectedFramework}
          onChange={e => {
            setSelectedFramework(e.target.value)
            setExpanded({})
          }}
        >
          <option value="">-- Choose a framework --</option>
          {frameworks.map(fw => (
            <option key={fw.id} value={fw.id}>
              {fw.name || fw.code} {fw.version && `(${fw.version})`}
            </option>
          ))}
        </select>
      </div>

      {info && (
        <div className="space-y-6">
          {/* Framework Overview Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {info.name || info.code}
                    </h2>
                    {metadata?.category && (
                      <span className={`px-3 py-1 text-xs font-medium rounded-full ${getCategoryBadgeColor(metadata.category)}`}>
                        {metadata.category}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {info.code} {info.version && `• Version ${info.version}`}
                  </p>
                </div>
                {metadata?.website && (
                  <a
                    href={metadata.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 text-sm flex items-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    Official Site
                  </a>
                )}
              </div>

              {info.description && (
                <p className="mt-4 text-gray-700 dark:text-gray-300">
                  {info.description}
                </p>
              )}

              {/* Metadata Grid */}
              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                {metadata?.source_organization && (
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Source Organization</p>
                      <p className="text-sm text-gray-900 dark:text-gray-100">{metadata.source_organization}</p>
                    </div>
                  </div>
                )}
                {metadata?.geography && (
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Geography</p>
                      <p className="text-sm text-gray-900 dark:text-gray-100">{metadata.geography}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Added to Platform</p>
                    <p className="text-sm text-gray-900 dark:text-gray-100">
                      {details?.created_at ? new Date(details.created_at).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Statistics Dashboard */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Controls</p>
                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">
                {statsLoading ? '...' : stats?.totalControls || info.external_control_count || 0}
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Domains</p>
                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">
                {statsLoading ? '...' : stats?.totalDomains || Object.keys(hierarchy).length || 0}
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">SCF Mappings</p>
                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">
                {statsLoading ? '...' : stats?.scfMappingCount || info.mapping_count || 0}
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Mapping Coverage</p>
                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">
                {statsLoading ? '...' : `${stats?.mappingCoverage || 0}%`}
              </p>
              {!statsLoading && stats && (
                <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${stats.mappingCoverage}%` }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Domains & Controls Hierarchy */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Domains & Controls
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Hierarchical view of all controls in this framework
              </p>
            </div>
            <div className="p-6">
              {Object.keys(hierarchy).length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="mt-2">No controls found for this framework.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {Object.entries(hierarchy).map(([key, node]) => renderNode(node, key, 0))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!selectedFramework && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
          <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-gray-100">
            Select a Framework
          </h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
            Choose a compliance framework from the dropdown above to view its details, structure, and SCF control mappings.
          </p>
        </div>
      )}
    </div>
  )
}
