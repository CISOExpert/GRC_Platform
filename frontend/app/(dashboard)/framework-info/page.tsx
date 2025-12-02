'use client'

import { useState, useEffect, useMemo } from 'react'
import { useFrameworks, useFrameworkStats, useFrameworkDetails } from '@/lib/hooks/useFrameworks'
import { useControlMappingsByFrameworkGrouped } from '@/lib/hooks/useControlMappings'
import { useSCFDomainMetadata } from '@/lib/hooks/useFrameworkMetadata'
import { SCFDomainMetadata } from '@/components/DynamicMetadata'
import { AssessmentObjectives } from '@/components/AssessmentObjectives'
import { EvidenceRequests } from '@/components/EvidenceRequests'
import { createClient } from '@/lib/supabase/client'

// Framework metadata lookup (can be moved to database later)
const frameworkMetadata: Record<string, {
  source_organization: string
  geography: string
  category: string
  website?: string
  color: string
}> = {
  'NIST-CSF': {
    source_organization: 'National Institute of Standards and Technology',
    geography: 'United States (Global adoption)',
    category: 'Best Practice Framework',
    website: 'https://www.nist.gov/cyberframework',
    color: 'blue'
  },
  'ISO-27001': {
    source_organization: 'International Organization for Standardization',
    geography: 'Global',
    category: 'International Standard',
    website: 'https://www.iso.org/iso-27001-information-security.html',
    color: 'green'
  },
  'SOC2-TSC': {
    source_organization: 'American Institute of CPAs (AICPA)',
    geography: 'United States',
    category: 'Audit Framework',
    color: 'purple'
  },
  'GDPR': {
    source_organization: 'European Union',
    geography: 'European Union',
    category: 'Regulatory',
    color: 'yellow'
  },
  'HIPAA': {
    source_organization: 'U.S. Department of Health & Human Services',
    geography: 'United States',
    category: 'Regulatory',
    color: 'red'
  },
  'PCI-DSS': {
    source_organization: 'Payment Card Industry Security Standards Council',
    geography: 'Global',
    category: 'Industry Standard',
    color: 'orange'
  },
  'SCF': {
    source_organization: 'Secure Controls Framework Council',
    geography: 'Global',
    category: 'Meta-Framework',
    website: 'https://securecontrolsframework.com',
    color: 'indigo'
  },
  'CIS-CSC': {
    source_organization: 'Center for Internet Security',
    geography: 'Global',
    category: 'Best Practice Framework',
    website: 'https://www.cisecurity.org/controls',
    color: 'teal'
  }
}

function getCategoryBadgeColor(category: string) {
  switch (category) {
    case 'Regulatory': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
    case 'Best Practice Framework': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
    case 'International Standard': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
    case 'Audit Framework': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
    case 'Industry Standard': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
    case 'Meta-Framework': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300'
    default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
  }
}

type SelectedControl = {
  refCode: string
  title: string
  description: string
  scfMappings: any[]
}

type Risk = {
  id: string
  risk_id: string
  title: string
  description: string
  category: string
}

type Threat = {
  id: string
  threat_id: string
  name: string
  description: string
  category: string
  threat_grouping: string
}

type RiskStats = {
  totalRisks: number
  byCategory: Record<string, number>
  byStatus: Record<string, number>
}

type ThreatStats = {
  totalThreats: number
  byCategory: Record<string, number>
  byGrouping: Record<string, number>
}

