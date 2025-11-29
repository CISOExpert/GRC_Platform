'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useOrganization } from '@/lib/hooks/useOrganizations'
import {
  useAvailableFrameworksForOrg,
  useAddOrganizationFramework,
  useRemoveOrganizationFramework,
  useUpdateOrganizationFramework,
  useReorderOrganizationFrameworks,
  SelectionStatus
} from '@/lib/hooks/useFrameworks'
import { useOrganizationContext, OrganizationFramework } from '@/lib/contexts/OrganizationContext'
import Link from 'next/link'

// Drag and drop types
type DragItem = {
  id: string
  index: number
  status: SelectionStatus
}

function FrameworkCard({
  framework,
  index,
  onRemove,
  onUpdateStatus,
  onTogglePrimary,
  onDragStart,
  onDragOver,
  onDrop,
  isDragging,
}: {
  framework: OrganizationFramework
  index: number
  onRemove: (id: string) => void
  onUpdateStatus: (id: string, status: SelectionStatus) => void
  onTogglePrimary: (id: string, isPrimary: boolean) => void
  onDragStart: (e: React.DragEvent, item: DragItem) => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent, targetIndex: number, status: SelectionStatus) => void
  isDragging: boolean
}) {
  const isEvaluating = framework.selection_status === 'evaluating'

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, { id: framework.id, index, status: framework.selection_status })}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, index, framework.selection_status)}
      className={`bg-white dark:bg-gray-800 shadow rounded-xl p-5 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all cursor-move ${
        isDragging ? 'opacity-50' : ''
      } ${isEvaluating ? 'border-l-4 border-l-amber-400' : ''}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
              {framework.framework_code}
            </h3>
            {framework.is_primary && (
              <span className="px-2 py-0.5 text-xs font-medium rounded bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-200">
                PRIMARY
              </span>
            )}
            {isEvaluating && (
              <span className="px-2 py-0.5 text-xs font-medium rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                EVALUATING
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
            {framework.framework_name}
          </p>
        </div>
        <div className="flex items-center gap-1 ml-2">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onRemove(framework.id)
            }}
            className="p-1.5 text-gray-400 hover:text-red-500 rounded transition-colors"
            title="Remove framework"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-2 text-center">
          <span className="font-semibold text-gray-900 dark:text-gray-100">{framework.external_control_count}</span>
          <span className="text-gray-500 dark:text-gray-400 ml-1">controls</span>
        </div>
        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-2 text-center">
          <span className="font-semibold text-gray-900 dark:text-gray-100">{framework.mapping_count}</span>
          <span className="text-gray-500 dark:text-gray-400 ml-1">mappings</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 border-t border-gray-200 dark:border-gray-700 pt-3">
        <select
          value={framework.selection_status}
          onChange={(e) => onUpdateStatus(framework.id, e.target.value as SelectionStatus)}
          className="flex-1 text-sm rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 py-1.5"
        >
          <option value="active">Active</option>
          <option value="evaluating">Evaluating</option>
        </select>
        <button
          onClick={() => onTogglePrimary(framework.id, framework.is_primary)}
          className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
            framework.is_primary
              ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'
          }`}
        >
          {framework.is_primary ? 'Primary' : 'Set Primary'}
        </button>
      </div>
    </div>
  )
}

