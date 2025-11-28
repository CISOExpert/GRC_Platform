import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export type FrameworkMetadata = {
  id: string
  framework_id: string
  reference_key: string
  metadata: Record<string, any>
  created_at: string
  updated_at: string
}

/**
 * Hook to fetch all metadata for a framework
 */
export function useFrameworkMetadata(frameworkId: string | undefined) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['framework-metadata', frameworkId],
    queryFn: async () => {
      if (!frameworkId) return []

      const { data, error } = await supabase
        .from('framework_metadata')
        .select('*')
        .eq('framework_id', frameworkId)
        .order('reference_key')

      if (error) throw error
      return data as FrameworkMetadata[]
    },
    enabled: !!frameworkId,
    staleTime: 10 * 60 * 1000, // 10 minutes - metadata rarely changes
  })
}

/**
 * Hook to fetch metadata for a specific reference key (e.g., domain)
 */
export function useFrameworkMetadataByKey(
  frameworkId: string | undefined,
  referenceKey: string | undefined
) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['framework-metadata', frameworkId, referenceKey],
    queryFn: async () => {
      if (!frameworkId || !referenceKey) return null

      const { data, error } = await supabase
        .from('framework_metadata')
        .select('*')
        .eq('framework_id', frameworkId)
        .eq('reference_key', referenceKey)
        .single()

      if (error) {
        if (error.code === 'PGRST116') return null // Not found
        throw error
      }
      return data as FrameworkMetadata
    },
    enabled: !!frameworkId && !!referenceKey,
    staleTime: 10 * 60 * 1000,
  })
}

/**
 * Hook to fetch metadata keyed by reference_key for easy lookup
 */
export function useFrameworkMetadataMap(frameworkId: string | undefined) {
  const { data: metadata, ...rest } = useFrameworkMetadata(frameworkId)

  const metadataMap = metadata?.reduce((acc, item) => {
    acc[item.reference_key] = item.metadata
    return acc
  }, {} as Record<string, Record<string, any>>) ?? {}

  return {
    ...rest,
    data: metadataMap,
    rawData: metadata
  }
}

/**
 * Hook to get SCF domain metadata specifically
 * Extracts the domain prefix from a control ref_code and fetches its metadata
 */
export function useSCFDomainMetadata(controlRefCode: string | undefined) {
  const supabase = createClient()

  // Extract domain prefix from control ref_code (e.g., "GOV-01" -> "GOV")
  const domainPrefix = controlRefCode?.match(/^([A-Z]+)/)?.[1]

  return useQuery({
    queryKey: ['scf-domain-metadata', domainPrefix],
    queryFn: async () => {
      if (!domainPrefix) return null

      // First get SCF framework ID
      const { data: scfFramework } = await supabase
        .from('frameworks')
        .select('id')
        .eq('code', 'SCF')
        .single()

      if (!scfFramework) return null

      // Then get domain metadata
      const { data, error } = await supabase
        .from('framework_metadata')
        .select('*')
        .eq('framework_id', scfFramework.id)
        .eq('reference_key', domainPrefix)
        .single()

      if (error) {
        if (error.code === 'PGRST116') return null
        throw error
      }
      return data as FrameworkMetadata
    },
    enabled: !!domainPrefix,
    staleTime: 10 * 60 * 1000,
  })
}
