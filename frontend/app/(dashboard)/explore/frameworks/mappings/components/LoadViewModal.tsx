'use client'

import { useSavedViews, useDeleteSavedView, type SavedView } from '@/lib/hooks/useSavedViews'
import { formatDistanceToNow } from 'date-fns'

type LoadViewModalProps = {
  isOpen: boolean
  onClose: () => void
  onLoadView: (view: SavedView) => void
}

export function LoadViewModal({ isOpen, onClose, onLoadView }: LoadViewModalProps) {
  const { data: savedViews = [], isLoading } = useSavedViews()
  const deleteView = useDeleteSavedView()

  if (!isOpen) return null

  const handleDelete = async (viewId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Delete this saved view?')) return
    
    try {
      await deleteView.mutateAsync(viewId)
    } catch (error) {
      console.error('Error deleting view:', error)
    }
  }

  return (
    <div 
      className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Load Saved View
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
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Loading views...</p>
            </div>
          ) : savedViews.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-gray-100">
                No saved views
              </h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Save your current view configuration to access it later.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {savedViews.map((view) => (
                <div
                  key={view.id}
                  onClick={() => {
                    onLoadView(view)
                    onClose()
                  }}
                  className="p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-indigo-500 dark:hover:border-indigo-500 cursor-pointer transition-colors group"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                        {view.view_name}
                      </h3>
                      <div className="mt-1 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                        <span className="inline-flex items-center px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                          {view.configuration.displayMode === 'compact' ? 'Compact' : 'Expanded'}
                        </span>
                        <span>
                          {formatDistanceToNow(new Date(view.created_at), { addSuffix: true })}
                        </span>
                        {view.configuration.additionalFrameworks?.length > 0 && (
                          <span>
                            {view.configuration.additionalFrameworks.length} framework{view.configuration.additionalFrameworks.length > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleDelete(view.id, e)}
                      className="ml-4 p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Delete view"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
