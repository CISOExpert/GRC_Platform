'use client'

import { useDashboardStats } from '@/lib/hooks/useDashboard'
import Link from 'next/link'
import { TriangleAlert, Shield, Zap, Cloud, Skull } from 'lucide-react'
import FrameworkCoverageCards from './components/FrameworkCoverageCards'

// NIST CSF Function colors
const nistFunctionColors: Record<string, { bg: string; text: string; bar: string }> = {
  'Govern': { bg: 'bg-violet-100', text: 'text-violet-700', bar: 'bg-violet-500' },
  'Identify': { bg: 'bg-blue-100', text: 'text-blue-700', bar: 'bg-blue-500' },
  'Protect': { bg: 'bg-green-100', text: 'text-green-700', bar: 'bg-green-500' },
  'Detect': { bg: 'bg-yellow-100', text: 'text-yellow-700', bar: 'bg-yellow-500' },
  'Respond': { bg: 'bg-orange-100', text: 'text-orange-700', bar: 'bg-orange-500' },
  'Recover': { bg: 'bg-red-100', text: 'text-red-700', bar: 'bg-red-500' },
  'Unassigned': { bg: 'bg-gray-100', text: 'text-gray-700', bar: 'bg-gray-400' },
}

// Risk Grouping colors
const groupingColors: Record<string, { bg: string; text: string; bar: string }> = {
  'Access Control': { bg: 'bg-blue-50', text: 'text-blue-700', bar: 'bg-blue-500' },
  'Asset Management': { bg: 'bg-emerald-50', text: 'text-emerald-700', bar: 'bg-emerald-500' },
  'Business Continuity': { bg: 'bg-amber-50', text: 'text-amber-700', bar: 'bg-amber-500' },
  'Exposure': { bg: 'bg-red-50', text: 'text-red-700', bar: 'bg-red-500' },
  'Governance': { bg: 'bg-purple-50', text: 'text-purple-700', bar: 'bg-purple-500' },
  'Incident Response': { bg: 'bg-orange-50', text: 'text-orange-700', bar: 'bg-orange-500' },
  'Situational Awareness': { bg: 'bg-cyan-50', text: 'text-cyan-700', bar: 'bg-cyan-500' },
  'Supply Chain': { bg: 'bg-pink-50', text: 'text-pink-700', bar: 'bg-pink-500' },
  'Unassigned': { bg: 'bg-gray-50', text: 'text-gray-700', bar: 'bg-gray-400' },
}

