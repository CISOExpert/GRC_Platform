'use client'

import { useState } from 'react'
import { useCreateSavedView } from '@/lib/hooks/useSavedViews'

type SaveViewModalProps = {
  isOpen: boolean
  onClose: () => void
  configuration: {
    primaryFramework: string
    displayMode: 'compact' | 'expanded'
    compareToFramework: string
    additionalFrameworks: string[]
    searchQuery: string
    showFilterPanel: boolean
    filterPanelWidth: number
  }
}

export function SaveViewModal({ isOpen, onClose, configuration }: SaveViewModalProps) {
  const [viewName, setViewName] = useState('')
  const [selectedOrg, setSelectedOrg] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const createView = useCreateSavedView()

  if (!isOpen) return null

  const handleSave = async () => {
    if (!viewName.trim()) {
      setError('Please enter a view name')
      return
    }

    try {
      setError(null)
      await createView.mutateAsync({
        organization_id: selectedOrg || null,
        view_name: viewName,
        view_type: 'framework-comparison', // Unified view type
        configuration
      })
      
      setViewName('')
      setSelectedOrg('')
      onClose()
    } catch (error: any) {
      console.error('Error saving view:', error)
      setError(error?.message || 'Failed to save view. Please try again.')
    }
  }

  return (
    <div 
      className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Save Current View
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                View Name *
              </label>
              <input
                type="text"
                value={viewName}
                onChange={(e) => setViewName(e.target.value)}
                placeholder="e.g., NIST CSF Compliance View"
                className="block w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                autoFocus
              />
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Saving:</strong> {configuration.displayMode === 'compact' ? 'Compact' : 'Expanded'} view
                {configuration.additionalFrameworks.length > 0 && (
                  <> with {configuration.additionalFrameworks.length} additional framework{configuration.additionalFrameworks.length > 1 ? 's' : ''}</>
                )}
              </p>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!viewName.trim() || createView.isPending}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {createView.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-r-transparent"></div>
                  Saving...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                  Save View
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