export default function OrganizationFrameworkSettingsPage() {
  const router = useRouter()
  const params = useParams()
  const orgId = params.id as string

  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedFrameworkId, setSelectedFrameworkId] = useState('')
  const [selectionStatus, setSelectionStatus] = useState<SelectionStatus>('active')
  const [isPrimary, setIsPrimary] = useState(false)
  const [draggedItem, setDraggedItem] = useState<DragItem | null>(null)

  // Fetch organization details
  const { data: organization, isLoading: orgLoading } = useOrganization(orgId)

  // Use the organization context for frameworks
  const {
    selectedFrameworks,
    activeFrameworks,
    evaluatingFrameworks,
    isLoadingFrameworks,
    refetchFrameworks
  } = useOrganizationContext()

  // Available frameworks (not yet selected)
  const { data: availableFrameworks = [], isLoading: availableLoading } = useAvailableFrameworksForOrg(orgId)

  // Mutations
  const addFramework = useAddOrganizationFramework()
  const removeFramework = useRemoveOrganizationFramework()
  const updateFramework = useUpdateOrganizationFramework()
  const reorderFrameworks = useReorderOrganizationFrameworks()

  const loading = orgLoading || isLoadingFrameworks || availableLoading

  // Handle adding a framework
  async function handleAddFramework() {
    if (!selectedFrameworkId || !orgId) return

    try {
      await addFramework.mutateAsync({
        organization_id: orgId,
        framework_id: selectedFrameworkId,
        is_primary: isPrimary,
        selection_status: selectionStatus,
        compliance_status: 'not_started'
      })

      setShowAddModal(false)
      setSelectedFrameworkId('')
      setSelectionStatus('active')
      setIsPrimary(false)
      refetchFrameworks()
    } catch (error: any) {
      alert(`Error: ${error.message}`)
    }
  }

  // Handle removing a framework
  async function handleRemoveFramework(id: string) {
    if (!confirm('Remove this framework from the organization?')) return

    try {
      await removeFramework.mutateAsync({ id, orgId })
      refetchFrameworks()
    } catch (error: any) {
      alert(`Error: ${error.message}`)
    }
  }

  // Handle status change
  async function handleUpdateStatus(id: string, status: SelectionStatus) {
    try {
      await updateFramework.mutateAsync({
        id,
        orgId,
        updates: { selection_status: status }
      })
      refetchFrameworks()
    } catch (error: any) {
      alert(`Error: ${error.message}`)
    }
  }

  // Handle primary toggle
  async function handleTogglePrimary(id: string, currentPrimary: boolean) {
    try {
      await updateFramework.mutateAsync({
        id,
        orgId,
        updates: { is_primary: !currentPrimary }
      })
      refetchFrameworks()
    } catch (error: any) {
      alert(`Error: ${error.message}`)
    }
  }

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, item: DragItem) => {
    setDraggedItem(item)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = async (e: React.DragEvent, targetIndex: number, targetStatus: SelectionStatus) => {
    e.preventDefault()
    if (!draggedItem) return

    // Get frameworks of the same status
    const frameworksInStatus = targetStatus === 'active' ? activeFrameworks : evaluatingFrameworks

    // Calculate new order
    const newOrder = [...frameworksInStatus]
    const draggedIndex = newOrder.findIndex(f => f.id === draggedItem.id)

    if (draggedIndex !== -1) {
      const [removed] = newOrder.splice(draggedIndex, 1)
      newOrder.splice(targetIndex, 0, removed)

      try {
        await reorderFrameworks.mutateAsync({
          orgId,
          orderedIds: newOrder.map(f => f.id)
        })
        refetchFrameworks()
      } catch (error: any) {
        console.error('Reorder error:', error)
      }
    }

    setDraggedItem(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  // Filter available frameworks that haven't been selected yet
  const unselectedFrameworks = availableFrameworks.filter(f => !f.is_selected)

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/organizations"
          className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 mb-2 inline-block"
        >
          ← Back to Organizations
        </Link>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Framework Selection
            </h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Manage compliance frameworks for <span className="font-medium">{organization?.name}</span>
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            disabled={unselectedFrameworks.length === 0}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            + Add Framework
          </button>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
        <div className="flex">
          <svg className="h-5 w-5 text-blue-500 mr-2 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-sm text-blue-800 dark:text-blue-200">
            <p className="font-medium mb-1">Framework Selection Guide</p>
            <ul className="list-disc list-inside space-y-1 text-blue-700 dark:text-blue-300">
              <li><strong>Active</strong> frameworks are your current compliance requirements - they appear in your sidebar and dashboard</li>
              <li><strong>Evaluating</strong> frameworks are ones you're considering but haven't committed to yet - they appear dimmed</li>
              <li>Drag and drop to reorder frameworks within each section</li>
              <li>Set one framework as <strong>Primary</strong> to highlight it in views</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Active Frameworks Section */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-green-500"></span>
          Active Frameworks
          <span className="text-sm font-normal text-gray-500">({activeFrameworks.length})</span>
        </h2>

        {activeFrameworks.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeFrameworks.map((fw, index) => (
              <FrameworkCard
                key={fw.id}
                framework={fw}
                index={index}
                onRemove={handleRemoveFramework}
                onUpdateStatus={handleUpdateStatus}
                onTogglePrimary={handleTogglePrimary}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                isDragging={draggedItem?.id === fw.id}
              />
            ))}
          </div>
        ) : (
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700 p-8 text-center">
            <p className="text-gray-500 dark:text-gray-400">No active frameworks. Add a framework to get started.</p>
          </div>
        )}
      </div>

      {/* Evaluating Frameworks Section */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-amber-400"></span>
          Evaluating
          <span className="text-sm font-normal text-gray-500">({evaluatingFrameworks.length})</span>
        </h2>

        {evaluatingFrameworks.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {evaluatingFrameworks.map((fw, index) => (
              <FrameworkCard
                key={fw.id}
                framework={fw}
                index={index}
                onRemove={handleRemoveFramework}
                onUpdateStatus={handleUpdateStatus}
                onTogglePrimary={handleTogglePrimary}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                isDragging={draggedItem?.id === fw.id}
              />
            ))}
          </div>
        ) : (
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700 p-6 text-center">
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              No frameworks being evaluated. Add frameworks as "Evaluating" to explore them without committing.
            </p>
          </div>
        )}
      </div>

      {/* Add Framework Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-500/75 dark:bg-gray-900/80 flex items-center justify-center p-4 z-50" onClick={() => setShowAddModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  Add Framework
                </h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                {/* Framework Select */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Select Framework *
                  </label>
                  <select
                    value={selectedFrameworkId}
                    onChange={(e) => setSelectedFrameworkId(e.target.value)}
                    className="block w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  >
                    <option value="">Choose a framework...</option>
                    {unselectedFrameworks.map(fw => (
                      <option key={fw.id} value={fw.id}>
                        {fw.code} - {fw.name} ({fw.external_control_count} controls)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status Select */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Status
                  </label>
                  <div className="flex gap-3">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="status"
                        value="active"
                        checked={selectionStatus === 'active'}
                        onChange={() => setSelectionStatus('active')}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Active</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="status"
                        value="evaluating"
                        checked={selectionStatus === 'evaluating'}
                        onChange={() => setSelectionStatus('evaluating')}
                        className="h-4 w-4 text-amber-600 focus:ring-amber-500"
                      />
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Evaluating</span>
                    </label>
                  </div>
                </div>

                {/* Primary Checkbox */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isPrimary"
                    checked={isPrimary}
                    onChange={(e) => setIsPrimary(e.target.checked)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isPrimary" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                    Set as primary framework
                  </label>
                </div>

                {/* Preview Info */}
                {selectedFrameworkId && (
                  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 space-y-2">
                    {(() => {
                      const fw = unselectedFrameworks.find(f => f.id === selectedFrameworkId)
                      if (!fw) return null
                      return (
                        <>
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{fw.name}</p>
                          <div className="flex gap-4 text-sm text-gray-600 dark:text-gray-400">
                            <span>{fw.external_control_count} controls</span>
                            <span>{fw.mapping_count} SCF mappings</span>
                          </div>
                          {fw.description && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{fw.description}</p>
                          )}
                        </>
                      )
                    })()}
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddFramework}
                  disabled={!selectedFrameworkId || addFramework.isPending}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {addFramework.isPending ? 'Adding...' : 'Add Framework'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