export default function DashboardPage() {
  const { data: stats, isLoading, error } = useDashboardStats()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-600">Error loading dashboard: {error?.message}</div>
      </div>
    )
  }

  const {
    controlsCount,
    aoCount,
    evidenceCount,
    organizations,
    mcrCount,
    domainCount,
    pptdfStats,
    topDomains,
    riskStats,
    threatStats
  } = stats

  return (
    <div className="px-4 sm:px-6 lg:px-8 animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          GRC Dashboard
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Secure Controls Framework 2025.3.1 - Comprehensive View
        </p>
      </div>

      {/* Organization's Selected Frameworks */}
      <FrameworkCoverageCards />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {/* SCF Controls */}
        <Link href="/frameworks" className="group">
          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-lg rounded-xl hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-gray-700 group-hover:border-indigo-500">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Implementable SCF Controls</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-2">{controlsCount.toLocaleString()}</p>
                  <div className="flex items-center gap-1 mt-2">
                    <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">{mcrCount} MCR Controls</p>
                    <div className="group/tooltip relative">
                      <svg className="h-3.5 w-3.5 text-gray-400 hover:text-indigo-600 cursor-help" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="invisible group-hover/tooltip:visible absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 px-3 py-2 text-xs text-white bg-gray-900 dark:bg-gray-700 rounded-lg shadow-lg z-50">
                        <div className="font-semibold mb-1">Leaf Controls Only</div>
                        Shows implementable controls only. Excludes 248 organizational parent controls that group sub-controls. Use Advanced Filters in Mapping Explorer to include organizational controls.
                        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1">
                          <div className="border-4 border-transparent border-t-gray-900 dark:border-t-gray-700"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="h-12 w-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                  <svg className="h-6 w-6 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900/50 px-6 py-3 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400">{domainCount} domains</p>
            </div>
          </div>
        </Link>

        {/* Assessment Objectives */}
        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-lg rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Assessment Objectives</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-2">{aoCount.toLocaleString()}</p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2 font-medium">Testing Criteria</p>
              </div>
              <div className="h-12 w-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
                <svg className="h-6 w-6 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-900/50 px-6 py-3 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400">Linked to controls</p>
          </div>
        </div>

        {/* Evidence Templates */}
        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-lg rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Evidence Templates</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-2">{evidenceCount}</p>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 font-medium">ERL Items</p>
              </div>
              <div className="h-12 w-12 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
                <svg className="h-6 w-6 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-900/50 px-6 py-3 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400">Documentation artifacts</p>
          </div>
        </div>

        {/* Organizations */}
        <Link href="/organizations" className="group">
          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-lg rounded-xl hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-gray-700 group-hover:border-blue-500">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Organizations</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-2">{organizations.length}</p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-2 font-medium">Multi-tenant</p>
                </div>
                <div className="h-12 w-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                  <svg className="h-6 w-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900/50 px-6 py-3 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400">Active tenants</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Risk & Threat Catalog Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 mb-8">
        {/* Risk Catalog */}
        <Link href="/explore/risks" className="group">
          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-lg rounded-xl hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-gray-700 group-hover:border-red-500">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Risk Catalog</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-2">{riskStats.totalRisks}</p>
                  <p className="text-xs text-red-600 dark:text-red-400 mt-2 font-medium">
                    {Object.keys(riskStats.byGrouping).length} groupings • {Object.keys(riskStats.byNistFunction).length} NIST functions
                  </p>
                </div>
                <div className="h-12 w-12 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                  <TriangleAlert className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900/50 px-6 py-3 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400">SCF Risk Taxonomy</p>
            </div>
          </div>
        </Link>

        {/* Threat Catalog */}
        <Link href="/explore/threats" className="group">
          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-lg rounded-xl hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-gray-700 group-hover:border-orange-500">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Threat Catalog</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-2">{threatStats.totalThreats}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="inline-flex items-center gap-1 text-xs text-teal-600 dark:text-teal-400 font-medium">
                      <Cloud className="h-3 w-3" />
                      {threatStats.naturalThreats} Natural
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs text-red-600 dark:text-red-400 font-medium">
                      <Skull className="h-3 w-3" />
                      {threatStats.manmadeThreats} Man-Made
                    </span>
                  </div>
                </div>
                <div className="h-12 w-12 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Zap className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900/50 px-6 py-3 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {threatStats.materialThreats} material threat{threatStats.materialThreats !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </Link>
      </div>

      {/* Risk Distribution Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Risks by NIST CSF Function */}
        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Risks by NIST CSF Function</h2>
          <div className="space-y-3">
            {Object.entries(riskStats.byNistFunction)
              .sort(([, a], [, b]) => b - a)
              .map(([func, count]) => {
                const percentage = ((count / riskStats.totalRisks) * 100).toFixed(0)
                const colors = nistFunctionColors[func] || nistFunctionColors['Unassigned']
                return (
                  <div key={func}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className={`font-medium px-2 py-0.5 rounded ${colors.bg} ${colors.text}`}>{func}</span>
                      <span className="text-gray-600 dark:text-gray-400">{count} ({percentage}%)</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div className={`${colors.bar} h-2 rounded-full transition-all duration-500`} style={{ width: `${percentage}%` }}></div>
                    </div>
                  </div>
                )
              })}
          </div>
        </div>

        {/* Risks by Grouping */}
        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Risks by Grouping</h2>
          <div className="space-y-3">
            {Object.entries(riskStats.byGrouping)
              .sort(([, a], [, b]) => b - a)
              .map(([grouping, count]) => {
                const percentage = ((count / riskStats.totalRisks) * 100).toFixed(0)
                const colors = groupingColors[grouping] || groupingColors['Unassigned']
                return (
                  <div key={grouping}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className={`font-medium px-2 py-0.5 rounded ${colors.bg} ${colors.text}`}>{grouping}</span>
                      <span className="text-gray-600 dark:text-gray-400">{count} ({percentage}%)</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div className={`${colors.bar} h-2 rounded-full transition-all duration-500`} style={{ width: `${percentage}%` }}></div>
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      </div>

      {/* PPTDF Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">PPTDF Distribution</h2>
          <div className="space-y-4">
            {Object.entries(pptdfStats).map(([key, value]) => {
              const percentage = ((value / controlsCount) * 100).toFixed(1)
              const colors = {
                people: 'bg-blue-500',
                processes: 'bg-indigo-500',
                technology: 'bg-purple-500',
                data: 'bg-pink-500',
                facilities: 'bg-red-500'
              }
              return (
                <div key={key}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-gray-700 dark:text-gray-300 capitalize">{key}</span>
                    <span className="text-gray-600 dark:text-gray-400">{value} ({percentage}%)</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div className={`${colors[key as keyof typeof colors]} h-2 rounded-full transition-all duration-500`} style={{ width: `${percentage}%` }}></div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Top 5 Domains</h2>
          <div className="space-y-3">
            {topDomains.map(([domain, count], index) => (
              <div key={domain} className="flex items-center justify-between">
                <div className="flex items-center flex-1">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-semibold mr-3">
                    {index + 1}
                  </span>
                  <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{domain}</span>
                </div>
                <span className="ml-4 text-sm font-semibold text-gray-900 dark:text-gray-100">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Database Status */}
      {organizations.length === 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-amber-800 dark:text-amber-200">Get Started</h3>
              <div className="mt-2 text-sm text-amber-700 dark:text-amber-300">
                <p>No organizations found. Create your first organization to start using the GRC platform.</p>
              </div>
              <div className="mt-4">
                <Link href="/organizations" className="text-sm font-medium text-amber-800 dark:text-amber-200 hover:text-amber-700 dark:hover:text-amber-100">
                  Create Organization →
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
