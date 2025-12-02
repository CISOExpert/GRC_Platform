'use client'

import { useState } from 'react'
import { useEvidenceRequestsForControlRef } from '@/lib/hooks/useEvidenceRequests'

interface EvidenceRequestsProps {
  scfControlId?: string  // SCF ref code like "GOV-01"
  initialLimit?: number
}

export function EvidenceRequests({ scfControlId, initialLimit = 3 }: EvidenceRequestsProps) {
  const { data: evidenceRequests = [], isLoading, error } = useEvidenceRequestsForControlRef(scfControlId)
  const [showAll, setShowAll] = useState(false)

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm py-2">
        <div className="animate-spin h-4 w-4 border-2 border-amber-500 border-t-transparent rounded-full"></div>
        Loading evidence requests...
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-red-500 dark:text-red-400 text-sm py-2">
        Error loading evidence requests
      </div>
    )
  }

  if (evidenceRequests.length === 0) {
    return (
      <p className="text-gray-500 dark:text-gray-400 text-sm">
        No evidence requests linked to this control.
      </p>
    )
  }

  const displayedRequests = showAll ? evidenceRequests : evidenceRequests.slice(0, initialLimit)
  const hasMore = evidenceRequests.length > initialLimit

  return (
    <div className="space-y-3">
      {displayedRequests.map((er) => (
        <div
          key={er.id}
          className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-amber-700 dark:text-amber-300 font-mono text-sm font-semibold">
                  {er.erl_id}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">
                  {er.area_of_focus}
                </span>
              </div>
              <p className="text-sm text-gray-900 dark:text-gray-100 font-medium mt-1">
                {er.documentation_artifact}
              </p>
              {er.artifact_description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                  {er.artifact_description}
                </p>
              )}
            </div>
          </div>
        </div>
      ))}

      {hasMore && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="w-full py-2 text-sm text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 font-medium flex items-center justify-center gap-1"
        >
          {showAll ? (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
              Show less
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              Show all {evidenceRequests.length} evidence requests
            </>
          )}
        </button>
      )}
    </div>
  )
}

/**
 * Summary card showing evidence request statistics for a framework
 */
interface EvidenceRequestSummaryProps {
  totalRequests: number
  areasOfFocus: number
  isLoading?: boolean
}

export function EvidenceRequestSummary({ totalRequests, areasOfFocus, isLoading }: EvidenceRequestSummaryProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Evidence Requests</p>
        <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
      <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">
        {isLoading ? '...' : totalRequests}
      </p>
      {!isLoading && areasOfFocus > 0 && (
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {areasOfFocus} areas of focus
        </p>
      )}
    </div>
  )
}
