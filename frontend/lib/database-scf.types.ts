// ============================================================================
// Database Types for GRC Platform - SCF-Centric Model
// Generated for: SCF + ICM + C|P-RMM + C|P-CMM Integrated Schema
// ============================================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// ============================================================================
// ENUMS
// ============================================================================

export type MaturityLevel = 'L0' | 'L1' | 'L2' | 'L3' | 'L4' | 'L5'

export const MaturityLevelLabels: Record<MaturityLevel, string> = {
  L0: 'Not Performed',
  L1: 'Performed Informally',
  L2: 'Planned & Tracked',
  L3: 'Well Defined',
  L4: 'Quantitatively Controlled',
  L5: 'Continuously Improving'
}

export type ObligationType = 'statutory' | 'regulatory' | 'contractual'

export type AssetType = 'people' | 'process' | 'technology' | 'data' | 'facility'

export type RiskCategory = 
  | 'strategic' 
  | 'operational' 
  | 'compliance' 
  | 'financial' 
  | 'reputational' 
  | 'technology' 
  | 'third_party'

export type ThreatCategory = 'natural' | 'manmade'

export type RiskTreatmentDecision = 'reduce' | 'avoid' | 'transfer' | 'accept'

export type AssessmentRigor = 'L1' | 'L2' | 'L3'

export const AssessmentRigorLabels: Record<AssessmentRigor, string> = {
  L1: 'Standard',
  L2: 'Enhanced',
  L3: 'Comprehensive'
}

export type FindingSeverity = 'observation' | 'significant_deficiency' | 'material_weakness'

export type ConformityStatus = 
  | 'strictly_conforms' 
  | 'conforms' 
  | 'significant_deficiency' 
  | 'material_weakness'

export type UserRole = 'admin' | 'manager'

// ============================================================================
// SCF CONTROLS (Central Hub)
// ============================================================================

export interface SCFControl {
  id: string
  control_id: string // SCF identifier (e.g., GOV-01)
  title: string
  description: string
  domain: string
  
  // Classification
  weight: number
  is_material_control: boolean
  is_mcr: boolean // Minimum Compliance Requirement
  is_dsr: boolean // Discretionary Security Requirement
  
  // PPTDF Applicability
  applicability_people: boolean
  applicability_processes: boolean
  applicability_technology: boolean
  applicability_data: boolean
  applicability_facilities: boolean
  
  // Metadata
  scf_version: string | null
  metadata: Json
  created_at: string
  updated_at: string
}

// ============================================================================
// OBLIGATIONS & REQUIREMENTS
// ============================================================================

export interface Obligation {
  id: string
  name: string
  type: ObligationType
  jurisdiction: string | null
  description: string | null
  source_reference: string | null
  effective_date: string | null
  status: string
  metadata: Json
  created_at: string
}

export interface Requirement {
  id: string
  obligation_id: string
  statement: string
  category: string | null
  priority: string | null
  mandatory_flag: boolean
  metadata: Json
  created_at: string
}

export interface ControlRequirement {
  id: string
  control_id: string
  requirement_id: string
  mapping_type: string | null
  mapping_notes: string | null
  created_at: string
}

// ============================================================================
// EXTERNAL FRAMEWORKS & MAPPINGS
// ============================================================================

export interface Framework {
  id: string
  code: string
  name: string
  version: string | null
  description: string | null
  created_at: string
}

export interface ExternalControl {
  id: string
  framework_id: string
  ref_code: string
  description: string
  metadata: Json
  created_at: string
}

export interface SCFControlMapping {
  id: string
  scf_control_id: string
  external_control_id: string
  framework_id: string
  mapping_strength: string | null
  confidence: number | null
  notes: string | null
  created_at: string
}

// ============================================================================
// POLICIES, STANDARDS, PROCEDURES
// ============================================================================

export interface PolicyStatement {
  id: string
  org_id: string
  title: string
  description: string | null
  owner: string | null
  status: string
  version: string | null
  last_reviewed_date: string | null
  next_review_date: string | null
  body: string | null
  metadata: Json
  created_at: string
  updated_at: string
}

export interface StandardStatement {
  id: string
  org_id: string
  title: string
  description: string | null
  owner: string | null
  status: string
  version: string | null
  last_reviewed_date: string | null
  body: string | null
  metadata: Json
  created_at: string
  updated_at: string
}

export interface Procedure {
  id: string
  org_id: string
  title: string
  description: string | null
  owner: string | null
  status: string
  version: string | null
  last_reviewed_date: string | null
  body: string | null
  metadata: Json
  created_at: string
  updated_at: string
}

// ============================================================================
// ASSETS
// ============================================================================

export interface Asset {
  id: string
  org_id: string
  name: string
  asset_type: AssetType
  description: string | null
  business_owner: string | null
  technical_owner: string | null
  criticality: string | null
  metadata: Json
  created_at: string
}

// ============================================================================
// THREATS & RISKS
// ============================================================================

export interface Threat {
  id: string
  name: string
  category: ThreatCategory
  description: string | null
  is_material_threat: boolean
  references: string | null
  metadata: Json
  created_at: string
}