export default function FrameworkInfoPage() {
  const { data: frameworks = [], isLoading, error } = useFrameworks()
  const [selectedFramework, setSelectedFramework] = useState<string>('')
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [selectedControl, setSelectedControl] = useState<SelectedControl | null>(null)
  const [relatedRisks, setRelatedRisks] = useState<Risk[]>([])
  const [risksLoading, setRisksLoading] = useState(false)
  const [riskStats, setRiskStats] = useState<RiskStats | null>(null)
  const [riskStatsLoading, setRiskStatsLoading] = useState(false)
  const [relatedThreats, setRelatedThreats] = useState<Threat[]>([])
  const [threatsLoading, setThreatsLoading] = useState(false)
  const [threatStats, setThreatStats] = useState<ThreatStats | null>(null)
  const [threatStatsLoading, setThreatStatsLoading] = useState(false)
  const [riskThreatFilter, setRiskThreatFilter] = useState('')

  const info = frameworks.find(fw => fw.id === selectedFramework) || null
  const { data: stats, isLoading: statsLoading } = useFrameworkStats(selectedFramework)
  const { data: details } = useFrameworkDetails(selectedFramework)
  const { data: hierarchy = {} } = useControlMappingsByFrameworkGrouped(selectedFramework, undefined, undefined, true, true)

  // Get metadata for selected framework
  const metadata = info ? frameworkMetadata[info.code] || frameworkMetadata[info.code.split('-')[0]] : null

  // Get SCF domain metadata for the selected control
  // Use the control's refCode if viewing SCF, or the first SCF mapping's control_id otherwise
  const scfRefCodeForMetadata = useMemo(() => {
    if (!selectedControl) return undefined
    // If viewing SCF framework directly, use the control's refCode
    if (info?.code === 'SCF') {
      return selectedControl.refCode
    }
    // Otherwise, use the first SCF mapping's control_id
    const firstMapping = selectedControl.scfMappings?.[0]
    return firstMapping?.scf_control?.control_id || firstMapping?.source_ref
  }, [selectedControl, info?.code])

  const { data: scfDomainMetadata, isLoading: domainMetadataLoading } = useSCFDomainMetadata(scfRefCodeForMetadata)

  // Fetch risk statistics for the framework
  useEffect(() => {
    if (!selectedFramework) {
      setRiskStats(null)
      return
    }

    const fetchRiskStats = async () => {
      setRiskStatsLoading(true)
      const supabase = createClient()

      console.log('[RiskStats] Fetching risk stats for framework:', selectedFramework)

      // Get SCF framework ID
      const { data: scfFramework, error: scfError } = await supabase
        .from('frameworks')
        .select('id')
        .eq('code', 'SCF')
        .single()

      if (scfError) {
        console.error('[RiskStats] Error getting SCF framework:', scfError)
      }
      if (!scfFramework) {
        console.log('[RiskStats] No SCF framework found')
        setRiskStats(null)
        setRiskStatsLoading(false)
        return
      }
      console.log('[RiskStats] SCF framework ID:', scfFramework.id)

      // Get all SCF control IDs that map to this framework
      const { data: crosswalks, error: crosswalkError } = await supabase
        .from('framework_crosswalks')
        .select('source_control_id')
        .eq('source_framework_id', scfFramework.id)
        .eq('target_framework_id', selectedFramework)

      if (crosswalkError) {
        console.error('[RiskStats] Error getting crosswalks:', crosswalkError)
      }
      if (!crosswalks || crosswalks.length === 0) {
        console.log('[RiskStats] No crosswalks found for framework')
        setRiskStats({ totalRisks: 0, byCategory: {}, byStatus: {} })
        setRiskStatsLoading(false)
        return
      }

      const scfControlIds = [...new Set(crosswalks.map(c => c.source_control_id))]
      console.log('[RiskStats] Found', scfControlIds.length, 'unique SCF control IDs')

      // Get all risk IDs linked to these SCF controls
      const { data: riskControls, error: riskControlsError } = await supabase
        .from('risk_controls')
        .select('risk_id')
        .in('control_id', scfControlIds)

      if (riskControlsError) {
        console.error('[RiskStats] Error getting risk_controls:', riskControlsError)
      }
      if (!riskControls || riskControls.length === 0) {
        console.log('[RiskStats] No risk_controls found')
        setRiskStats({ totalRisks: 0, byCategory: {}, byStatus: {} })
        setRiskStatsLoading(false)
        return
      }

      const riskIds = [...new Set(riskControls.map(rc => rc.risk_id))]
      console.log('[RiskStats] Found', riskIds.length, 'unique risk IDs')

      // Get the risks with their details
      const { data: risks, error: risksError } = await supabase
        .from('risks')
        .select('id, category, status')
        .in('id', riskIds)

      if (risksError) {
        console.error('[RiskStats] Error getting risks:', risksError)
      }
      if (!risks || risks.length === 0) {
        console.log('[RiskStats] No risks found (RLS blocking?)')
        setRiskStats({ totalRisks: 0, byCategory: {}, byStatus: {} })
        setRiskStatsLoading(false)
        return
      }

      console.log('[RiskStats] Found', risks.length, 'risks')

      // Aggregate stats
      const byCategory: Record<string, number> = {}
      const byStatus: Record<string, number> = {}

      risks.forEach(risk => {
        const cat = risk.category || 'uncategorized'
        const status = risk.status || 'unknown'
        byCategory[cat] = (byCategory[cat] || 0) + 1
        byStatus[status] = (byStatus[status] || 0) + 1
      })

      setRiskStats({
        totalRisks: risks.length,
        byCategory,
        byStatus
      })
      setRiskStatsLoading(false)
    }

    fetchRiskStats()
  }, [selectedFramework])

  // Fetch threat statistics for the framework
  useEffect(() => {
    if (!selectedFramework) {
      setThreatStats(null)
      return
    }

    const fetchThreatStats = async () => {
      setThreatStatsLoading(true)
      const supabase = createClient()

      console.log('[ThreatStats] Fetching threat stats for framework:', selectedFramework)

      // Get SCF framework ID
      const { data: scfFramework, error: scfError } = await supabase
        .from('frameworks')
        .select('id')
        .eq('code', 'SCF')
        .single()

      if (scfError || !scfFramework) {
        console.log('[ThreatStats] No SCF framework found')
        setThreatStats(null)
        setThreatStatsLoading(false)
        return
      }

      // Get all SCF control IDs that map to this framework
      const { data: crosswalks, error: crosswalkError } = await supabase
        .from('framework_crosswalks')
        .select('source_control_id')
        .eq('source_framework_id', scfFramework.id)
        .eq('target_framework_id', selectedFramework)

      if (crosswalkError || !crosswalks || crosswalks.length === 0) {
        console.log('[ThreatStats] No crosswalks found for framework')
        setThreatStats({ totalThreats: 0, byCategory: {}, byGrouping: {} })
        setThreatStatsLoading(false)
        return
      }

      const scfControlIds = [...new Set(crosswalks.map(c => c.source_control_id).filter(Boolean))]
      console.log('[ThreatStats] Found', scfControlIds.length, 'unique SCF control IDs')

      // Get all threat IDs linked to these SCF controls
      const { data: threatControls, error: threatControlsError } = await supabase
        .from('threat_controls')
        .select('threat_id')
        .in('control_id', scfControlIds)

      if (threatControlsError || !threatControls || threatControls.length === 0) {
        console.log('[ThreatStats] No threat_controls found')
        setThreatStats({ totalThreats: 0, byCategory: {}, byGrouping: {} })
        setThreatStatsLoading(false)
        return
      }

      const threatIds = [...new Set(threatControls.map(tc => tc.threat_id))]
      console.log('[ThreatStats] Found', threatIds.length, 'unique threat IDs')

      // Get the threats with their details
      const { data: threats, error: threatsError } = await supabase
        .from('threats')
        .select('id, category, threat_grouping')
        .in('id', threatIds)

      if (threatsError || !threats || threats.length === 0) {
        console.log('[ThreatStats] No threats found')
        setThreatStats({ totalThreats: 0, byCategory: {}, byGrouping: {} })
        setThreatStatsLoading(false)
        return
      }

      console.log('[ThreatStats] Found', threats.length, 'threats')

      // Aggregate stats
      const byCategory: Record<string, number> = {}
      const byGrouping: Record<string, number> = {}

      threats.forEach(threat => {
        const cat = threat.category || 'unknown'
        const grouping = threat.threat_grouping || 'ungrouped'
        byCategory[cat] = (byCategory[cat] || 0) + 1
        byGrouping[grouping] = (byGrouping[grouping] || 0) + 1
      })

      setThreatStats({
        totalThreats: threats.length,
        byCategory,
        byGrouping
      })
      setThreatStatsLoading(false)
    }

    fetchThreatStats()
  }, [selectedFramework])

  // Filter risks and threats based on keyword search
  const filteredRisks = useMemo(() => {
    if (!riskThreatFilter.trim()) return relatedRisks
    const searchTerm = riskThreatFilter.toLowerCase()
    return relatedRisks.filter(risk =>
      (risk.risk_id?.toLowerCase() || '').includes(searchTerm) ||
      (risk.title?.toLowerCase() || '').includes(searchTerm) ||
      (risk.description?.toLowerCase() || '').includes(searchTerm) ||
      (risk.category?.toLowerCase() || '').includes(searchTerm)
    )
  }, [relatedRisks, riskThreatFilter])

  const filteredThreats = useMemo(() => {
    if (!riskThreatFilter.trim()) return relatedThreats
    const searchTerm = riskThreatFilter.toLowerCase()
    return relatedThreats.filter(threat =>
      (threat.threat_id?.toLowerCase() || '').includes(searchTerm) ||
      (threat.name?.toLowerCase() || '').includes(searchTerm) ||
      (threat.description?.toLowerCase() || '').includes(searchTerm) ||
      (threat.category?.toLowerCase() || '').includes(searchTerm) ||
      (threat.threat_grouping?.toLowerCase() || '').includes(searchTerm)
    )
  }, [relatedThreats, riskThreatFilter])

  // Fetch related risks and threats when control is selected
  useEffect(() => {
    if (!selectedControl || selectedControl.scfMappings.length === 0) {
      setRelatedRisks([])
      setRelatedThreats([])
      return
    }

    const fetchRisksAndThreats = async () => {
      setRisksLoading(true)
      setThreatsLoading(true)
      const supabase = createClient()

      // Get SCF control IDs from mappings - support both old (scf_control) and new (source_control_id) schema
      const scfControlIds = selectedControl.scfMappings
        .map(m => m.source_control_id || m.scf_control?.id)
        .filter(Boolean)

      if (scfControlIds.length === 0) {
        setRelatedRisks([])
        setRelatedThreats([])
        setRisksLoading(false)
        setThreatsLoading(false)
        return
      }

      // Fetch risks linked to these SCF controls
      const { data: riskControls } = await supabase
        .from('risk_controls')
        .select('risk_id')
        .in('control_id', scfControlIds)

      if (riskControls && riskControls.length > 0) {
        const riskIds = [...new Set(riskControls.map(rc => rc.risk_id))]
        const { data: risks } = await supabase
          .from('risks')
          .select('id, risk_id, title, description, category')
          .in('id', riskIds)
        setRelatedRisks(risks || [])
      } else {
        setRelatedRisks([])
      }
      setRisksLoading(false)

      // Fetch threats linked to these SCF controls
      const { data: threatControls } = await supabase
        .from('threat_controls')
        .select('threat_id')
        .in('control_id', scfControlIds)

      if (threatControls && threatControls.length > 0) {
        const threatIds = [...new Set(threatControls.map(tc => tc.threat_id))]
        const { data: threats } = await supabase
          .from('threats')
          .select('id, threat_id, name, description, category, threat_grouping')
          .in('id', threatIds)
        setRelatedThreats(threats || [])
      } else {
        setRelatedThreats([])
      }
      setThreatsLoading(false)
    }

    fetchRisksAndThreats()
  }, [selectedControl])

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
        <div className="text-red-600">Error loading frameworks: {error.message}</div>
      </div>
    )
  }

  // Get display name for a node - prefer title, clean up generic descriptions
  function getDisplayName(node: any, refCode: string): string {
    if (node.title) return node.title
    if (node.description?.startsWith('External control ')) return ''
    return node.description || ''
  }

  // Handle control selection
  function handleControlSelect(node: any, key: string) {
    const refCode = node.ref_code || key
    const displayName = getDisplayName(node, refCode)
    setSelectedControl({
      refCode,
      title: displayName || refCode,
      description: node.description || '',
      scfMappings: node.scfMappings || []
    })
    // Clear filter when selecting a new control
    setRiskThreatFilter('')
  }

  // Recursive render function for hierarchy
  function renderNode(node: any, key: string, level: number = 0) {
    const isOpen = expanded[key]
    const hasChildren = node.children && Object.keys(node.children).length > 0
    const refCode = node.ref_code || key
    const displayName = getDisplayName(node, refCode)
    const childCount = hasChildren ? Object.keys(node.children).length : 0
    const isSelected = selectedControl?.refCode === refCode

    // Get risk/threat counts from node (populated from external_controls)
    const riskCount = node.risk_count || 0
    const threatCount = node.threat_count || 0
    const hasCounts = riskCount > 0 || threatCount > 0

    return (
      <div key={key} style={{ marginLeft: level * 16 }}>
        <button
          className={`w-full text-left py-2 px-3 rounded-lg font-medium transition-all text-sm ${
            isSelected
              ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-500'
              : level === 0
              ? 'text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/30'
              : 'text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
          } flex items-center justify-between group`}
          onClick={() => {
            handleControlSelect(node, key)
            if (hasChildren) {
              setExpanded(exp => ({ ...exp, [key]: !isOpen }))
            }
          }}
        >
          <div className="flex items-center gap-2 min-w-0">
            {hasChildren && (
              <span className={`transition-transform text-gray-400 flex-shrink-0 ${isOpen ? 'rotate-90' : ''}`}>
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </span>
            )}
            <span className="truncate">{displayName ? `${displayName} (${refCode})` : refCode}</span>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0 ml-2">
            {/* Risk/Threat count badges */}
            {hasCounts && (
              <div className="flex items-center gap-1">
                {riskCount > 0 && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 font-normal">
                    {riskCount}R
                  </span>
                )}
                {threatCount > 0 && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 font-normal">
                    {threatCount}T
                  </span>
                )}
              </div>
            )}
            {/* Child count on hover */}
            {hasChildren && (
              <span className="text-xs text-gray-500 dark:text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                {childCount}
              </span>
            )}
          </div>
        </button>
        {isOpen && hasChildren && (
          <div className="mt-1 space-y-1">
            {Object.entries(node.children).map(([childKey, childNode]) => renderNode(childNode, childKey, level + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 animate-fade-in">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Framework Information
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Explore compliance frameworks, their structure, and SCF mappings
        </p>
      </div>

      {/* Framework Selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Select Framework
        </label>
        <select
          className="w-full max-w-md p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          value={selectedFramework}
          onChange={e => {
            setSelectedFramework(e.target.value)
            setExpanded({})
            setSelectedControl(null)
          }}
        >
          <option value="">-- Choose a framework --</option>
          {frameworks.map(fw => (
            <option key={fw.id} value={fw.id}>
              {fw.name || fw.code} {fw.version && `(${fw.version})`}
            </option>
          ))}
        </select>
      </div>

      {info && (
        <div className="space-y-6">
          {/* Framework Overview Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {info.name || info.code}
                    </h2>
                    {metadata?.category && (
                      <span className={`px-3 py-1 text-xs font-medium rounded-full ${getCategoryBadgeColor(metadata.category)}`}>
                        {metadata.category}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {info.code} {info.version && `• Version ${info.version}`}
                  </p>
                </div>
                {metadata?.website && (
                  <a
                    href={metadata.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 text-sm flex items-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    Official Site
                  </a>
                )}
              </div>

              {info.description && (
                <p className="mt-4 text-gray-700 dark:text-gray-300">
                  {info.description}
                </p>
              )}

              {/* Metadata Grid */}
              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                {metadata?.source_organization && (
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Source Organization</p>
                      <p className="text-sm text-gray-900 dark:text-gray-100">{metadata.source_organization}</p>
                    </div>
                  </div>
                )}
                {metadata?.geography && (
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Geography</p>
                      <p className="text-sm text-gray-900 dark:text-gray-100">{metadata.geography}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Added to Platform</p>
                    <p className="text-sm text-gray-900 dark:text-gray-100">
                      {details?.created_at ? new Date(details.created_at).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Statistics Dashboard */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Controls</p>
                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">
                {statsLoading ? '...' : stats?.totalControls || info.external_control_count || 0}
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Domains</p>
                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">
                {statsLoading ? '...' : stats?.totalDomains || Object.keys(hierarchy).length || 0}
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">SCF Mappings</p>
                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">
                {statsLoading ? '...' : stats?.scfMappingCount || info.mapping_count || 0}
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Mapping Coverage</p>
                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">
                {statsLoading ? '...' : `${stats?.mappingCoverage || 0}%`}
              </p>
              {!statsLoading && stats && (
                <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${stats.mappingCoverage}%` }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Risk Statistics Dashboard */}
          {riskStats && riskStats.totalRisks > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Risk Analysis
                  </h3>
                </div>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Risks linked to this framework via SCF control mappings
                </p>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Total Risks */}
                  <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 border border-red-100 dark:border-red-800">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-red-600 dark:text-red-400">Total Risks</p>
                      <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <p className="mt-2 text-3xl font-bold text-red-700 dark:text-red-300">
                      {riskStats.totalRisks}
                    </p>
                    <p className="mt-1 text-xs text-red-500 dark:text-red-400">
                      Linked via SCF controls
                    </p>
                  </div>

                  {/* By Category */}
                  <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4 border border-orange-100 dark:border-orange-800">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-orange-600 dark:text-orange-400">By Category</p>
                      <svg className="w-5 h-5 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                    </div>
                    <div className="space-y-1">
                      {Object.entries(riskStats.byCategory).map(([category, count]) => (
                        <div key={category} className="flex items-center justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400 capitalize truncate mr-2">{category}</span>
                          <span className="font-semibold text-orange-700 dark:text-orange-300 flex-shrink-0">{count}</span>
                        </div>
                      ))}
                      {Object.keys(riskStats.byCategory).length === 0 && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">No categories</p>
                      )}
                    </div>
                  </div>

                  {/* By Status */}
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 border border-yellow-100 dark:border-yellow-800">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">By Status</p>
                      <svg className="w-5 h-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="space-y-1">
                      {Object.entries(riskStats.byStatus).map(([status, count]) => (
                        <div key={status} className="flex items-center justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400 capitalize truncate mr-2">{status}</span>
                          <span className={`font-semibold flex-shrink-0 ${
                            status === 'mitigated' || status === 'treated' ? 'text-green-600 dark:text-green-400' :
                            status === 'identified' || status === 'open' ? 'text-red-600 dark:text-red-400' :
                            'text-yellow-700 dark:text-yellow-300'
                          }`}>{count}</span>
                        </div>
                      ))}
                      {Object.keys(riskStats.byStatus).length === 0 && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">No status data</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Risk Stats Loading State */}
          {riskStatsLoading && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                <div className="animate-spin h-4 w-4 border-2 border-indigo-500 border-t-transparent rounded-full"></div>
                Loading risk statistics...
              </div>
            </div>
          )}

          {/* Threat Statistics Dashboard */}
          {threatStats && threatStats.totalThreats > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Threat Analysis
                  </h3>
                </div>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Threats linked to this framework via SCF control mappings
                </p>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Total Threats */}
                  <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border border-purple-100 dark:border-purple-800">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-purple-600 dark:text-purple-400">Total Threats</p>
                      <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <p className="mt-2 text-3xl font-bold text-purple-700 dark:text-purple-300">
                      {threatStats.totalThreats}
                    </p>
                    <p className="mt-1 text-xs text-purple-500 dark:text-purple-400">
                      Linked via SCF controls
                    </p>
                  </div>

                  {/* By Category (Natural vs Manmade) */}
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-100 dark:border-blue-800">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-blue-600 dark:text-blue-400">By Category</p>
                      <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                    </div>
                    <div className="space-y-1">
                      {Object.entries(threatStats.byCategory).map(([category, count]) => (
                        <div key={category} className="flex items-center justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400 capitalize truncate mr-2">
                            {category === 'natural' ? '🌪️ Natural' : category === 'manmade' ? '👤 Manmade' : category}
                          </span>
                          <span className="font-semibold text-blue-700 dark:text-blue-300 flex-shrink-0">{count}</span>
                        </div>
                      ))}
                      {Object.keys(threatStats.byCategory).length === 0 && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">No categories</p>
                      )}
                    </div>
                  </div>

                  {/* By Grouping */}
                  <div className="bg-teal-50 dark:bg-teal-900/20 rounded-lg p-4 border border-teal-100 dark:border-teal-800">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-teal-600 dark:text-teal-400">By Grouping</p>
                      <svg className="w-5 h-5 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                    </div>
                    <div className="space-y-1 max-h-24 overflow-y-auto">
                      {Object.entries(threatStats.byGrouping).slice(0, 5).map(([grouping, count]) => (
                        <div key={grouping} className="flex items-center justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400 truncate mr-2">{grouping}</span>
                          <span className="font-semibold text-teal-700 dark:text-teal-300 flex-shrink-0">{count}</span>
                        </div>
                      ))}
                      {Object.keys(threatStats.byGrouping).length > 5 && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          +{Object.keys(threatStats.byGrouping).length - 5} more groupings
                        </p>
                      )}
                      {Object.keys(threatStats.byGrouping).length === 0 && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">No groupings</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Threat Stats Loading State */}
          {threatStatsLoading && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                <div className="animate-spin h-4 w-4 border-2 border-purple-500 border-t-transparent rounded-full"></div>
                Loading threat statistics...
              </div>
            </div>
          )}

          {/* Split View: Domains & Controls + Details Panel */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Panel: Domains & Controls Hierarchy */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Domains & Controls
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Click to view details
                </p>
              </div>
              <div className="p-4 max-h-[600px] overflow-y-auto">
                {Object.keys(hierarchy).length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="mt-2">No controls found for this framework.</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {Object.entries(hierarchy).map(([key, node]) => renderNode(node, key, 0))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Panel: Control Details */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      Control Details
                    </h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {selectedControl ? selectedControl.refCode : 'Select a control to view details'}
                    </p>
                  </div>
                  {/* Risk/Threat keyword filter */}
                  {selectedControl && (relatedRisks.length > 0 || relatedThreats.length > 0) && (
                    <div className="flex-shrink-0">
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Filter risks/threats..."
                          value={riskThreatFilter}
                          onChange={(e) => setRiskThreatFilter(e.target.value)}
                          className="w-48 pl-8 pr-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                        <svg className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        {riskThreatFilter && (
                          <button
                            onClick={() => setRiskThreatFilter('')}
                            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="p-4 max-h-[600px] overflow-y-auto">
                {!selectedControl ? (
                  <div className="text-center py-16 text-gray-500 dark:text-gray-400">
                    <svg className="mx-auto h-16 w-16 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                    </svg>
                    <p className="mt-4 text-lg font-medium">No Control Selected</p>
                    <p className="mt-2 text-sm max-w-xs mx-auto">
                      Click on a domain or control in the hierarchy to view its details, SCF mappings, and related risks.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Control Title */}
                    <div>
                      <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                        {selectedControl.title}
                      </h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {selectedControl.refCode}
                      </p>
                    </div>

                    {/* Description */}
                    <div>
                      <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-2">
                        Description
                      </h5>
                      <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                        {selectedControl.description && !selectedControl.description.startsWith('External control ')
                          ? selectedControl.description
                          : 'No description available for this control.'}
                      </p>
                    </div>

                    {/* SCF Domain Info - shows principles and intent */}
                    {scfDomainMetadata?.metadata && (
                      <div className="p-4 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-lg border border-indigo-100 dark:border-indigo-800/50">
                        <h5 className="text-sm font-semibold text-indigo-700 dark:text-indigo-300 uppercase tracking-wide mb-3 flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          SCF Domain Context
                        </h5>
                        <SCFDomainMetadata
                          metadata={scfDomainMetadata.metadata}
                          className="text-sm"
                        />
                      </div>
                    )}
                    {domainMetadataLoading && (
                      <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm p-3">
                        <div className="animate-spin h-4 w-4 border-2 border-indigo-500 border-t-transparent rounded-full"></div>
                        Loading domain context...
                      </div>
                    )}

                    {/* Evidence Requests */}
                    <div>
                      <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-2 flex items-center gap-2">
                        <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Evidence Requests
                        <span className="text-xs font-normal text-gray-400 dark:text-gray-500">(SCF 2025.3.1)</span>
                      </h5>
                      <EvidenceRequests
                        scfControlId={scfRefCodeForMetadata}
                        initialLimit={3}
                      />
                    </div>

                    {/* Assessment Objectives */}
                    <div>
                      <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-2 flex items-center gap-2">
                        <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                        </svg>
                        Assessment Objectives
                      </h5>
                      <AssessmentObjectives
                        scfControlId={scfRefCodeForMetadata}
                        initialLimit={3}
                      />
                    </div>

                    {/* Authoritative Source (SCF Mappings) */}
                    <div>
                      <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-2">
                        SCF Mappings ({selectedControl.scfMappings.length})
                      </h5>
                      {selectedControl.scfMappings.length === 0 ? (
                        <p className="text-gray-500 dark:text-gray-400 text-sm">
                          No SCF control mappings found for this control.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {selectedControl.scfMappings.slice(0, 10).map((mapping, idx) => (
                            <div
                              key={idx}
                              className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-100 dark:border-indigo-800"
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-indigo-700 dark:text-indigo-300 font-mono text-sm font-semibold">
                                  {mapping.scf_control?.control_id || mapping.source_ref || 'Unknown'}
                                </span>
                                {mapping.mapping_strength && (
                                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                                    mapping.mapping_strength === 'full'
                                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                      : mapping.mapping_strength === 'partial'
                                      ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                                      : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                                  }`}>
                                    {mapping.mapping_strength}
                                  </span>
                                )}
                              </div>
                              {mapping.scf_control?.title && (
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                  {mapping.scf_control.title}
                                </p>
                              )}
                            </div>
                          ))}
                          {selectedControl.scfMappings.length > 10 && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-2">
                              + {selectedControl.scfMappings.length - 10} more mappings
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Related Risks */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                          Related Risks
                          {relatedRisks.length > 0 && (
                            <span className="ml-2 text-xs font-normal text-gray-500 dark:text-gray-400">
                              {riskThreatFilter && filteredRisks.length !== relatedRisks.length
                                ? `(${filteredRisks.length} of ${relatedRisks.length})`
                                : `(${relatedRisks.length})`}
                            </span>
                          )}
                        </h5>
                      </div>
                      {risksLoading ? (
                        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm">
                          <div className="animate-spin h-4 w-4 border-2 border-indigo-500 border-t-transparent rounded-full"></div>
                          Loading risks...
                        </div>
                      ) : relatedRisks.length === 0 ? (
                        <p className="text-gray-500 dark:text-gray-400 text-sm">
                          {selectedControl.scfMappings.length === 0
                            ? 'No SCF mappings, so no linked risks.'
                            : 'No risks linked to the associated SCF controls.'}
                        </p>
                      ) : filteredRisks.length === 0 ? (
                        <p className="text-gray-500 dark:text-gray-400 text-sm">
                          No risks match the filter "{riskThreatFilter}"
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {filteredRisks.map((risk) => (
                            <div
                              key={risk.id}
                              className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-100 dark:border-red-800"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-red-700 dark:text-red-300 font-semibold text-sm">
                                  {risk.risk_id || risk.title}
                                </span>
                                {risk.category && (
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">
                                    {risk.category}
                                  </span>
                                )}
                              </div>
                              {risk.title && risk.risk_id && (
                                <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 font-medium">
                                  {risk.title}
                                </p>
                              )}
                              {risk.description && (
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                                  {risk.description}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Related Threats */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                          Related Threats
                          {relatedThreats.length > 0 && (
                            <span className="ml-2 text-xs font-normal text-gray-500 dark:text-gray-400">
                              {riskThreatFilter && filteredThreats.length !== relatedThreats.length
                                ? `(${filteredThreats.length} of ${relatedThreats.length})`
                                : `(${relatedThreats.length})`}
                            </span>
                          )}
                        </h5>
                      </div>
                      {threatsLoading ? (
                        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm">
                          <div className="animate-spin h-4 w-4 border-2 border-purple-500 border-t-transparent rounded-full"></div>
                          Loading threats...
                        </div>
                      ) : relatedThreats.length === 0 ? (
                        <p className="text-gray-500 dark:text-gray-400 text-sm">
                          {selectedControl.scfMappings.length === 0
                            ? 'No SCF mappings, so no linked threats.'
                            : 'No threats linked to the associated SCF controls.'}
                        </p>
                      ) : filteredThreats.length === 0 ? (
                        <p className="text-gray-500 dark:text-gray-400 text-sm">
                          No threats match the filter "{riskThreatFilter}"
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {filteredThreats.map((threat) => (
                            <div
                              key={threat.id}
                              className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-100 dark:border-purple-800"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-purple-700 dark:text-purple-300 font-semibold text-sm">
                                  {threat.threat_id || threat.name}
                                </span>
                                {threat.category && (
                                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                                    threat.category === 'natural'
                                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                                      : 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                                  }`}>
                                    {threat.category === 'natural' ? '🌪️ Natural' : '👤 Manmade'}
                                  </span>
                                )}
                              </div>
                              {threat.name && threat.threat_id && (
                                <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 font-medium">
                                  {threat.name}
                                </p>
                              )}
                              {threat.threat_grouping && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                  Grouping: {threat.threat_grouping}
                                </p>
                              )}
                              {threat.description && (
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                                  {threat.description}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!selectedFramework && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
          <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-gray-100">
            Select a Framework
          </h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
            Choose a compliance framework from the dropdown above to view its details, structure, and SCF control mappings.
          </p>
        </div>
      )}
    </div>
  )
}
