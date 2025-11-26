'use client'

import { useState, useMemo } from 'react'
import { useSCFControls } from '@/lib/hooks/useSCFControls'

export default function FrameworksPage() {
  const { data: controls = [], isLoading, error } = useSCFControls()
  const [selectedDomain, setSelectedDomain] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedControl, setSelectedControl] = useState<typeof controls[0] | null>(null)

  // Compute domains from controls
  const domains = useMemo(() => {
    if (!controls.length) return []
    return [...new Set(controls.map(c => c.domain))].sort()
  }, [controls])

  // Filter controls based on domain and search
  const filteredControls = useMemo(() => {
    let filtered = controls

    if (selectedDomain) {
      filtered = filtered.filter(c => c.domain === selectedDomain)
    }

    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      filtered = filtered.filter(c =>
        c.control_id.toLowerCase().includes(search) ||
        c.title.toLowerCase().includes(search) ||
        c.description.toLowerCase().includes(search)
      )
    }

    return filtered
  }, [controls, selectedDomain, searchTerm])

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
        <div className="text-red-600">Error loading controls: {error.message}</div>
      </div>
    )
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          SCF Controls Explorer
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Browse and search {controls.length.toLocaleString()} Secure Controls Framework controls
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-xl p-6 mb-6 border border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Search */}
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Search Controls
            </label>
            <div className="relative">
              <input
                type="text"
                id="search"
                className="block w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 pl-10"
                placeholder="Search by ID, title, or description..."
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

          {/* Domain Filter */}
          <div>
            <label htmlFor="domain" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Filter by Domain
            </label>
            <select
              id="domain"
              className="block w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              value={selectedDomain}
              onChange={(e) => setSelectedDomain(e.target.value)}
            >
              <option value="">All Domains ({controls.length})</option>
              {domains.map(domain => (
                <option key={domain} value={domain}>
                  {domain} ({controls.filter(c => c.domain === domain).length})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Active Filters */}
        {(selectedDomain || searchTerm) && (
          <div className="mt-4 flex flex-wrap gap-2">
            {selectedDomain && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-200">
                {selectedDomain}
                <button
                  onClick={() => setSelectedDomain('')}
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
              Showing {filteredControls.length} of {controls.length} controls
            </span>
          </div>
        )}
      </div>

      {/* Controls List */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Control ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Domain
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  PPTDF
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Weight
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredControls.map((control) => {
                const pptdf = []
                if (control.applicability_people) pptdf.push('P')
                if (control.applicability_processes) pptdf.push('Pr')
                if (control.applicability_technology) pptdf.push('T')
                if (control.applicability_data) pptdf.push('D')
                if (control.applicability_facilities) pptdf.push('F')

                return (
                  <tr key={control.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
                          {control.control_id}
                        </span>
                        {control.is_mcr && (
                          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200">
                            MCR
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 dark:text-gray-100 max-w-md truncate">
                        {control.title}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
                        {control.domain}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex gap-1">
                        {pptdf.map(tag => (
                          <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-gray-100">
                        {control.weight.toFixed(2)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => setSelectedControl(control)}
                        className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Control Details Modal */}
      {selectedControl && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50" onClick={() => setSelectedControl(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {selectedControl.control_id}
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{selectedControl.domain}</p>
                </div>
                <button
                  onClick={() => setSelectedControl(null)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                {selectedControl.title}
              </h3>

              <p className="text-sm text-gray-700 dark:text-gray-300 mb-6 leading-relaxed">
                {selectedControl.description}
              </p>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Weight</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{selectedControl.weight.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Classification</p>
                  <div className="flex gap-2 mt-1">
                    {selectedControl.is_mcr && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200">
                        MCR
                      </span>
                    )}
                    {selectedControl.is_dsr && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200">
                        DSR
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Framework Mappings */}
              {(selectedControl.nist_800_53 || selectedControl.iso_27001 || selectedControl.pci_dss) && (
                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">Framework Mappings</h4>
                  <div className="space-y-2">
                    {selectedControl.nist_800_53 && (
                      <div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">NIST 800-53:</span>
                        <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">{selectedControl.nist_800_53}</span>
                      </div>
                    )}
                    {selectedControl.iso_27001 && (
                      <div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">ISO 27001:</span>
                        <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">{selectedControl.iso_27001}</span>
                      </div>
                    )}
                    {selectedControl.pci_dss && (
                      <div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">PCI DSS:</span>
                        <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">{selectedControl.pci_dss}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