export interface Risk {
  id: string
  org_id: string
  risk_id: string
  title: string
  description: string | null
  category: RiskCategory | null
  
  // Relationships
  primary_asset_id: string | null
  threat_id: string | null
  risk_owner: string | null
  
  // C|P-RMM Scoring
  impact_effect: number | null
  occurrence_likelihood: number | null
  inherent_risk_score: number | null
  residual_risk_score: number | null
  
  // Risk Appetite & Tolerance
  risk_tolerance_band: string | null
  risk_threshold: number | null
  risk_appetite_tag: string | null
  
  status: string
  metadata: Json
  created_at: string
  updated_at: string
}

export interface RiskControl {
  risk_id: string
  control_id: string
  control_effectiveness: string | null
}

// ============================================================================
// INCIDENTS
// ============================================================================

export interface Incident {
  id: string
  org_id: string
  title: string
  description: string | null
  date_detected: string | null
  impact_summary: string | null
  status: string
  is_material_incident: boolean
  related_risk_id: string | null
  metadata: Json
  created_at: string
}

// ============================================================================
// MATURITY (C|P-CMM)
// ============================================================================

export interface MaturityTarget {
  id: string
  org_id: string
  scope_type: string
  scope_ref_id: string | null
  target_level: MaturityLevel
  negligence_threshold: MaturityLevel | null
  rationale: string | null
  effective_date: string | null
  metadata: Json
  created_at: string
}

export interface MaturityAssessment {
  id: string
  org_id: string
  control_id: string
  assessment_id: string | null
  assessed_level: MaturityLevel
  evidence_summary: string | null
  reviewer: string | null
  assessment_date: string | null
  metadata: Json
  created_at: string
}

// ============================================================================
// ASSESSMENTS & EVIDENCE
// ============================================================================

export interface Assessment {
  id: string
  org_id: string
  name: string
  description: string | null
  scope_description: string | null
  rigor_level: AssessmentRigor
  start_date: string | null
  end_date: string | null
  assessor_type: string | null
  status: string
  metadata: Json
  created_at: string
}

export interface AssessmentObjective {
  id: string
  control_id: string
  statement: string
  evidence_expected: string | null
  metadata: Json
  created_at: string
}

export interface EvidenceItem {
  id: string
  assessment_id: string
  ao_id: string
  evidence_type: string | null
  location: string | null
  reviewer: string | null
  review_date: string | null
  notes: string | null
  metadata: Json
  created_at: string
}

export interface Finding {
  id: string
  assessment_id: string
  control_id: string
  severity: FindingSeverity
  description: string
  related_risk_id: string | null
  recommended_action: string | null
  status: string
  metadata: Json
  created_at: string
}

export interface ConformityReport {
  id: string
  assessment_id: string
  org_id: string
  control_id: string
  conformity_status: ConformityStatus
  summary: string | null
  report_date: string | null
  metadata: Json
  created_at: string
}

// ============================================================================
// RISK TREATMENT & POA&M
// ============================================================================

export interface RiskTreatment {
  id: string
  risk_id: string
  decision: RiskTreatmentDecision
  justification: string | null
  approval_level: string | null
  approver: string | null
  effective_date: string | null
  planned_actions: string | null
  status: string
  metadata: Json
  created_at: string
}

export interface POAMTask {
  id: string
  org_id: string
  treatment_id: string | null
  control_id: string | null
  finding_id: string | null
  title: string
  description: string | null
  owner: string | null
  due_date: string | null
  status: string
  priority: string | null
  metadata: Json
  created_at: string
  updated_at: string
}

// ============================================================================
// ORGANIZATION & USER (from original schema)
// ============================================================================

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

// ============================================================================
// VIEWS
// ============================================================================

export interface ControlCoverageView {
  id: string
  control_id: string
  title: string
  domain: string
  is_mcr: boolean
  is_dsr: boolean
  policy_count: number
  standard_count: number
  procedure_count: number
  asset_count: number
  risk_count: number
}

export interface RiskExposureView {
  id: string
  risk_id: string
  title: string
  category: RiskCategory | null
  inherent_risk_score: number | null
  residual_risk_score: number | null
  risk_tolerance_band: string | null
  status: string
  treatment_decision: RiskTreatmentDecision | null
  mitigating_controls_count: number
}

export interface MaturityGapView {
  control_id: string
  scf_id: string
  title: string
  domain: string
  target_level: MaturityLevel | null
  negligence_threshold: MaturityLevel | null
  assessed_level: MaturityLevel | null
  assessment_date: string | null
  gap_status: 'CRITICAL' | 'GAP' | 'MEETS_TARGET' | 'NOT_ASSESSED'
}

// ============================================================================
// DATABASE SCHEMA TYPE
// ============================================================================

