'use client'

import { useMemo } from 'react'

type MetadataValue = string | number | boolean | null | undefined | Record<string, any> | any[]

interface DynamicMetadataProps {
  metadata: Record<string, MetadataValue>
  /** Fields to exclude from display */
  excludeFields?: string[]
  /** Custom field order (fields not listed appear at end) */
  fieldOrder?: string[]
  /** Custom labels for specific fields */
  customLabels?: Record<string, string>
  /** Compact mode - less padding, smaller text */
  compact?: boolean
  /** Show as inline badges instead of stacked list */
  inline?: boolean
  /** CSS class for container */
  className?: string
}

/**
 * Dynamically renders JSONB metadata from framework_metadata table.
 * Handles various value types and formats keys into readable labels.
 *
 * @example
 * // SCF Domain metadata
 * <DynamicMetadata
 *   metadata={{
 *     domain_name: "Cybersecurity & Data Privacy Governance",
 *     principles: "Execute a documented...",
 *     principle_intent: "Organizations specify..."
 *   }}
 *   excludeFields={['type', 'domain_number']}
 *   fieldOrder={['domain_name', 'principles', 'principle_intent']}
 * />
 */
export function DynamicMetadata({
  metadata,
  excludeFields = ['type'],
  fieldOrder = [],
  customLabels = {},
  compact = false,
  inline = false,
  className = ''
}: DynamicMetadataProps) {
  // Format snake_case or camelCase to Title Case
  const formatLabel = (key: string): string => {
    if (customLabels[key]) return customLabels[key]

    return key
      .replace(/_/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/\b\w/g, c => c.toUpperCase())
  }

  // Sort and filter fields
  const sortedEntries = useMemo(() => {
    const entries = Object.entries(metadata).filter(
      ([key]) => !excludeFields.includes(key)
    )

    // Sort by fieldOrder, then alphabetically for remaining
    return entries.sort((a, b) => {
      const aIndex = fieldOrder.indexOf(a[0])
      const bIndex = fieldOrder.indexOf(b[0])

      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex
      if (aIndex !== -1) return -1
      if (bIndex !== -1) return 1
      return a[0].localeCompare(b[0])
    })
  }, [metadata, excludeFields, fieldOrder])

  // Render a single value based on its type
  const renderValue = (value: MetadataValue): React.ReactNode => {
    if (value === null || value === undefined) {
      return <span className="text-gray-400 italic">Not specified</span>
    }

    if (typeof value === 'boolean') {
      return (
        <span className={value ? 'text-green-600' : 'text-gray-400'}>
          {value ? '✓ Yes' : '✗ No'}
        </span>
      )
    }

    if (typeof value === 'number') {
      return <span className="font-mono">{value.toLocaleString()}</span>
    }

    if (Array.isArray(value)) {
      if (value.length === 0) {
        return <span className="text-gray-400 italic">None</span>
      }
      return (
        <ul className="list-disc list-inside space-y-1">
          {value.map((item, i) => (
            <li key={i}>{String(item)}</li>
          ))}
        </ul>
      )
    }

    if (typeof value === 'object') {
      return (
        <pre className="text-xs bg-gray-50 dark:bg-gray-800 p-2 rounded overflow-auto max-h-32">
          {JSON.stringify(value, null, 2)}
        </pre>
      )
    }

    // String value - check if it's long
    const stringValue = String(value)
    if (stringValue.length > 200) {
      return (
        <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
          {stringValue}
        </p>
      )
    }

    return <span className="text-gray-900 dark:text-gray-100">{stringValue}</span>
  }

  if (sortedEntries.length === 0) {
    return null
  }

  // Inline mode - render as badges/tags
  if (inline) {
    return (
      <div className={`flex flex-wrap gap-2 ${className}`}>
        {sortedEntries.map(([key, value]) => (
          <div
            key={key}
            className="inline-flex items-center gap-1.5 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs"
          >
            <span className="font-medium text-gray-600 dark:text-gray-400">
              {formatLabel(key)}:
            </span>
            <span className="text-gray-900 dark:text-gray-100">
              {typeof value === 'boolean' ? (value ? '✓' : '✗') : String(value).slice(0, 50)}
              {typeof value === 'string' && value.length > 50 && '...'}
            </span>
          </div>
        ))}
      </div>
    )
  }

  // Stacked mode - render as definition list
  return (
    <dl className={`${compact ? 'space-y-2' : 'space-y-4'} ${className}`}>
      {sortedEntries.map(([key, value]) => (
        <div key={key}>
          <dt className={`font-medium text-gray-500 dark:text-gray-400 ${compact ? 'text-xs' : 'text-sm'}`}>
            {formatLabel(key)}
          </dt>
          <dd className={`mt-1 ${compact ? 'text-sm' : 'text-base'}`}>
            {renderValue(value)}
          </dd>
        </div>
      ))}
    </dl>
  )
}

/**
 * Specialized component for SCF Domain metadata display
 */
export function SCFDomainMetadata({
  metadata,
  className = ''
}: {
  metadata: Record<string, MetadataValue>
  className?: string
}) {
  return (
    <DynamicMetadata
      metadata={metadata}
      excludeFields={['type', 'domain_number']}
      fieldOrder={['domain_name', 'principles', 'principle_intent']}
      customLabels={{
        domain_name: 'Domain',
        principles: 'Principles',
        principle_intent: 'Intent'
      }}
      className={className}
    />
  )
}

export default DynamicMetadata
