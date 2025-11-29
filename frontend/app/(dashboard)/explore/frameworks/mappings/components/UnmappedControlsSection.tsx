'use client'

import { useState, useMemo } from 'react'
import { useUnmappedSecondaryControls } from '@/lib/hooks/useControlMappings'

interface UnmappedControlsSectionProps {
  primaryFrameworkId: string
  primaryFrameworkName: string
  secondaryFrameworkIds: string[]
  enabled: boolean
}

export function UnmappedControlsSection({
  primaryFrameworkId,
  primaryFrameworkName,
  secondaryFrameworkIds,
  enabled
}: UnmappedControlsSectionProps) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [sectionExpanded, setSectionExpanded] = useState(true)

  const { data: unmappedData, isLoading, error } = useUnmappedSecondaryControls(
    primaryFrameworkId,
    secondaryFrameworkIds,
    enabled
  )

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

  // Calculate total unmapped count
  const totalUnmapped = useMemo(() => {
    if (!unmappedData) return 0
    return Object.values(unmappedData).reduce((sum, fw) => sum + fw.unmappedCount, 0)
  }, [unmappedData])

  // Don't render if not enabled or no data
  if (!enabled) return null

  if (isLoading) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <div className="flex items-center gap-3">
          <div className="animate-spin h-5 w-5 border-2 border-gray-400 border-t-transparent rounded-full"></div>
          <span className="text-gray-600 dark:text-gray-400">Loading unmapped controls...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 p-4 mb-6">
        <p className="text-red-700 dark:text-red-300 text-sm">
          Error loading unmapped controls: {error.message}
        </p>
      </div>
    )
  }

  if (!unmappedData || Object.keys(unmappedData).length === 0) {
    return (
      <div className="bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800 p-4 mb-6">
        <div className="flex items-center gap-2">
          <svg className="h-5 w-5 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-green-700 dark:text-green-300 text-sm font-medium">
            All secondary framework controls have mappings to {primaryFrameworkName}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-300 dark:border-gray-600 mb-6 overflow-hidden">
      {/* Section Header */}
      <button
        onClick={() => setSectionExpanded(!sectionExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {sectionExpanded ? (
            <svg className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          ) : (
            <svg className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          )}
          <div>
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
              Unmapped Controls
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {totalUnmapped} controls from secondary frameworks without {primaryFrameworkName} mappings
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-full">
            {totalUnmapped} unmapped
          </span>
        </div>
      </button>

      {/* Section Content */}
      {sectionExpanded && (
        <div className="border-t border-gray-200 dark:border-gray-700 p-4 space-y-4">
          {Object.entries(unmappedData).map(([fwId, fwData]) => (
            <FrameworkUnmappedSection
              key={fwId}
              framework={fwData.framework}
              totalControls={fwData.totalControls}
              unmappedCount={fwData.unmappedCount}
              hierarchy={fwData.hierarchy}
              expandedItems={expandedItems}
              toggleExpand={toggleExpand}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface FrameworkUnmappedSectionProps {
  framework: { id: string; code: string; name: string; version: string }
  totalControls: number
  unmappedCount: number
  hierarchy: any
  expandedItems: Set<string>
  toggleExpand: (id: string) => void
}

function FrameworkUnmappedSection({
  framework,
  totalControls,
  unmappedCount,
  hierarchy,
  expandedItems,
  toggleExpand
}: FrameworkUnmappedSectionProps) {
  const frameworkKey = `unmapped-${framework.id}`
  const isExpanded = expandedItems.has(frameworkKey)
  const coveragePercent = Math.round(((totalControls - unmappedCount) / totalControls) * 100)

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Framework Header */}
      <button
        onClick={() => toggleExpand(frameworkKey)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {isExpanded ? (
            <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          ) : (
            <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          )}
          <div className="text-left">
            <div className="font-semibold text-gray-800 dark:text-gray-200">
              {framework.name} {framework.version}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {unmappedCount} of {totalControls} controls unmapped ({100 - coveragePercent}% gap)
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Coverage bar */}
          <div className="w-24 h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
            <div
              className="h-full bg-gray-400 dark:bg-gray-500 rounded-full"
              style={{ width: `${100 - coveragePercent}%` }}
            />
          </div>
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400 w-12 text-right">
            {unmappedCount}
          </span>
        </div>
      </button>

      {/* Hierarchy */}
      {isExpanded && (
        <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-3">
          {Object.entries(hierarchy).map(([key, node]) => (
            <UnmappedNode
              key={key}
              nodeKey={`${frameworkKey}-${key}`}
              node={node as any}
              depth={0}
              expandedItems={expandedItems}
              toggleExpand={toggleExpand}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface UnmappedNodeProps {
  nodeKey: string
  node: {
    ref_code: string
    title: string
    description: string
    isUnmapped: boolean
    isLeaf: boolean
    children: Record<string, any>
  }
  depth: number
  expandedItems: Set<string>
  toggleExpand: (id: string) => void
}

function UnmappedNode({
  nodeKey,
  node,
  depth,
  expandedItems,
  toggleExpand
}: UnmappedNodeProps) {
  const isExpanded = expandedItems.has(nodeKey)
  const hasChildren = node.children && Object.keys(node.children).length > 0
  const childCount = Object.keys(node.children || {}).length

  // Count unmapped children recursively
  const countUnmapped = (n: any): number => {
    let count = n.isUnmapped && n.isLeaf ? 1 : 0
    if (n.children) {
      Object.values(n.children).forEach((child: any) => {
        count += countUnmapped(child)
      })
    }
    return count
  }
  const unmappedInBranch = countUnmapped(node)

  // Color scheme based on depth
  const colors = [
    { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-700 dark:text-gray-300', border: 'border-gray-200 dark:border-gray-600' },
    { bg: 'bg-gray-50 dark:bg-gray-750', text: 'text-gray-600 dark:text-gray-400', border: 'border-gray-200 dark:border-gray-700' },
    { bg: 'bg-white dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-400', border: 'border-gray-200 dark:border-gray-700' },
  ]
  const colorScheme = colors[Math.min(depth, colors.length - 1)]

  return (
    <div className={depth > 0 ? 'ml-4 mt-2' : 'mt-2 first:mt-0'}>
      <div className={`rounded-md border ${colorScheme.border} ${colorScheme.bg} overflow-hidden`}>
        <button
          onClick={() => hasChildren && toggleExpand(nodeKey)}
          className={`w-full px-3 py-2 flex items-center justify-between text-left ${hasChildren ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}`}
          disabled={!hasChildren}
        >
          <div className="flex items-center gap-2 flex-1">
            {/* Chevron */}
            <div className="w-4 flex-shrink-0">
              {hasChildren && (
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

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`font-mono text-sm font-medium ${colorScheme.text}`}>
                  {node.ref_code}
                </span>
                {node.isUnmapped && node.isLeaf && (
                  <span className="px-1.5 py-0.5 text-xs bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded">
                    unmapped
                  </span>
                )}
              </div>
              {(node.title || node.description) && node.title !== node.ref_code && (
                <div className="text-xs text-gray-500 dark:text-gray-500 truncate mt-0.5">
                  {node.title || node.description}
                </div>
              )}
            </div>
          </div>

          {/* Count badge */}
          {hasChildren && (
            <span className="text-xs text-gray-500 dark:text-gray-500 ml-2">
              {unmappedInBranch} unmapped
            </span>
          )}
        </button>

        {/* Children */}
        {isExpanded && hasChildren && (
          <div className="border-t border-gray-200 dark:border-gray-700 px-2 py-2">
            {Object.entries(node.children).map(([childKey, childNode]) => (
              <UnmappedNode
                key={childKey}
                nodeKey={`${nodeKey}-${childKey}`}
                node={childNode as any}
                depth={depth + 1}
                expandedItems={expandedItems}
                toggleExpand={toggleExpand}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default UnmappedControlsSection