export interface Database {
  public: {
    Tables: {
      // Core SCF
      scf_controls: {
        Row: SCFControl
        Insert: Omit<SCFControl, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<SCFControl, 'id' | 'created_at' | 'updated_at'>>
      }
      
      // Obligations & Requirements
      obligations: {
        Row: Obligation
        Insert: Omit<Obligation, 'id' | 'created_at'>
        Update: Partial<Omit<Obligation, 'id' | 'created_at'>>
      }
      requirements: {
        Row: Requirement
        Insert: Omit<Requirement, 'id' | 'created_at'>
        Update: Partial<Omit<Requirement, 'id' | 'created_at'>>
      }
      control_requirements: {
        Row: ControlRequirement
        Insert: Omit<ControlRequirement, 'id' | 'created_at'>
        Update: Partial<Omit<ControlRequirement, 'id' | 'created_at'>>
      }
      
      // External Frameworks
      frameworks: {
        Row: Framework
        Insert: Omit<Framework, 'id' | 'created_at'>
        Update: Partial<Omit<Framework, 'id' | 'created_at'>>
      }
      external_controls: {
        Row: ExternalControl
        Insert: Omit<ExternalControl, 'id' | 'created_at'>
        Update: Partial<Omit<ExternalControl, 'id' | 'created_at'>>
      }
      scf_control_mappings: {
        Row: SCFControlMapping
        Insert: Omit<SCFControlMapping, 'id' | 'created_at'>
        Update: Partial<Omit<SCFControlMapping, 'id' | 'created_at'>>
      }
      
      // Policies, Standards, Procedures
      policy_statements: {
        Row: PolicyStatement
        Insert: Omit<PolicyStatement, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<PolicyStatement, 'id' | 'created_at' | 'updated_at'>>
      }
      standard_statements: {
        Row: StandardStatement
        Insert: Omit<StandardStatement, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<StandardStatement, 'id' | 'created_at' | 'updated_at'>>
      }
      procedures: {
        Row: Procedure
        Insert: Omit<Procedure, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Procedure, 'id' | 'created_at' | 'updated_at'>>
      }
      
      // Assets
      assets: {
        Row: Asset
        Insert: Omit<Asset, 'id' | 'created_at'>
        Update: Partial<Omit<Asset, 'id' | 'created_at'>>
      }
      
      // Threats & Risks
      threats: {
        Row: Threat
        Insert: Omit<Threat, 'id' | 'created_at'>
        Update: Partial<Omit<Threat, 'id' | 'created_at'>>
      }
      risks: {
        Row: Risk
        Insert: Omit<Risk, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Risk, 'id' | 'created_at' | 'updated_at'>>
      }
      risk_controls: {
        Row: RiskControl
        Insert: RiskControl
        Update: Partial<RiskControl>
      }
      
      // Incidents
      incidents: {
        Row: Incident
        Insert: Omit<Incident, 'id' | 'created_at'>
        Update: Partial<Omit<Incident, 'id' | 'created_at'>>
      }
      
      // Maturity
      maturity_targets: {
        Row: MaturityTarget
        Insert: Omit<MaturityTarget, 'id' | 'created_at'>
        Update: Partial<Omit<MaturityTarget, 'id' | 'created_at'>>
      }
      maturity_assessments: {
        Row: MaturityAssessment
        Insert: Omit<MaturityAssessment, 'id' | 'created_at'>
        Update: Partial<Omit<MaturityAssessment, 'id' | 'created_at'>>
      }
      
      // Assessments
      assessments: {
        Row: Assessment
        Insert: Omit<Assessment, 'id' | 'created_at'>
        Update: Partial<Omit<Assessment, 'id' | 'created_at'>>
      }
      assessment_objectives: {
        Row: AssessmentObjective
        Insert: Omit<AssessmentObjective, 'id' | 'created_at'>
        Update: Partial<Omit<AssessmentObjective, 'id' | 'created_at'>>
      }
      evidence_items: {
        Row: EvidenceItem
        Insert: Omit<EvidenceItem, 'id' | 'created_at'>
        Update: Partial<Omit<EvidenceItem, 'id' | 'created_at'>>
      }
      findings: {
        Row: Finding
        Insert: Omit<Finding, 'id' | 'created_at'>
        Update: Partial<Omit<Finding, 'id' | 'created_at'>>
      }
      conformity_reports: {
        Row: ConformityReport
        Insert: Omit<ConformityReport, 'id' | 'created_at'>
        Update: Partial<Omit<ConformityReport, 'id' | 'created_at'>>
      }
      
      // Risk Treatment
      risk_treatments: {
        Row: RiskTreatment
        Insert: Omit<RiskTreatment, 'id' | 'created_at'>
        Update: Partial<Omit<RiskTreatment, 'id' | 'created_at'>>
      }
      poam_tasks: {
        Row: POAMTask
        Insert: Omit<POAMTask, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<POAMTask, 'id' | 'created_at' | 'updated_at'>>
      }
      
      // Organization & Users
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
    }
    
    Views: {
      v_control_coverage: {
        Row: ControlCoverageView
      }
      v_risk_exposure: {
        Row: RiskExposureView
      }
      v_maturity_gaps: {
        Row: MaturityGapView
      }
    }
  }
}
