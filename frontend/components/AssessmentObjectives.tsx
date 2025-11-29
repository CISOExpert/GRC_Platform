'use client'

import { useState, useMemo } from 'react'
import { useAssessmentObjectivesBySCFId, AssessmentObjective } from '@/lib/hooks/useAssessmentObjectives'

interface AssessmentObjectivesProps {
  /** SCF control ID (e.g., "GOV-01", "AAT-01.2") */
  scfControlId: string | undefined
  /** Optional: limit number of AOs shown initially */
  initialLimit?: number
  /** Optional: class name for container */
  className?: string
}

/**
 * Displays Assessment Objectives for a given SCF control.
 * Shows the AO ID, statement, origin, and applicable frameworks.
 */
export function AssessmentObjectives({
  scfControlId,
  initialLimit = 5,
  className = ''
}: AssessmentObjectivesProps) {
  const { data: objectives = [], isLoading, error } = useAssessmentObjectivesBySCFId(scfControlId)
  const [showAll, setShowAll] = useState(false)
  const [expandedAO, setExpandedAO] = useState<string | null>(null)

  const displayedObjectives = useMemo(() => {
    if (showAll || objectives.length <= initialLimit) {
      return objectives
    }
    return objectives.slice(0, initialLimit)
  }, [objectives, showAll, initialLimit])

  if (!scfControlId) {
    return null
  }

  if (isLoading) {
    return (
      <div className={`flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm ${className}`}>
        <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
        Loading assessment objectives...
      </div>
    )
  }

  if (error) {
    return (
      <div className={`text-red-600 dark:text-red-400 text-sm ${className}`}>
        Error loading assessment objectives: {error.message}
      </div>
    )
  }

  if (objectives.length === 0) {
    return (
      <p className={`text-gray-500 dark:text-gray-400 text-sm ${className}`}>
        No assessment objectives defined for this control.
      </p>
    )
  }

  return (
    <div className={className}>
      <div className="space-y-3">
        {displayedObjectives.map((ao) => (
          <AssessmentObjectiveCard
            key={ao.id}
            objective={ao}
            isExpanded={expandedAO === ao.id}
            onToggleExpand={() => setExpandedAO(expandedAO === ao.id ? null : ao.id)}
          />
        ))}
      </div>

      {objectives.length > initialLimit && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="mt-3 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 flex items-center gap-1"
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
              Show all {objectives.length} objectives
            </>
          )}
        </button>
      )}
    </div>
  )
}

/**
 * Individual Assessment Objective card component
 */
function AssessmentObjectiveCard({
  objective,
  isExpanded,
  onToggleExpand
}: {
  objective: AssessmentObjective
  isExpanded: boolean
  onToggleExpand: () => void
}) {
  const frameworks = objective.metadata?.frameworks || []

  // Format origin for display
  const formatOrigin = (origin: string | null): { label: string; color: string } => {
    if (!origin) return { label: 'Unknown', color: 'gray' }

    if (origin.startsWith('SCF Created')) {
      return { label: 'SCF', color: 'indigo' }
    }
    if (origin.startsWith('53A_R5_')) {
      return { label: 'NIST 800-53A', color: 'blue' }
    }
    if (origin.startsWith('171A_')) {
      return { label: 'NIST 800-171A', color: 'green' }
    }
    return { label: origin.slice(0, 20), color: 'gray' }
  }

  const originInfo = formatOrigin(objective.origin)

  // Framework code to display name mapping
  const frameworkDisplayNames: Record<string, string> = {
    'SCF_BASELINE': 'SCF Baseline',
    'CMMC_L1': 'CMMC L1',
    'DHS_ZTCF': 'DHS ZTCF',
    'NIST_800_53_R5': 'NIST 800-53',
    'NIST_800_171_R2': 'NIST 800-171 R2',
    'NIST_800_171_R3': 'NIST 800-171 R3',
    'NIST_800_172': 'NIST 800-172',
  }

  return (
    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-blue-700 dark:text-blue-300 font-mono text-sm font-semibold">
            {objective.ao_id}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full bg-${originInfo.color}-100 text-${originInfo.color}-700 dark:bg-${originInfo.color}-900/40 dark:text-${originInfo.color}-300`}
                style={{
                  backgroundColor: originInfo.color === 'indigo' ? 'rgb(224 231 255)' :
                                  originInfo.color === 'blue' ? 'rgb(219 234 254)' :
                                  originInfo.color === 'green' ? 'rgb(220 252 231)' : 'rgb(243 244 246)',
                  color: originInfo.color === 'indigo' ? 'rgb(67 56 202)' :
                         originInfo.color === 'blue' ? 'rgb(29 78 216)' :
                         originInfo.color === 'green' ? 'rgb(21 128 61)' : 'rgb(55 65 81)'
                }}>
            {originInfo.label}
          </span>
        </div>
        <button
          onClick={onToggleExpand}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0"
          title={isExpanded ? 'Collapse' : 'Expand'}
        >
          <svg
            className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Statement - always visible, truncated if not expanded */}
      <p className={`text-sm text-gray-700 dark:text-gray-300 mt-2 ${!isExpanded && 'line-clamp-2'}`}>
        {objective.statement}
      </p>

      {/* Expanded details */}
      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-700 space-y-3">
          {/* Frameworks */}
          {frameworks.length > 0 && (
            <div>
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Applicable Frameworks
              </span>
              <div className="flex flex-wrap gap-1 mt-1">
                {frameworks.map((fw) => (
                  <span
                    key={fw}
                    className="text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                  >
                    {frameworkDisplayNames[fw] || fw}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Expected Evidence */}
          {objective.evidence_expected && (
            <div>
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Expected Evidence
              </span>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {objective.evidence_expected}
              </p>
            </div>
          )}

          {/* Assessment Procedure */}
          {objective.assessment_procedure && (
            <div>
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Assessment Procedure
              </span>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {objective.assessment_procedure}
              </p>
            </div>
          )}

          {/* Asset Type */}
          {objective.asset_type && (
            <div>
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Asset Type
              </span>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {objective.asset_type}
              </p>
            </div>
          )}

          {/* Notes */}
          {objective.notes && (
            <div>
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Notes
              </span>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 italic">
                {objective.notes}
              </p>
            </div>
          )}

          {/* Full Origin */}
          {objective.origin && objective.origin !== originInfo.label && (
            <div>
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Origin Reference
              </span>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1 font-mono">
                {objective.origin}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default AssessmentObjectives
