'use client'

import { useState, useMemo, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { useOrganization } from '@/lib/hooks/useOrganizations'
import { useOrganizationContext } from '@/lib/contexts/OrganizationContext'
import {
  useFrameworks,
  useOrganizationFrameworks,
  useAddOrganizationFramework,
  useRemoveOrganizationFramework,
  useUpdateOrganizationFramework,
  SelectionStatus
} from '@/lib/hooks/useFrameworks'

function OrganizationFrameworksContent() {
  const router = useRouter()

  // Use the shared organization context (same as TopNav)
  const { currentOrgId: orgId } = useOrganizationContext()

  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedFrameworkId, setSelectedFrameworkId] = useState('')
  const [isPrimary, setIsPrimary] = useState(false)
  const [selectionStatus, setSelectionStatus] = useState<SelectionStatus>('active')

  // Fetch data with React Query
  const { data: organization, isLoading: orgLoading } = useOrganization(orgId || '')
  const { data: frameworks = [], isLoading: fwLoading } = useFrameworks()
  const { data: orgFrameworks = [], isLoading: orgFwLoading } = useOrganizationFrameworks(orgId || '')

  // Mutations
  const addFramework = useAddOrganizationFramework()
  const removeFramework = useRemoveOrganizationFramework()
  const updateFramework = useUpdateOrganizationFramework()

  // All hooks MUST be called before any early returns
  const availableFrameworks = useMemo(() => {
    return frameworks.filter(
      f => !orgFrameworks.some((sf: any) => sf.framework_id === f.id)
    )
  }, [frameworks, orgFrameworks])

  const loading = orgLoading || fwLoading || orgFwLoading
  const orgName = organization?.name || ''
  const selectedFrameworks = orgFrameworks

  // Show message if no organization selected (user should select from TopNav)
  if (!orgId) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 animate-fade-in">
        <div className="bg-white dark:bg-gray-800 shadow rounded-xl p-12 text-center border border-gray-200 dark:border-gray-700">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
            />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-gray-100">
            No Organization Selected
          </h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Please select an organization from the dropdown in the top navigation bar.
          </p>
        </div>
      </div>
    )
  }

  // Loading state (after all hooks)
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

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
      setIsPrimary(false)
      setSelectionStatus('active')
    } catch (error: any) {
      alert(`Error: ${error.message}`)
    }
  }

  async function handleToggleSelectionStatus(frameworkId: string, currentStatus: SelectionStatus) {
    if (!orgId) return

    const newStatus: SelectionStatus = currentStatus === 'active' ? 'evaluating' : 'active'

    try {
      await updateFramework.mutateAsync({
        id: frameworkId,
        orgId,
        updates: { selection_status: newStatus }
      })
    } catch (error: any) {
      alert(`Error: ${error.message}`)
    }
  }

  async function handleRemoveFramework(id: string) {
    if (!confirm('Remove this framework from the organization?')) return
    if (!orgId) return

    try {
      await removeFramework.mutateAsync({ id, orgId })
    } catch (error: any) {
      alert(`Error: ${error.message}`)
    }
  }

  async function handleTogglePrimary(frameworkId: string, currentPrimary: boolean) {
    if (!orgId) return

    try {
      await updateFramework.mutateAsync({
        id: frameworkId,
        orgId,
        updates: { is_primary: !currentPrimary }
      })
    } catch (error: any) {
      alert(`Error: ${error.message}`)
    }
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 animate-fade-in">
      <div className="mb-8 flex justify-between items-start">
        <div>
          <button
            onClick={() => router.push('/organizations')}
            className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 mb-2"
          >
            ← Back to Organizations
          </button>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Organization Frameworks
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Select and manage compliance frameworks for this organization
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
          disabled={availableFrameworks.length === 0}
        >
          + Add Framework
        </button>
      </div>

      {/* Selected Frameworks - Grouped by Status */}
      {selectedFrameworks.length > 0 ? (
        <div className="space-y-8">
          {/* Active Frameworks Section */}
          {selectedFrameworks.filter((f: any) => f.selection_status === 'active').length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-green-500"></span>
                Active Frameworks
                <span className="text-sm font-normal text-gray-500">
                  ({selectedFrameworks.filter((f: any) => f.selection_status === 'active').length})
                </span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {selectedFrameworks.filter((f: any) => f.selection_status === 'active').map((orgFw: any) => (
                  <FrameworkCard
                    key={orgFw.id}
                    orgFw={orgFw}
                    onTogglePrimary={handleTogglePrimary}
                    onToggleStatus={handleToggleSelectionStatus}
                    onRemove={handleRemoveFramework}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Evaluating Frameworks Section */}
          {selectedFrameworks.filter((f: any) => f.selection_status === 'evaluating').length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
                Evaluating
                <span className="text-sm font-normal text-gray-500">
                  ({selectedFrameworks.filter((f: any) => f.selection_status === 'evaluating').length})
                </span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {selectedFrameworks.filter((f: any) => f.selection_status === 'evaluating').map((orgFw: any) => (
                  <FrameworkCard
                    key={orgFw.id}
                    orgFw={orgFw}
                    onTogglePrimary={handleTogglePrimary}
                    onToggleStatus={handleToggleSelectionStatus}
                    onRemove={handleRemoveFramework}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 shadow rounded-xl p-12 text-center border border-gray-200 dark:border-gray-700">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-gray-100">
            No frameworks selected
          </h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Get started by adding a compliance framework for this organization.
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="mt-6 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            + Add Your First Framework
          </button>
        </div>
      )}

      {/* Add Framework Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50" onClick={() => setShowAddModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
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
                    {availableFrameworks.map(fw => (
                      <option key={fw.id} value={fw.id}>
                        {fw.name} {fw.version && `v${fw.version}`}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Status *
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="selectionStatus"
                        value="active"
                        checked={selectionStatus === 'active'}
                        onChange={() => setSelectionStatus('active')}
                        className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300"
                      />
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-green-500"></span>
                        Active
                      </span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="selectionStatus"
                        value="evaluating"
                        checked={selectionStatus === 'evaluating'}
                        onChange={() => setSelectionStatus('evaluating')}
                        className="h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-300"
                      />
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                        Evaluating
                      </span>
                    </label>
                  </div>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Active = currently using for compliance. Evaluating = under consideration.
                  </p>
                </div>

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

                {selectedFrameworkId && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      <strong>Note:</strong> Once added, you can map SCF controls to this framework's controls.
                    </p>
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
                  disabled={!selectedFrameworkId}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add Framework
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Framework Card Component
function FrameworkCard({
  orgFw,
  onTogglePrimary,
  onToggleStatus,
  onRemove
}: {
  orgFw: any
  onTogglePrimary: (id: string, isPrimary: boolean) => void
  onToggleStatus: (id: string, currentStatus: SelectionStatus) => void
  onRemove: (id: string) => void
}) {
  const isActive = orgFw.selection_status === 'active'

  return (
    <div
      className={`bg-white dark:bg-gray-800 shadow rounded-xl p-6 border hover:shadow-lg transition-shadow ${
        isActive
          ? 'border-green-200 dark:border-green-800'
          : 'border-yellow-200 dark:border-yellow-800'
      }`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {orgFw.frameworks.name}
            </h3>
            {orgFw.is_primary && (
              <span className="px-2 py-0.5 text-xs font-medium rounded bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-200">
                PRIMARY
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {orgFw.frameworks.code} {orgFw.frameworks.version && `v${orgFw.frameworks.version}`}
          </p>
        </div>
        {/* Status badge */}
        <button
          onClick={() => onToggleStatus(orgFw.id, orgFw.selection_status)}
          className={`px-2.5 py-1 text-xs font-medium rounded-full transition-colors cursor-pointer ${
            isActive
              ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 hover:bg-green-200 dark:hover:bg-green-900/50'
              : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 hover:bg-yellow-200 dark:hover:bg-yellow-900/50'
          }`}
          title={`Click to change to ${isActive ? 'Evaluating' : 'Active'}`}
        >
          {isActive ? 'Active' : 'Evaluating'}
        </button>
      </div>

      {orgFw.frameworks.description && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
          {orgFw.frameworks.description}
        </p>
      )}

      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">Compliance:</span>
          <span className={`font-medium ${
            orgFw.compliance_status === 'compliant' ? 'text-green-600' :
            orgFw.compliance_status === 'in_progress' ? 'text-yellow-600' :
            orgFw.compliance_status === 'non_compliant' ? 'text-red-600' :
            'text-gray-600'
          }`}>
            {orgFw.compliance_status?.replace('_', ' ').toUpperCase() || 'NOT STARTED'}
          </span>
        </div>
      </div>

      <div className="flex gap-2 border-t border-gray-200 dark:border-gray-700 pt-4">
        <button
          onClick={() => onTogglePrimary(orgFw.id, orgFw.is_primary)}
          className="flex-1 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300"
        >
          {orgFw.is_primary ? 'Unset Primary' : 'Set as Primary'}
        </button>
        <button
          onClick={() => onRemove(orgFw.id)}
          className="flex-1 text-sm text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
        >
          Remove
        </button>
      </div>
    </div>
  )
}

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
    </div>
  )
}

export default function OrganizationFrameworksPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <OrganizationFrameworksContent />
    </Suspense>
  )
}
