'use client'

import Link from 'next/link'
import { useOrganizationContext, OrganizationFramework } from '@/lib/contexts/OrganizationContext'

// Colors for frameworks - cycle through these based on index
const frameworkColors = [
  { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-500', bar: 'bg-blue-500' },
  { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-500', bar: 'bg-purple-500' },
  { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-500', bar: 'bg-emerald-500' },
  { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-500', bar: 'bg-amber-500' },
  { bg: 'bg-rose-100 dark:bg-rose-900/30', text: 'text-rose-600 dark:text-rose-400', border: 'border-rose-500', bar: 'bg-rose-500' },
  { bg: 'bg-cyan-100 dark:bg-cyan-900/30', text: 'text-cyan-600 dark:text-cyan-400', border: 'border-cyan-500', bar: 'bg-cyan-500' },
]

// Evaluating status gets a muted style
const evaluatingStyle = {
  bg: 'bg-gray-100 dark:bg-gray-800',
  text: 'text-gray-500 dark:text-gray-400',
  border: 'border-gray-400',
  bar: 'bg-gray-400'
}

function FrameworkCard({
  framework,
  colorIndex,
  isEvaluating = false
}: {
  framework: OrganizationFramework
  colorIndex: number
  isEvaluating?: boolean
}) {
  const colors = isEvaluating ? evaluatingStyle : frameworkColors[colorIndex % frameworkColors.length]

  // Calculate coverage percentage based on SCF mappings
  // mapping_count = number of SCF controls that map to this framework's controls
  // This gives us an idea of how well-covered the framework is by SCF
  const coverage = framework.external_control_count > 0
    ? Math.min(100, Math.round((framework.mapping_count / framework.external_control_count) * 100))
    : 0

  return (
    <Link
      href={`/explore/frameworks/mappings?primary=${framework.framework_id}`}
      className="group"
    >
      <div className={`bg-white dark:bg-gray-800 overflow-hidden shadow-lg rounded-xl hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-gray-700 group-hover:${colors.border} ${isEvaluating ? 'opacity-75' : ''}`}>
        <div className="p-5">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-lg font-bold text-gray-900 dark:text-gray-100 truncate">
                  {framework.framework_code}
                </p>
                {isEvaluating && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                    Evaluating
                  </span>
                )}
                {framework.is_primary && !isEvaluating && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400">
                    Primary
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5">
                {framework.framework_name}
              </p>
            </div>
            <div className={`h-10 w-10 ${colors.bg} rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform flex-shrink-0 ml-2`}>
              <svg className={`h-5 w-5 ${colors.text}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="text-center p-2 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {framework.external_control_count.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Controls</p>
            </div>
            <div className="text-center p-2 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {framework.mapping_count.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">SCF Mappings</p>
            </div>
          </div>

          {/* Coverage Progress */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-600 dark:text-gray-400">SCF Coverage</span>
              <span className={`font-medium ${colors.text}`}>{coverage}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className={`${colors.bar} h-2 rounded-full transition-all duration-500`}
                style={{ width: `${coverage}%` }}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 dark:bg-gray-900/50 px-5 py-2 border-t border-gray-200 dark:border-gray-700">
          <p className={`text-xs ${colors.text} font-medium`}>
            View Mappings →
          </p>
        </div>
      </div>
    </Link>
  )
}

export default function FrameworkCoverageCards() {
  const {
    currentOrgId,
    activeFrameworks,
    evaluatingFrameworks,
    isLoadingFrameworks
  } = useOrganizationContext()

  // Don't show if no org selected or no frameworks
  if (!currentOrgId) {
    return null
  }

  const hasFrameworks = activeFrameworks.length > 0 || evaluatingFrameworks.length > 0

  if (isLoadingFrameworks) {
    return (
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          My Frameworks
        </h2>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 animate-pulse">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-20 mb-2" />
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32" />
                </div>
                <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-lg" />
              </div>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded-lg" />
                <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded-lg" />
              </div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!hasFrameworks) {
    return (
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          My Frameworks
        </h2>
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl p-6 border border-indigo-200 dark:border-indigo-800">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="h-6 w-6 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-base font-medium text-gray-900 dark:text-gray-100">
                No Frameworks Selected
              </h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Add compliance frameworks to your organization to track coverage and see them here.
              </p>
              <Link
                href={`/organizations/${currentOrgId}/frameworks`}
                className="mt-3 inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
              >
                <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Select Frameworks
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          My Frameworks
        </h2>
        <Link
          href={`/organizations/${currentOrgId}/frameworks`}
          className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium"
        >
          Manage →
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {/* Active frameworks first */}
        {activeFrameworks.map((fw, index) => (
          <FrameworkCard
            key={fw.id}
            framework={fw}
            colorIndex={index}
          />
        ))}

        {/* Then evaluating frameworks */}
        {evaluatingFrameworks.map((fw, index) => (
          <FrameworkCard
            key={fw.id}
            framework={fw}
            colorIndex={activeFrameworks.length + index}
            isEvaluating
          />
        ))}
      </div>
    </div>
  )
}
