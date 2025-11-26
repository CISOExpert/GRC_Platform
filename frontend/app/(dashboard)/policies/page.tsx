'use client'

import { useState, useMemo } from 'react'
import { useEvidenceTemplates } from '@/lib/hooks/useEvidenceTemplates'

export default function PoliciesPage() {
  const { data: templates = [], isLoading, error } = useEvidenceTemplates()
  const [selectedArea, setSelectedArea] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState<typeof templates[0] | null>(null)

  // Compute areas from templates
  const areas = useMemo(() => {
    if (!templates.length) return []
    return [...new Set(templates.map(t => t.area_of_focus))].sort()
  }, [templates])

  // Filter templates based on area and search
  const filteredTemplates = useMemo(() => {
    let filtered = templates

    if (selectedArea) {
      filtered = filtered.filter(t => t.area_of_focus === selectedArea)
    }

    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      filtered = filtered.filter(t =>
        t.erl_id.toLowerCase().includes(search) ||
        t.artifact_name.toLowerCase().includes(search) ||
        t.area_of_focus.toLowerCase().includes(search)
      )
    }

    return filtered
  }, [templates, selectedArea, searchTerm])

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
        <div className="text-red-600">Error loading templates: {error.message}</div>
      </div>
    )
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Evidence Templates
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Browse {templates.length.toLocaleString()} evidence reference library (ERL) templates
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-xl p-6 mb-6 border border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Search */}
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Search Templates
            </label>
            <div className="relative">
              <input
                type="text"
                id="search"
                className="block w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 pl-10"
                placeholder="Search by ERL ID, artifact, or area..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Area Filter */}
          <div>
            <label htmlFor="area" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Filter by Area of Focus
            </label>
            <select
              id="area"
              className="block w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              value={selectedArea}
              onChange={(e) => setSelectedArea(e.target.value)}
            >
              <option value="">All Areas ({templates.length})</option>
              {areas.map(area => (
                <option key={area} value={area}>
                  {area} ({templates.filter(t => t.area_of_focus === area).length})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Active Filters */}
        {(selectedArea || searchTerm) && (
          <div className="mt-4 flex flex-wrap gap-2">
            {selectedArea && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-200">
                {selectedArea}
                <button
                  onClick={() => setSelectedArea('')}
                  className="ml-2 inline-flex items-center justify-center"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            )}
            {searchTerm && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-200">
                Search: {searchTerm}
                <button
                  onClick={() => setSearchTerm('')}
                  className="ml-2 inline-flex items-center justify-center"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            )}
            <span className="text-sm text-gray-500 dark:text-gray-400 self-center">
              Showing {filteredTemplates.length} of {templates.length} templates
            </span>
          </div>
        )}
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map((template) => (
          <div
            key={template.id}
            className="bg-white dark:bg-gray-800 shadow rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => setSelectedTemplate(template)}
          >
            <div className="flex items-start justify-between mb-3">
              <span className="text-sm font-mono font-medium text-indigo-600 dark:text-indigo-400">
                {template.erl_id}
              </span>
              {template.artifact_format && (
                <span className="px-2 py-0.5 text-xs font-medium rounded bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                  {template.artifact_format}
                </span>
              )}
            </div>

            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2 line-clamp-2">
              {template.artifact_name}
            </h3>

            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {template.area_of_focus}
            </p>

            {template.evidence_documentation_guidance && (
              <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3">
                {template.evidence_documentation_guidance}
              </p>
            )}

            {template.retention_period && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                  <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Retention: {template.retention_period}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Template Details Modal */}
      {selectedTemplate && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50" onClick={() => setSelectedTemplate(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {selectedTemplate.erl_id}
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{selectedTemplate.area_of_focus}</p>
                </div>
                <button
                  onClick={() => setSelectedTemplate(null)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                {selectedTemplate.artifact_name}
              </h3>

              {selectedTemplate.evidence_documentation_guidance && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Documentation Guidance</h4>
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                    {selectedTemplate.evidence_documentation_guidance}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 mb-6">
                {selectedTemplate.artifact_format && (
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Format</p>
                    <p className="text-base font-semibold text-gray-900 dark:text-gray-100">{selectedTemplate.artifact_format}</p>
                  </div>
                )}
                {selectedTemplate.retention_period && (
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Retention Period</p>
                    <p className="text-base font-semibold text-gray-900 dark:text-gray-100">{selectedTemplate.retention_period}</p>
                  </div>
                )}
              </div>

              {selectedTemplate.examples && selectedTemplate.examples.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Examples</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {selectedTemplate.examples.map((example, idx) => (
                      <li key={idx} className="text-sm text-gray-700 dark:text-gray-300">{example}</li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedTemplate.notes && (
                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Additional Notes</h4>
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                    {selectedTemplate.notes}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
