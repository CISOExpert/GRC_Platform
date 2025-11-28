'use client'

import Link from 'next/link';
import { Database, TriangleAlert, Network, Zap } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

export default function ExplorePage() {
  const supabase = createClient();

  // Fetch dynamic stats
  const { data: stats } = useQuery({
    queryKey: ['explore-stats'],
    queryFn: async () => {
      const [frameworksResult, mappingsResult, risksResult, threatsResult] = await Promise.all([
        supabase.from('frameworks').select('id', { count: 'exact', head: true }),
        supabase.from('framework_crosswalks').select('id', { count: 'exact', head: true }),
        supabase.from('risks').select('id', { count: 'exact', head: true }).eq('status', 'catalog'),
        supabase.from('threats').select('id', { count: 'exact', head: true })
      ]);

      return {
        frameworkCount: frameworksResult.count || 0,
        mappingCount: mappingsResult.count || 0,
        riskCount: risksResult.count || 0,
        threatCount: threatsResult.count || 0
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Dynamic stats for cards
  const frameworkMappingStats = stats
    ? `${stats.mappingCount.toLocaleString()} mappings across ${stats.frameworkCount} frameworks`
    : 'Loading...';
  const riskCatalogStats = stats
    ? `${stats.riskCount} risks in catalog`
    : 'Loading...';
  const threatCatalogStats = stats
    ? `${stats.threatCount} threats in catalog`
    : 'Loading...';

  const explorationTypes = [
    {
      title: 'Framework Mappings',
      description: `Explore relationships between SCF controls and ${stats?.frameworkCount || '35+'}  compliance frameworks including NIST, ISO, PCI DSS, and more.`,
      icon: Database,
      href: '/explore/frameworks/mappings',
      stats: frameworkMappingStats,
      color: 'blue',
      available: true
    },
    {
      title: 'Risk Catalog',
      description: 'Browse the SCF Risk Taxonomy (R-AC, R-GV, R-IR, etc.) and understand risk relationships to controls.',
      icon: TriangleAlert,
      href: '/explore/risks',
      stats: riskCatalogStats,
      color: 'red',
      available: true
    },
    {
      title: 'Threat Catalog',
      description: 'Explore natural and man-made threat taxonomies (NT-1 through MT-27) mapped to security controls.',
      icon: Zap,
      href: '/explore/threats',
      stats: threatCatalogStats,
      color: 'purple',
      available: true
    },
    {
      title: 'Control Relationships',
      description: 'Visualize dependencies, hierarchies, and relationships between controls across all frameworks.',
      icon: Network,
      href: '/explore/relationships',
      stats: 'Coming soon',
      color: 'green',
      available: false
    }
  ];

  const getColorClasses = (color: string, available: boolean) => {
    if (!available) {
      return {
        border: 'border-gray-300',
        iconBg: 'bg-gray-100',
        iconText: 'text-gray-400',
        titleText: 'text-gray-500',
        hoverBorder: ''
      };
    }

    const colors = {
      blue: {
        border: 'border-blue-200',
        iconBg: 'bg-blue-50',
        iconText: 'text-blue-600',
        titleText: 'text-blue-900',
        hoverBorder: 'hover:border-blue-400'
      },
      red: {
        border: 'border-red-200',
        iconBg: 'bg-red-50',
        iconText: 'text-red-600',
        titleText: 'text-red-900',
        hoverBorder: 'hover:border-red-400'
      },
      purple: {
        border: 'border-purple-200',
        iconBg: 'bg-purple-50',
        iconText: 'text-purple-600',
        titleText: 'text-purple-900',
        hoverBorder: 'hover:border-purple-400'
      },
      green: {
        border: 'border-green-200',
        iconBg: 'bg-green-50',
        iconText: 'text-green-600',
        titleText: 'text-green-900',
        hoverBorder: 'hover:border-green-400'
      }
    };

    return colors[color as keyof typeof colors] || colors.blue;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold text-gray-900">Explore</h1>
          <p className="mt-2 text-gray-600">
            Navigate through framework mappings, risks, threats, and control relationships 
            across the entire SCF ecosystem.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-sm text-gray-600">Total Frameworks</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">
              {stats?.frameworkCount?.toLocaleString() ?? '—'}
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-sm text-gray-600">Control Mappings</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">
              {stats?.mappingCount?.toLocaleString() ?? '—'}
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-sm text-gray-600">Risk Catalog</div>
            <div className="text-2xl font-bold text-red-600 mt-1">
              {stats?.riskCount?.toLocaleString() ?? '—'}
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-sm text-gray-600">Threat Catalog</div>
            <div className="text-2xl font-bold text-purple-600 mt-1">
              {stats?.threatCount?.toLocaleString() ?? '—'}
            </div>
          </div>
        </div>

        {/* Exploration Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {explorationTypes.map((type) => {
            const Icon = type.icon;
            const colors = getColorClasses(type.color, type.available);
            
            const CardContent = (
              <div className={`bg-white rounded-lg border-2 ${colors.border} ${colors.hoverBorder} p-6 transition-all ${type.available ? 'hover:shadow-lg cursor-pointer' : 'opacity-75 cursor-not-allowed'}`}>
                <div className="flex items-start space-x-4">
                  <div className={`${colors.iconBg} rounded-lg p-3`}>
                    <Icon className={`h-6 w-6 ${colors.iconText}`} />
                  </div>
                  <div className="flex-1">
                    <h3 className={`text-lg font-semibold ${colors.titleText} flex items-center gap-2`}>
                      {type.title}
                      {!type.available && (
                        <span className="text-xs font-normal bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                          Coming Soon
                        </span>
                      )}
                    </h3>
                    <p className="mt-2 text-sm text-gray-600">
                      {type.description}
                    </p>
                    <div className="mt-4 text-xs text-gray-500 font-medium">
                      {type.stats}
                    </div>
                  </div>
                </div>
              </div>
            );

            return type.available ? (
              <Link key={type.title} href={type.href}>
                {CardContent}
              </Link>
            ) : (
              <div key={type.title}>
                {CardContent}
              </div>
            );
          })}
        </div>

        {/* Quick Links */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">Quick Links</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link href="/frameworks" className="text-blue-700 hover:text-blue-900 text-sm font-medium">
              → Browse All Controls
            </Link>
            <Link href="/organizations" className="text-blue-700 hover:text-blue-900 text-sm font-medium">
              → Manage Organizations
            </Link>
            <Link href="/policies" className="text-blue-700 hover:text-blue-900 text-sm font-medium">
              → Evidence Templates
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
