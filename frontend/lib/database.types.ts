// Database Types for GRC Platform
// Auto-generated types can be created with: supabase gen types typescript --local

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'admin' | 'manager'

export interface Organization {
  id: string
  parent_id: string | null
  name: string
  org_type: string | null
  metadata: Json
  created_at: string
}

export interface User {
  id: string
  email: string
  display_name: string | null
  created_at: string
}

export interface OrganizationMember {
  org_id: string
  user_id: string
  role: UserRole
}

export interface Framework {
  id: string
  code: string
  name: string
  version: string | null
  description: string | null
  created_at: string
}

export interface Regulation {
  id: string
  framework_id: string
  ref_code: string
  description: string
  metadata: Json
  created_at: string
}

export interface Policy {
  id: string
  org_id: string
  title: string
  status: string
  body: string | null
  metadata: Json
  created_at: string
}

export interface PolicyRegulation {
  policy_id: string
  regulation_id: string
  rationale: string | null
  confidence: number | null
}

export interface FrameworkCrosswalk {
  id: string
  source_framework_id: string
  source_ref: string
  target_framework_id: string
  target_ref: string
  confidence: number | null
  notes: string | null
  created_at: string
}

export interface RegulatoryEvent {
  id: string
  jurisdiction: string | null
  title: string
  summary: string | null
  effective_date: string | null
  source_url: string | null
  created_at: string
}

// Database schema type
export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: Organization
        Insert: Omit<Organization, 'id' | 'created_at'>
        Update: Partial<Omit<Organization, 'id' | 'created_at'>>
      }
      users: {
        Row: User
        Insert: Omit<User, 'created_at'>
        Update: Partial<Omit<User, 'id' | 'created_at'>>
      }
      organization_members: {
        Row: OrganizationMember
        Insert: OrganizationMember
        Update: Partial<OrganizationMember>
      }
      frameworks: {
        Row: Framework
        Insert: Omit<Framework, 'id' | 'created_at'>
        Update: Partial<Omit<Framework, 'id' | 'created_at'>>
      }
      regulations: {
        Row: Regulation
        Insert: Omit<Regulation, 'id' | 'created_at'>
        Update: Partial<Omit<Regulation, 'id' | 'created_at'>>
      }
      policies: {
        Row: Policy
        Insert: Omit<Policy, 'id' | 'created_at'>
        Update: Partial<Omit<Policy, 'id' | 'created_at'>>
      }
      policy_regulations: {
        Row: PolicyRegulation
        Insert: PolicyRegulation
        Update: Partial<PolicyRegulation>
      }
      framework_crosswalks: {
        Row: FrameworkCrosswalk
        Insert: Omit<FrameworkCrosswalk, 'id' | 'created_at'>
        Update: Partial<Omit<FrameworkCrosswalk, 'id' | 'created_at'>>
      }
      regulatory_events: {
        Row: RegulatoryEvent
        Insert: Omit<RegulatoryEvent, 'id' | 'created_at'>
        Update: Partial<Omit<RegulatoryEvent, 'id' | 'created_at'>>
      }
    }
  }
}
