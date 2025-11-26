# Framework Mapping Explorer - Structure & Design Documentation

**Last Updated:** November 24, 2025  
**Component:** `/frontend/app/(dashboard)/explore/frameworks/mappings/page.tsx`  
**Status:** Production - Source of Truth

---

## Table of Contents
1. [Overview](#overview)
2. [View Modes](#view-modes)
3. [Data Architecture](#data-architecture)
4. [UI Components](#ui-components)
5. [Visual Hierarchy](#visual-hierarchy)
6. [Color Scheme](#color-scheme)
7. [State Management](#state-management)
8. [Save/Load Views](#saveload-views)

---

## Overview

The Framework Mapping Explorer provides a dual-mode interface for exploring relationships between SCF (Secure Controls Framework) controls and 30+ compliance frameworks (NIST CSF, ISO 27001, CIS Controls, GDPR, etc.).

### Core Functionality
- **Bidirectional Views**: SCF-centric or Framework-centric navigation
- **Comparison Mode**: Compare primary framework against another framework
- **Multi-Framework Filtering**: Show additional framework mappings simultaneously
- **Hierarchical Display**: Nested structure preserving framework taxonomy
- **Saved Views**: Persist and reload custom configurations

---

## View Modes

### 1. SCF Primary View

**Purpose:** Start with SCF controls and see which framework controls map to them.

**Structure:**
```
SCF Parent Control (e.g., GOV-01)
├─ Framework Mappings (collapsed by default)
│  ├─ [Framework 1] Control Ref
│  ├─ [Framework 2] Control Ref
│  └─ [Framework 3] Control Ref
└─ Sub-Controls (collapsed by default)
   ├─ GOV-01.1
   │  └─ Framework Mappings (collapsed)
   ├─ GOV-01.2
   │  └─ Framework Mappings (collapsed)
   └─ GOV-01.3
      └─ Framework Mappings (collapsed)
```

**Key Features:**
- Shows SCF control ID, title, and domain
- Parent controls can have direct framework mappings
- Sub-controls inherit structure and can have their own mappings
- Filter panel controls which frameworks are displayed
- Collapsed groups prevent information overload

**Visual Example:**
```
┌─ SCF GOV-01 ──────────────────────────────────── 15 mappings ─┐
│  Cybersecurity & Data Protection Governance Program           │
│  Governance (GOV)                                              │
│                                                                │
│  ▸ Framework Mappings (4)                    [Indigo Theme]   │
│  ▸ Sub-Controls (3)                          [Gray Theme]     │
└────────────────────────────────────────────────────────────────┘
```

---

### 2. Framework Primary View

**Purpose:** Start with a framework (e.g., NIST CSF) and explore its control structure with mappings to other frameworks.

**Structure:**
```
Primary Framework Control (e.g., NIST CSF GV.RM-01)
├─ Expand to see controls mapped directly against [Node] (collapsed)
│  ├─ SCF GOV-01
│  │  ├─── [Compare To Framework] Control [Blue Tag]
│  │  └─── [Additional Framework] Control [Orange Tag]
│  ├─ SCF GOV-05
│  │  └─── [Compare To Framework] Control [Blue Tag]
│  └─ SCF PRM-01.1
│      ├─── [Compare To Framework] Control [Blue Tag]
│      └─── [Additional Framework] Control [Orange Tag]
└─ Child Controls (nested hierarchy)
   ├─ GV.RM-02
   ├─ GV.RM-03
   └─ GV.RM-04
```

**Three-Level Mapping System:**

1. **Primary Framework** (Purple): Selected framework showing its native structure
2. **Compare To Framework** (Blue): Optional framework for direct comparison
3. **Additional Frameworks** (Orange): Multiple frameworks selected from filter panel

**Visual Example:**
```
┌─ GV.RM-01 ──────────────────────────── 2 frameworks mapped to 4 controls ─┐
│  NIST CSF v2.0 Reference: GV.RM-01                           [Purple]      │
│  Risk Management Strategy                                                  │
│                                                                            │
│  ▸ Expand to see controls mapped directly against Risk Management... (4)  │
│                                                                            │
│    When expanded shows:                                                    │
│    ┌─ SCF GOV-01 ────────────────────────────────────────────┐            │
│    │  Cybersecurity & Data Protection Governance Program     │            │
│    │  ─────────────────────────────────────────────────      │            │
│    │  [CIS Controls v8: 1.1]  [ISO/IEC 27001: 6.1.1(a)]     │            │
│    │   ^Blue (Compare To)      ^Orange (Additional)          │            │
│    └──────────────────────────────────────────────────────────┘            │
│                                                                            │
│  ▾ GV.RM (7 items)                                          [Purple]      │
│    └─ GV.RM-02                                                             │
│    └─ GV.RM-03                                                             │
└────────────────────────────────────────────────────────────────────────────┘
```

**Key Features:**
- Preserves native framework hierarchy (Functions → Categories → Controls)
- SCF controls act as bridge between frameworks
- Direct mappings shown as inline tags
- Compare To framework highlighted in blue
- Additional frameworks shown in orange
- Only shows frameworks that actually map through same SCF control

---

## Data Architecture

### Data Flow

```
Database (Supabase)
    ↓
React Query Hooks (useControlMappings.ts)
    ↓
Hierarchy Builder (buildFrameworkHierarchy)
    ↓
Component State (groupedMappings)
    ↓
Recursive Rendering (renderFrameworkNode)
    ↓
UI Display
```

### Key Hooks

#### `useControlMappingsBySCF`
- **Purpose:** Fetch mappings for SCF Primary view
- **Parameters:** 
  - `frameworkIds`: Array of framework IDs to filter by
  - `searchQuery`: Optional search term
- **Returns:** Grouped mappings by SCF control ID with parent/sub-control structure

#### `useControlMappingsByFrameworkGrouped`
- **Purpose:** Fetch mappings for Framework Primary view
- **Parameters:**
  - `frameworkId`: Primary framework ID
  - `compareFrameworkId`: Optional comparison framework ID
  - `additionalFrameworkIds`: Array of additional framework IDs from filter panel
- **Returns:** Hierarchical structure with comparison and related mappings

### Data Structure

#### Node Structure (Framework Primary)
```typescript
{
  ref_code: string              // Control reference (e.g., "GV.RM-01")
  description: string           // Control description
  isLeaf: boolean              // Whether this is a leaf node
  scfMappings: Mapping[]       // SCF controls that map to this control
  comparisonMappings: Mapping[] // Compare To framework controls (blue)
  relatedMappings: Mapping[]   // Additional framework controls (orange)
  children: Record<string, Node> // Nested child controls
}
```

#### Mapping Structure
```typescript
{
  id: string
  scf_control: {
    control_id: string         // e.g., "GOV-01.1"
    title: string              // Control title
    domain: string             // e.g., "Governance (GOV)"
    description: string
  }
  framework: {
    id: string
    code: string               // e.g., "NIST-CSF"
    name: string               // e.g., "NIST Cybersecurity Framework"
    version: string            // e.g., "2.0"
  }
  external_control: {
    ref_code: string           // Framework-specific ref (e.g., "GV.RM-01")
    description: string
    metadata: object
  }
  mapping_strength: 'exact' | 'partial'
}
```

---

## UI Components

### Layout Structure

```
┌─────────────────────────────────────────────────────────────────┐
│ Top Navigation Bar                                              │
│ - Organization Selector                                         │
│ - User Menu                                                      │
└─────────────────────────────────────────────────────────────────┘
┌──────────────┬──────────────────────────────────────────────────┐
│              │ Header Area                                      │
│              │ - Title & Description                            │
│              │ - Load View / Save View / Show Compare Buttons   │
│              │                                                   │
│              ├──────────────────────────────────────────────────┤
│              │ Control Bar                                      │
│              │ - View Mode Toggle (SCF / Framework Primary)     │
│              │ - Framework Selectors (Primary, Compare To)      │
│              │ - Show Debug Info Checkbox                       │
│              │ - Search Box                                     │
│ Filter Panel │                                                   │
│              ├──────────────────────────────────────────────────┤
│ Title:       │ Active Filters Summary                           │
│ - SCF:       │ - "Filtering by X frameworks"                    │
│   "Framework │ - Clear all button                               │
│    Filters"  │                                                   │
│              ├──────────────────────────────────────────────────┤
│ - Framework: │ Debug Panel (optional)                           │
│   "Show      │ - Primary / Compare To / Filter Panel info       │
│    Additional│                                                   │
│    Mappings" ├──────────────────────────────────────────────────┤
│              │                                                   │
│ Frameworks:  │                                                   │
│ ☑ NIST CSF   │                                                   │
│ ☐ ISO 27001  │        Main Content Area                         │
│ ☐ CIS v8     │        (Hierarchical Control Display)            │
│ ☐ GDPR       │                                                   │
│ ☐ PCI DSS    │                                                   │
│ ...          │                                                   │
│              │                                                   │
│ [Clear all]  │                                                   │
│              │                                                   │
└──────────────┴──────────────────────────────────────────────────┘
```

### Component Breakdown

#### Filter Panel (Left Sidebar)
- **Width:** 320px (configurable via `filterPanelWidth` state)
- **Toggle:** "Show/Hide Compare" (Framework) or "Show/Hide Filters" (SCF)
- **Title:** Dynamic based on view mode
  - SCF Primary: "Framework Filters"
  - Framework Primary: "Show Additional Mappings"
- **Content:** 
  - Checkbox list of all available frameworks
  - Framework name and version displayed
  - "Clear all filters" button when selections exist

#### Header Controls
**SCF Primary Mode:**
- View mode toggle (SCF Primary / Framework Primary)
- Search box
- Show Debug Info checkbox

**Framework Primary Mode:**
- View mode toggle
- Primary Framework dropdown
- Compare To dropdown (optional)
- Show Debug Info checkbox
- Search box

#### Action Buttons
- **Load View:** Opens modal to load saved configurations
- **Save View:** Opens modal to save current configuration
- **Show/Hide Compare:** Toggles filter panel visibility

---

## Visual Hierarchy

### Framework Primary - Depth Levels

```typescript
const colors = [
  { 
    ref: 'text-purple-700 dark:text-purple-300',
    bg: 'bg-purple-50 dark:bg-purple-900/20',
    border: 'border-purple-300 dark:border-purple-700'
  },  // Depth 0: Top-level (Functions like GV, ID, PR)
  { 
    ref: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-100/50 dark:bg-purple-900/10',
    border: 'border-purple-200 dark:border-purple-800'
  },  // Depth 1: Categories (GV.RM, GV.OC)
  { 
    ref: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-white dark:bg-gray-800',
    border: 'border-gray-200 dark:border-gray-700'
  }   // Depth 2+: Controls (GV.RM-01, GV.RM-02)
]
```

### Framework Hierarchy Patterns

The system recognizes and preserves these hierarchy patterns:

#### NIST CSF v2.0
```
GV                    → Function (Govern)
├─ GV.OC              → Category (Organizational Context)
│  ├─ GV.OC-01        → Control
│  ├─ GV.OC-02        → Control
│  └─ GV.OC-03        → Control
└─ GV.RM              → Category (Risk Management Strategy)
   ├─ GV.RM-01        → Control
   └─ GV.RM-02        → Control
```

#### NIST 800-53
```
AC                    → Family (Access Control)
├─ AC-1               → Control
│  └─ AC-1(1)         → Enhancement
└─ AC-2               → Control
   ├─ AC-2(1)         → Enhancement
   └─ AC-2(2)         → Enhancement
```

#### ISO 27001/27002
```
A.5                   → Domain
├─ A.5.1              → Control
│  ├─ A.5.1.1         → Sub-control
│  └─ A.5.1.2         → Sub-control
└─ A.5.2              → Control
```

#### PCI DSS
```
1                     → Requirement
├─ 1.1                → Sub-requirement
│  ├─ 1.1.1           → Control
│  └─ 1.1.2           → Control
└─ 1.2                → Sub-requirement
```

#### CIS Controls
```
1                     → Control Group
├─ 1.1                → Safeguard
│  └─ 1.1(IG1)        → Implementation Group
└─ 1.2                → Safeguard
```

### NIST CSF Function & Category Labels

Hardcoded in `buildFrameworkHierarchy()` for proper display:

```typescript
// Functions
const nistCsfFunctions = {
  'GV': 'Govern',
  'ID': 'Identify',
  'PR': 'Protect',
  'DE': 'Detect',
  'RS': 'Respond',
  'RC': 'Recover'
}

// Categories (partial list)
const nistCsfCategories = {
  'GV.OC': 'Organizational Context',
  'GV.RM': 'Risk Management Strategy',
  'GV.RR': 'Roles, Responsibilities, and Authorities',
  'GV.PO': 'Policy',
  'GV.OV': 'Oversight',
  'GV.SC': 'Cybersecurity Supply Chain Risk Management',
  'ID.AM': 'Asset Management',
  'ID.RA': 'Risk Assessment',
  'ID.IM': 'Improvement',
  // ... more categories
}
```

---

## Color Scheme

### Primary Framework (Purple Theme)
```scss
// Node backgrounds
bg-purple-50 dark:bg-purple-900/20          // Depth 0
bg-purple-100/50 dark:bg-purple-900/10      // Depth 1
bg-white dark:bg-gray-800                    // Depth 2+

// Text colors
text-purple-700 dark:text-purple-300         // Headers (depth 0)
text-purple-600 dark:text-purple-400         // Headers (depth 1+)

// Borders
border-purple-300 dark:border-purple-700     // Depth 0
border-purple-200 dark:border-purple-800     // Depth 1
border-gray-200 dark:border-gray-700         // Depth 2+
```

### Compare To Framework (Blue Theme)
```scss
// Used for comparison framework controls in Framework Primary view
bg-blue-50 dark:bg-blue-900/10              // Container background
border-blue-200 dark:border-blue-800         // Container border
text-blue-700 dark:text-blue-300             // Header text
text-blue-600 dark:text-blue-400             // Control text

// Tags
bg-blue-50 dark:bg-blue-900/20              // Tag background
border-blue-200 dark:border-blue-800         // Tag border
text-blue-700 dark:text-blue-300             // Framework name
text-blue-600 dark:text-blue-400             // Control reference
```

### Additional Frameworks (Orange Theme)
```scss
// Used for filter panel selections in Framework Primary view
bg-orange-50 dark:bg-orange-900/10          // Container background
border-orange-200 dark:border-orange-800     // Container border
text-orange-700 dark:text-orange-300         // Header text
text-orange-600 dark:text-orange-400         // Control text

// Tags
bg-orange-50 dark:bg-orange-900/20          // Tag background
border-orange-200 dark:border-orange-800     // Tag border
text-orange-700 dark:text-orange-300         // Framework name
text-orange-600 dark:text-orange-400         // Control reference
```

### SCF Controls (Indigo Theme)
```scss
// Used for SCF control displays in both views
bg-indigo-50 dark:bg-indigo-900/10          // Container background
border-indigo-200 dark:border-indigo-800     // Container border
text-indigo-700 dark:text-indigo-300         // Header text
text-indigo-600 dark:text-indigo-400         // Control ID text
```

### Mapping Strength Badges
```scss
// Exact match
bg-green-100 dark:bg-green-900/30
text-green-700 dark:text-green-300

// Partial match
bg-yellow-100 dark:bg-yellow-900/30
text-yellow-700 dark:text-yellow-300
```

### Debug Panel
```scss
bg-yellow-50 dark:bg-yellow-900/20
border-yellow-200 dark:border-yellow-800
text-yellow-800 dark:text-yellow-300        // Header
text-yellow-700 dark:text-yellow-400        // Content
```

---

## State Management

### Component State

```typescript
// View configuration
const [viewMode, setViewMode] = useState<'scf' | 'framework'>('scf')
const [selectedFramework, setSelectedFramework] = useState<string>('')
const [compareToFramework, setCompareToFramework] = useState<string>('')
const [selectedFrameworks, setSelectedFrameworks] = useState<Set<string>>(new Set())
const [searchQuery, setSearchQuery] = useState('')

// UI state
const [showFilterPanel, setShowFilterPanel] = useState(true)
const [filterPanelWidth, setFilterPanelWidth] = useState(320)
const [showDebugInfo, setShowDebugInfo] = useState(false)
const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())

// Modal state
const [showSaveModal, setShowSaveModal] = useState(false)
const [showLoadModal, setShowLoadModal] = useState(false)
```

### State Relationships

**SCF Primary View:**
- Uses: `selectedFrameworks` (filter panel selections)
- Ignores: `selectedFramework`, `compareToFramework`

**Framework Primary View:**
- Uses: `selectedFramework` (primary framework)
- Uses: `compareToFramework` (optional comparison)
- Uses: `selectedFrameworks` filtered to exclude `selectedFramework` → `additionalFrameworkIds`

### Expand/Collapse Keys

Format: `{nodeKey}-{suffix}`

Examples:
```
// Framework Primary
"GV.RM-01-direct-mappings"          // Direct SCF mappings group
"comp-GV.RM-01-ISO27001:6.1"       // Additional frameworks under comparison control

// SCF Primary
"GOV-01-parent-mappings"            // Parent control framework mappings
"GOV-01.1"                          // Sub-control
```

---

## Save/Load Views

### Saved Configuration Structure

```typescript
{
  viewMode: 'scf' | 'framework',
  selectedFramework: string,
  compareToFramework: string,
  selectedFrameworks: string[],      // Array conversion of Set
  searchQuery: string,
  showFilterPanel: boolean,
  filterPanelWidth: number
}
```

### Save View Process

1. User clicks "Save View" button
2. Modal opens with current configuration pre-filled
3. User enters:
   - View name (required)
   - Organization (optional)
4. Configuration saved to `saved_views` table in Supabase
5. Modal closes, view is available in "Load View"

### Load View Process

1. User clicks "Load View" button
2. Modal displays list of saved views
3. User selects a view
4. `loadView()` function applies configuration:
   ```typescript
   setViewMode(config.viewMode)
   setSelectedFramework(config.selectedFramework || '')
   setCompareToFramework(config.compareToFramework || '')
   setSelectedFrameworks(new Set(config.selectedFrameworks))
   setSearchQuery(config.searchQuery || '')
   setShowFilterPanel(config.showFilterPanel !== false)
   setFilterPanelWidth(config.filterPanelWidth || 320)
   ```
5. UI updates to reflect loaded configuration
6. Data refetches automatically via React Query

---

## Rendering Logic

### SCF Primary View

```typescript
<SCF Parent Control>
  <Header>
    - Control ID (e.g., GOV-01)
    - Title
    - Domain
    - Total mappings count
  </Header>
  
  {isExpanded && (
    <>
      {/* Collapsed group */}
      <Framework Mappings Group (collapsed)>
        {expandedMappingsGroup && (
          <Individual Framework Mappings>
            - Framework name + version
            - Control reference
            - Description
            - Mapping strength badge
          </Individual Framework Mappings>
        )}
      </Framework Mappings Group>
      
      {/* Sub-controls */}
      <Sub-Controls Section>
        <Individual Sub-Control (collapsed)>
          {expandedSubControl && (
            <Sub-Control Framework Mappings>
              - Same format as parent mappings
            </Sub-Control Framework Mappings>
          )}
        </Individual Sub-Control>
      </Sub-Controls Section>
    </>
  )}
</SCF Parent Control>
```

### Framework Primary View

```typescript
<Primary Framework Control>
  <Header>
    - Control ref (e.g., GV.RM-01)
    - Description
    - Framework count + control count
  </Header>
  
  {isExpanded && (
    <>
      {/* Direct mappings to this node */}
      {hasSCFMappings && (
        <Collapsed Group: "Expand to see controls mapped directly...">
          {expandedDirectMappings && (
            <SCF Controls>
              <SCF Control Card>
                - SCF ID + Title
                - Mapping strength badge
                {/* Tags below */}
                <Divider>
                <Tags Section>
                  {comparisonMappings && (
                    <Blue Tag>[Compare Framework: Ref]</Blue Tag>
                  )}
                  {additionalMappings && (
                    <Orange Tag>[Additional Framework: Ref]</Orange Tag>
                  )}
                </Tags Section>
              </SCF Control Card>
            </SCF Controls>
          )}
        </Collapsed Group>
      )}
      
      {/* No Compare To selected */}
      {!compareToFramework && (
        <Message>"Select a Compare To framework to see mappings"</Message>
      )}
      
      {/* Child controls */}
      {hasChildren && (
        <Recursive renderFrameworkNode()>
          {/* Nested child controls at depth + 1 */}
        </Recursive>
      )}
    </>
  )}
</Primary Framework Control>
```

### Recursive Rendering

The `renderFrameworkNode()` function handles recursive nesting:

```typescript
const renderFrameworkNode = (nodeKey: string, node: any, depth = 0) => {
  // 1. Determine colors based on depth
  const colorScheme = colors[Math.min(depth, colors.length - 1)]
  
  // 2. Render current node
  return (
    <Node styled with colorScheme>
      <Header>
        {/* Chevron, ref_code, description, counts */}
      </Header>
      
      {isExpanded && (
        <Content>
          {/* SCF mappings, comparison mappings, etc. */}
          
          {/* RECURSIVE CALL for children */}
          {hasChildren && Object.entries(node.children).map(([childKey, childNode]) =>
            renderFrameworkNode(childKey, childNode, depth + 1)
          )}
        </Content>
      )}
    </Node>
  )
}
```

---

## Best Practices & Conventions

### 1. Collapsed by Default
All groups and sub-items should be collapsed on initial load to prevent overwhelming the user. This includes:
- Framework mapping groups
- Sub-controls
- Child control nodes
- Direct mapping sections

### 2. Color Consistency
- **Purple:** Primary framework structure
- **Blue:** Compare To framework controls/tags
- **Orange:** Additional framework controls/tags
- **Indigo:** SCF controls and groupings
- **Green:** Exact match badges
- **Yellow:** Partial match badges

### 3. Expand Keys
Always use descriptive, unique keys for expand/collapse state:
```typescript
`${nodeKey}-direct-mappings`       // Group of direct mappings
`${nodeKey}-parent-mappings`       // Parent control mappings
`comp-${nodeKey}-${controlId}`     // Comparison control expansion
```

### 4. Responsive Counts
Always show counts in headers and group labels:
```typescript
"Framework Mappings (4)"
"Sub-Controls (3)"
"2 frameworks mapped to 16 controls"
```

### 5. Null States
Provide clear messages when:
- No frameworks selected
- No primary framework selected
- No comparison framework selected
- No results found
- No mappings exist

### 6. Visual Affordances
- Chevron icons indicate expandable items
- Hover states show interactivity
- Badge colors convey meaning
- Borders separate logical sections

---

## Debug Information

### Debug Panel Content

**Framework Primary:**
```
Primary: NIST Cybersecurity Framework v2.0
Compare To: CIS Controls v8
Filter Panel: GDPR, ISO/IEC 27001
Additional IDs: GDPR, ISO/IEC 27001
```

**SCF Primary:**
```
View Mode: SCF Primary
Selected Frameworks: NIST CSF v2.0, CIS Controls v8, GDPR
Total Controls: 47
```

### Console Logging

The hooks include console logging for debugging:
```typescript
console.log('Fetching additional frameworks:', additionalFrameworkIds)
console.log('Additional mappings fetched:', additionalMappings.length)
console.log('additionalBySCF keys:', Object.keys(additionalBySCF).length)
console.log('Hierarchy built with:', {
  primaryMappings: primaryMappings.length,
  comparisonMappings: comparisonMappings.length,
  additionalMappings: additionalMappings.length
})
```

---

## Future Enhancements

### Potential Improvements
- [ ] Export to PDF/Excel with current view
- [ ] Bulk selection of frameworks by category
- [ ] Framework coverage heat map
- [ ] Gap analysis mode (show unmapped controls)
- [ ] Custom mapping strength thresholds
- [ ] Compare multiple frameworks side-by-side (3+)
- [ ] Keyboard shortcuts for navigation
- [ ] Breadcrumb trail for deep navigation
- [ ] Bookmark specific control paths
- [ ] Real-time collaboration on views

### Performance Optimizations
- [ ] Virtualized scrolling for large lists
- [ ] Lazy loading of framework mappings
- [ ] Memoization of hierarchy building
- [ ] Debounced search input
- [ ] Progressive disclosure of sub-controls

---

## Technical Specifications

### Dependencies
- **React 18+**: Client components with hooks
- **Next.js 16.0.0**: App router with Turbopack
- **TanStack Query v5**: Data fetching and caching
- **Supabase**: PostgreSQL database with real-time subscriptions
- **Tailwind CSS**: Utility-first styling with dark mode

### Database Schema
```sql
-- Core tables
scf_controls              -- SCF control definitions
frameworks                -- Framework metadata
external_controls         -- Framework-specific control definitions
scf_control_mappings      -- Mapping relationships

-- Supporting tables
saved_views              -- User-saved view configurations
organizations            -- Multi-tenancy support
```

### API Endpoints (via Supabase)
```typescript
// Primary framework mappings
.from('scf_control_mappings')
  .eq('framework_id', frameworkId)

// Comparison framework mappings
.from('scf_control_mappings')
  .eq('framework_id', compareFrameworkId)

// Additional framework mappings
.from('scf_control_mappings')
  .in('framework_id', additionalFrameworkIds)
```

---

## Maintenance Notes

### When Adding New Framework Support

1. **Check hierarchy pattern** - Does it match existing patterns (NIST, ISO, PCI, CIS)?
2. **Add to regex patterns** in `buildFrameworkHierarchy()` if new pattern
3. **Test with sample data** - Ensure proper nesting and labels
4. **Update this documentation** - Add framework hierarchy example

### When Modifying View Structure

1. **Update both view modes** - Keep consistency between SCF and Framework Primary
2. **Test collapsed/expanded states** - Ensure expand keys are unique
3. **Verify color scheme** - Check dark mode compatibility
4. **Update Save/Load** - Ensure configuration captures all relevant state
5. **Update this documentation** - Reflect structural changes

### When Changing Color Scheme

1. **Update color definitions** - All 4 theme sections (purple, blue, orange, indigo)
2. **Test dark mode** - All colors must have dark variants
3. **Check contrast ratios** - Ensure WCAG AA compliance
4. **Update this documentation** - Reflect new color values

---

## Troubleshooting

### Issue: Tags not showing for selected frameworks
**Cause:** Framework doesn't map through same SCF control as primary framework  
**Solution:** This is expected behavior - tags only show when frameworks share SCF controls

### Issue: Collapsed groups not expanding
**Cause:** Expand key collision or incorrect state management  
**Solution:** Ensure unique expand keys using format `${nodeKey}-${suffix}`

### Issue: Framework hierarchy not displaying correctly
**Cause:** Control ref_code doesn't match regex pattern  
**Solution:** Add or update regex pattern in `buildFrameworkHierarchy()`

### Issue: Save/Load not preserving configuration
**Cause:** State not included in `currentConfiguration` object  
**Solution:** Add missing state to configuration object (lines 496-504)

---

## Version History

| Date | Version | Changes |
|------|---------|---------|
| 2025-11-24 | 1.0 | Initial documentation - Framework Primary with Option C implementation |

---

## Contact & Support

For questions or issues with the Framework Mapping Explorer:
- **Technical Lead:** Review this documentation first
- **Feature Requests:** Document in project issues
- **Bugs:** Include debug panel output and console logs

---

**End of Documentation**

This document serves as the **source of truth** for the Framework Mapping Explorer structure. Any changes to the UI, data flow, or component architecture should be reflected here.
