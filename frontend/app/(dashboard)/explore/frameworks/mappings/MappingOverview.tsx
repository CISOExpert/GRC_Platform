import React from 'react'

interface MappingOverviewProps {
  viewMode: 'scf' | 'framework' | 'compact' | 'expanded' // Support both old and new for compatibility
  primaryFrameworkName: string
  comparedFrameworks: Array<{ id: string; name: string; count: number; uniqueControls?: number }>
  totalControls: number
  controlsWithMappings: number
  totalMappings: number
  controlsWithoutMappings?: number
  selectedFrameworkCount?: number // Actual number of frameworks selected, not just those with mappings
}

interface TooltipProps {
  content: React.ReactNode
  children: React.ReactNode
}

function Tooltip({ content, children }: TooltipProps) {
  const [isVisible, setIsVisible] = React.useState(false)

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        className="cursor-help"
      >
        {children}
      </div>
      {isVisible && (
        <div className="absolute z-50 w-80 p-3 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg shadow-xl -top-2 left-full ml-2 pointer-events-none">
          <div className="absolute -left-1 top-3 w-2 h-2 bg-gray-900 dark:bg-gray-700 transform rotate-45"></div>
          {content}
        </div>
      )}
    </div>
  )
}

export function MappingOverview({
  viewMode,
  primaryFrameworkName,
  comparedFrameworks,
  totalControls,
  controlsWithMappings,
  totalMappings,
  controlsWithoutMappings,
  selectedFrameworkCount
}: MappingOverviewProps) {
  const coveragePercentage = totalControls > 0 
    ? Math.round((controlsWithMappings / totalControls) * 100) 
    : 0

  // Use selectedFrameworkCount if provided, otherwise fall back to comparedFrameworks length
  const frameworkCount = selectedFrameworkCount ?? comparedFrameworks.length

  // Check if the primary framework is SCF
  const isPrimarySCF = primaryFrameworkName.includes('Secure Controls Framework')

  // Generate narrative summary
  const narrativeSummary = isPrimarySCF
    ? `Viewing ${totalControls.toLocaleString()} SCF controls. Of these, ${controlsWithMappings.toLocaleString()} controls have mappings to your ${frameworkCount} selected framework${frameworkCount !== 1 ? 's' : ''}, creating ${totalMappings.toLocaleString()} total mapping relationships${controlsWithoutMappings ? `, leaving ${controlsWithoutMappings.toLocaleString()} controls without mappings (coverage gaps)` : ''}.`
    : `Viewing ${totalControls.toLocaleString()} controls from ${primaryFrameworkName}. ${controlsWithMappings.toLocaleString()} of these have mappings${frameworkCount > 0 ? ` to ${frameworkCount} other framework${frameworkCount !== 1 ? 's' : ''}` : ''}${totalMappings > 0 ? `, totaling ${totalMappings.toLocaleString()} mapping relationships` : ''}.`

  return (
    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800 p-6 mb-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Mapping Overview
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {isPrimarySCF ? (
              <>Viewing <span className="font-medium text-indigo-600 dark:text-indigo-400">SCF controls</span> mapped against {comparedFrameworks.length} framework{comparedFrameworks.length !== 1 ? 's' : ''}</>
            ) : (
              <>Viewing <span className="font-medium text-indigo-600 dark:text-indigo-400">{primaryFrameworkName}</span> mapped against {comparedFrameworks.length > 0 ? `${comparedFrameworks.length} framework${comparedFrameworks.length !== 1 ? 's' : ''}` : 'SCF controls'}</>
            )}
          </p>
        </div>
        
        {/* Coverage Badge */}
        <div className="flex items-center gap-2">
          <div className="text-right">
            <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
              {coveragePercentage}%
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Coverage
            </div>
          </div>
        </div>
      </div>

      {/* Narrative Summary */}
      <div className="mb-4 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <p className="text-sm text-gray-700 dark:text-gray-300">
          {narrativeSummary}
        </p>
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-1 mb-1">
            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase">
              Total Controls
            </div>
            <Tooltip content={
              <div>
                <div className="font-semibold mb-1">Total Controls</div>
                <div>The complete set of {viewMode === 'scf' ? 'SCF security controls' : `${primaryFrameworkName} controls`} visible in this view.</div>
                {viewMode === 'scf' && (
                  <div className="mt-2 text-gray-300">
                    Note: SCF has 1,420 total controls. This number shows controls visible based on your current filters.
                  </div>
                )}
              </div>
            }>
              <svg className="h-3 w-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </Tooltip>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {totalControls.toLocaleString()}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-1 mb-1">
            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase">
              With Mappings
            </div>
            <Tooltip content={
              <div>
                <div className="font-semibold mb-1">Controls With Mappings</div>
                <div>The number of {viewMode === 'scf' ? 'SCF' : primaryFrameworkName} controls that have at least one mapping relationship to your selected frameworks.</div>
                <div className="mt-2 text-gray-300">
                  <strong>What's a mapping?</strong> A mapping is a relationship showing that two controls address the same or similar security requirement. One control can map to multiple framework controls.
                </div>
                <div className="mt-2 text-gray-300">
                  Example: SCF control AAT-01 might map to NIST CSF PR.IR-04, ISO 27002 8.6, and CIS Control 5.4 (3 mappings to 1 control).
                </div>
              </div>
            }>
              <svg className="h-3 w-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </Tooltip>
          </div>
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {controlsWithMappings.toLocaleString()}
          </div>
        </div>

        {controlsWithoutMappings !== undefined && controlsWithoutMappings > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-1 mb-1">
              <div className="text-xs text-gray-500 dark:text-gray-400 uppercase">
                Without Mappings
              </div>
              <Tooltip content={
                <div>
                  <div className="font-semibold mb-1">Controls Without Mappings</div>
                  <div>These are {viewMode === 'scf' ? 'SCF' : primaryFrameworkName} controls that have NO mappings to any of your selected frameworks.</div>
                  <div className="mt-2 text-gray-300">
                    <strong>Why this matters:</strong> These represent coverage gaps - security requirements not addressed by your selected frameworks. Use this to identify areas where additional controls or frameworks may be needed.
                  </div>
                  <div className="mt-2 text-gray-300">
                    Tip: Add more frameworks to reduce this number and improve coverage.
                  </div>
                </div>
              }>
                <svg className="h-3 w-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </Tooltip>
            </div>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {controlsWithoutMappings.toLocaleString()}
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-1 mb-1">
            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase">
              Total Mappings
            </div>
            <Tooltip content={
              <div>
                <div className="font-semibold mb-1">Total Mapping Relationships</div>
                <div>The sum of all mapping relationships between controls. This number is typically higher than "With Mappings" because:</div>
                <ul className="mt-2 space-y-1 text-gray-300 list-disc list-inside">
                  <li><strong>One-to-Many:</strong> One SCF control can map to multiple framework controls</li>
                  <li><strong>Overlapping Coverage:</strong> Controls may map to requirements across multiple frameworks</li>
                  <li><strong>Granularity Differences:</strong> Some frameworks are more detailed than others</li>
                </ul>
                <div className="mt-2 text-gray-300">
                  <strong>Order doesn't matter:</strong> Selecting frameworks in different order produces the same result - mappings are additive, not sequential.
                </div>
              </div>
            }>
              <svg className="h-3 w-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </Tooltip>
          </div>
          <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
            {totalMappings.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Framework Breakdown */}
      {comparedFrameworks.length > 0 && (
        <div className="border-t border-indigo-200 dark:border-indigo-800 pt-4">
          <div className="flex items-center gap-1 mb-3">
            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
              Mappings by Framework
            </div>
            <Tooltip content={
              <div>
                <div className="font-semibold mb-1">Framework Breakdown</div>
                <div>Shows how many mapping relationships each framework contributes and how many unique {viewMode === 'scf' ? 'SCF' : 'framework'} controls are covered.</div>
                <div className="mt-2 text-gray-300">
                  <strong>Metrics explained:</strong>
                </div>
                <ul className="mt-1 space-y-1 text-gray-300 list-disc list-inside">
                  <li><strong>Total Mappings</strong> (blue): All mapping relationships for this framework</li>
                  <li><strong>Unique Controls</strong> (green): Distinct {viewMode === 'scf' ? 'SCF' : 'framework'} controls covered</li>
                </ul>
                <div className="mt-2 text-gray-300">
                  <strong>Why counts vary:</strong>
                </div>
                <ul className="mt-1 space-y-1 text-gray-300 list-disc list-inside">
                  <li><strong>Granularity:</strong> Some frameworks have more detailed controls (higher mapping count)</li>
                  <li><strong>Scope:</strong> Some frameworks cover more security domains (higher control count)</li>
                  <li><strong>Overlap:</strong> Many controls map to multiple frameworks simultaneously</li>
                </ul>
                <div className="mt-2 text-gray-300">
                  Example: ISO 27002 might have 506 mappings covering 316 unique SCF controls - averaging 1.6 mappings per control.
                </div>
              </div>
            }>
              <svg className="h-3 w-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </Tooltip>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {comparedFrameworks.map((fw) => (
              <div 
                key={fw.id}
                className="bg-white dark:bg-gray-800 rounded px-3 py-2 border border-gray-200 dark:border-gray-700"
              >
                <div className="text-sm text-gray-700 dark:text-gray-300 truncate mb-1 font-medium">
                  {fw.name}
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-500 dark:text-gray-400">Mappings:</span>
                    <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                      {fw.count.toLocaleString()}
                    </span>
                  </div>
                  {fw.uniqueControls !== undefined && (
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-gray-500 dark:text-gray-400">Controls:</span>
                      <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                        {fw.uniqueControls.toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
