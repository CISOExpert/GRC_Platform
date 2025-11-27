'use client'

import { useState } from 'react'
import { useFrameworks } from '@/lib/hooks/useFrameworks'
import { useControlMappingsByFrameworkGrouped } from '@/lib/hooks/useControlMappings'

export default function FrameworkInfoPage() {
  // All hooks at top level, never inside conditionals or nested functions
  const { data: frameworks = [], isLoading, error } = useFrameworks();
  const [selectedFramework, setSelectedFramework] = useState<string>('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const info = frameworks.find(fw => fw.id === selectedFramework) || null;
  const { data: hierarchy = {} } = useControlMappingsByFrameworkGrouped(selectedFramework, undefined, undefined, true, true);

  // Render loading/error states
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-600">Error loading frameworks: {error.message}</div>
      </div>
    );
  }

  // Recursive render function for hierarchy (no hooks inside)
  function renderNode(node: any, key: string, level: number = 0) {
    const isOpen = expanded[key];
    const hasChildren = node.children && Object.keys(node.children).length > 0;
    return (
      <div key={key} style={{ marginLeft: level * 24 }}>
        <button
          className={`w-full text-left py-2 px-3 rounded font-semibold ${level === 0 ? 'text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-gray-800' : 'text-gray-900 dark:text-gray-100 bg-gray-100 dark:bg-gray-800'} hover:bg-indigo-100 dark:hover:bg-gray-700 transition flex items-center`}
          onClick={() => hasChildren && setExpanded(exp => ({ ...exp, [key]: !isOpen }))}
        >
          {hasChildren && (
            <span className={`mr-2 transition-transform ${isOpen ? 'rotate-90' : ''}`}>{'>'}</span>
          )}
          {node.description} <span className="text-xs text-gray-500">({key})</span>
        </button>
        {isOpen && hasChildren && (
          <div className="mt-1">
            {Object.entries(node.children).map(([childKey, childNode]) => renderNode(childNode, childKey, level + 1))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Framework Information
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Select a framework to view all known details. This page will expand to show mappings, sources, and more.
        </p>
      </div>
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Select Framework</label>
        <select
          className="w-full max-w-md p-2 border rounded dark:bg-gray-800 dark:text-gray-100"
          value={selectedFramework}
          onChange={e => {
            setSelectedFramework(e.target.value);
            setExpanded({});
          }}
        >
          <option value="">-- Choose a framework --</option>
          {frameworks.map(fw => (
            <option key={fw.id} value={fw.id}>{fw.name || fw.code}</option>
          ))}
        </select>
      </div>
      {info && (
        <div className="bg-white dark:bg-gray-900 rounded shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-2">{info.name || info.code}</h2>
          <div className="text-sm text-gray-700 dark:text-gray-300">
            <div><strong>Code:</strong> {info.code}</div>
            <div><strong>Version:</strong> {info.version}</div>
            <div><strong>Description:</strong> {info.description}</div>
            <div><strong>Mapping Count:</strong> {info.mapping_count}</div>
            <div><strong>External Control Count:</strong> {info.external_control_count}</div>
          </div>
        </div>
      )}
      {/* Recursive Collapsible Domain/Control hierarchy for selected framework */}
      {selectedFramework && (
        <div className="bg-white dark:bg-gray-900 rounded shadow p-6">
          <h3 className="text-lg font-bold mb-4">Domains & Controls</h3>
          {Object.keys(hierarchy).length === 0 && (
            <div className="text-gray-500">No controls found for this framework.</div>
          )}
          <div className="space-y-2">
            {Object.entries(hierarchy).map(([key, node]) => renderNode(node, key, 0))}
          </div>
        </div>
      )}
    </div>
  );
}
