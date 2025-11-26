# Control Count Standardization - November 25, 2025

## Problem Statement

User noticed inconsistent control counts across the GRC platform:
- Dashboard: 1,000 SCF Controls (pagination bug)
- Mapping Explorer: 1,172 controls
- Database: 1,420 records

This caused confusion about which number was "correct" and what each represented.

## Root Cause Analysis

### SCF Control Hierarchy Structure

The SCF framework has a hierarchical structure with two types of controls:

1. **Organizational Parent Controls** (248 controls)
   - Examples: AAT-01, GOV-02, RSK-01
   - Purpose: Group related sub-controls for organizational structure
   - Have child controls under them
   - 90.3% (224/248) have mappings to other frameworks
   - Used for high-level mapping when you want to map an entire control family

2. **Implementable Leaf Controls** (1,172 controls)
   - Examples: AAT-01.1, AAT-01.2, CPL-04 (standalone)
   - Purpose: Actual controls that organizations implement
   - No child controls under them
   - What compliance teams think of as "controls to implement"
   - Includes:
     - 912 sub-controls (children of organizational parents)
     - 260 standalone parent controls (no children)

**Total Database Records: 1,420** (248 organizational + 1,172 implementable)

### Issues Identified

1. **Dashboard Pagination Bug**: Only fetched 1,000 records (Supabase default limit)
2. **Inconsistent Counting**: Dashboard counted all records, Explorer counted only leaf nodes
3. **Missing Toggle**: No way for users to include organizational parents when needed
4. **Poor Labeling**: Unclear what "Show All Primary Controls" meant

## Solution Implemented

### 1. Dashboard Changes (`useDashboard.ts`)

**Before:**
```typescript
// Single query, limited to 1,000 records
const { data } = await supabase
  .from('scf_controls')
  .select('...')
  
const controlsCount = data.length // Would show 1,000
```

**After:**
```typescript
// Paginated query to fetch all records
while (hasMore) {
  const { data } = await supabase
    .from('scf_controls')
    .select('...')
    .range(from, from + pageSize - 1)
  allControls = allControls.concat(data)
  // ... pagination logic
}

// Filter to leaf controls only
const leafControls = allControls.filter(control => {
  return !allControls.some(c => c.parent_id === control.id)
})

const controlsCount = leafControls.length // Shows 1,172
```

**Result:**
- Dashboard now shows: **"1,172 Implementable SCF Controls"**
- Tooltip explains: "Leaf Controls Only - Excludes 248 organizational parent controls"

### 2. Framework Mapping Explorer Changes (`page.tsx`)

**New Advanced Filters Section:**
```tsx
<button onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}>
  Advanced Filters
</button>

{showAdvancedFilters && (
  <div>
    ☐ Hide controls without mappings
       [i] Only show controls with mappings to selected frameworks
    
    ☑ Show parent control groupings (+248)
       [i] Shows organizational parents that provide hierarchy structure
  </div>
)}
```

**Default State:**
- ☐ Hide controls without mappings: **Unchecked** (show all)
- ☑ Show parent control groupings: **Checked** (maintain hierarchy)

**Behavior:**
- **Default**: Shows 1,420 controls with proper Domain → Parent → Sub-control hierarchy
- **Hide without mappings checked**: Reduces to only controls with mappings
- **Parent groupings unchecked**: Flattens to 1,172 leaf controls only

### 3. Data Hook Changes (`useControlMappings.ts`)

**New Parameter:**
```typescript
export function useControlMappingsByFrameworkGrouped(
  frameworkId: string,
  compareFrameworkId?: string,
  additionalFrameworkIds?: string[],
  showAllControls: boolean = true,
  includeOrganizationalControls: boolean = true // NEW
)
```

**New Filtering Function:**
```typescript
function filterOrganizationalParents(hierarchy: any): any {
  // Removes organizational parents and promotes children
  // Used when user unchecks "Show parent control groupings"
  // Maintains data integrity by promoting sub-controls up
}
```

**Filtering Order:**
1. Load ALL 1,420 controls from database
2. Build complete hierarchy with parent-child relationships
3. **If `!includeOrganizationalControls`**: Remove organizational parents, promote children
4. **If `!showAllControls`**: Remove controls without mappings
5. Return filtered hierarchy

### 4. Counting Logic Update (`page.tsx`)

**Before:**
```typescript
const countNode = (node: any) => {
  const isLeafControl = (node.ref_code || node.control_id) && 
                       (!node.children || Object.keys(node.children).length === 0)
  if (isLeafControl) {
    totalControls++
    // ... count mappings
  }
}
```

**After:**
```typescript
const countNode = (node: any) => {
  const hasChildren = node.children && Object.keys(node.children).length > 0
  const isControl = node.ref_code || node.control_id
  const isLeafControl = isControl && !hasChildren
  const isOrganizationalParent = isControl && hasChildren
  
  const shouldCount = includeOrganizationalControls 
    ? isControl // Count all controls (leaf + organizational)
    : isLeafControl // Count only leaf controls
  
  if (shouldCount) {
    totalControls++
    // ... count mappings
  }
}
```

**Added Dependency:**
```typescript
}, [groupedMappings, frameworks, primaryFramework, additionalFrameworks, 
    isPrimarySCF, includeOrganizationalControls]) // Added last param
```

## Expected Control Counts

| Hide without mappings | Show parent groupings | Count | Description |
|----------------------|----------------------|-------|-------------|
| ☐ OFF | ☐ OFF | **1,172** | Implementable leaf controls only |
| ☑ ON | ☐ OFF | **903** | Leaf controls with mappings |
| ☐ OFF | ☑ ON | **1,420** | All controls with hierarchy |
| ☑ ON | ☑ ON | **1,127** | All controls with mappings |

## User Experience Improvements

### Before
- ❌ Dashboard showed 1,000 (wrong)
- ❌ Mapping Explorer showed 1,172 (no context)
- ❌ No way to see organizational parents
- ❌ Confusing checkbox labels
- ❌ Flat list when trying to hide organizational parents

### After
- ✅ Dashboard shows 1,172 with clear label "Implementable SCF Controls"
- ✅ Mapping Explorer shows 1,420 by default with proper hierarchy
- ✅ Advanced Filters toggle for power users
- ✅ Clear labels: "Hide controls without mappings" and "Show parent control groupings"
- ✅ Helpful tooltips explaining each option
- ✅ Maintains hierarchy structure in both views
- ✅ Consistent counts across all screens

## Technical Details

### Files Modified

1. `/frontend/lib/hooks/useDashboard.ts`
   - Added pagination loop for complete data fetch
   - Added leaf control filtering logic
   - Updated to show 1,172 implementable controls

2. `/frontend/app/(dashboard)/dashboard/page.tsx`
   - Updated label: "Implementable SCF Controls"
   - Updated tooltip to explain leaf controls

3. `/frontend/app/(dashboard)/explore/frameworks/mappings/page.tsx`
   - Added `includeOrganizationalControls` state (default: true)
   - Added `showAdvancedFilters` toggle state
   - Created Advanced Filters collapsible section
   - Improved checkbox labels and added tooltips
   - Updated counting logic to respect organizational control toggle
   - Added dependency to useMemo for proper recalculation

4. `/frontend/lib/hooks/useControlMappings.ts`
   - Added `includeOrganizationalControls` parameter
   - Added `filterOrganizationalParents()` function
   - Removed early filtering (now loads all 1,420 controls)
   - Filters at hierarchy level instead of data level
   - Added to query key for proper cache invalidation

### Data Integrity

✅ All 1,420 database records remain intact
✅ No data loss - organizational parents with mappings remain accessible
✅ Hierarchy relationships preserved when needed
✅ Sub-controls properly promoted when parents are hidden
✅ Pagination handles large datasets correctly

### Performance

- Pagination fetches in 1,000-row chunks (efficient)
- React Query caching prevents unnecessary refetches
- useMemo prevents unnecessary recalculations
- Filtering happens client-side after hierarchy is built (fast)

## Validation Results

### Database Query Results
```
Total DB records: 1,420
├── Organizational parents: 248 (90.3% have mappings)
└── Implementable controls: 1,172
    ├── Standalone parents: 260
    └── Sub-controls: 912

Mapping Coverage:
├── Leaf controls with mappings: 903 (77.0%)
├── Org parents with mappings: 224 (90.3%)
└── Total with mappings: 1,127 (79.4%)
```

### UI Verification
- ✅ Dashboard: 1,172 controls displayed
- ✅ Mapping Explorer (default): 1,420 controls with hierarchy
- ✅ Advanced Filters work correctly
- ✅ Tooltips display helpful information
- ✅ Counts update dynamically when toggling filters
- ✅ No TypeScript errors
- ✅ Proper hierarchy maintained

## Business Impact

### Benefits for Users

1. **Clarity**: Users now understand what they're looking at
2. **Consistency**: Same numbers with same meanings everywhere
3. **Flexibility**: Power users can access organizational parents when needed
4. **Structure**: Default view maintains important hierarchy for navigation
5. **Accuracy**: No more missing controls due to pagination limits

### Use Cases Supported

1. **Compliance Teams**: See 1,172 implementable controls to track
2. **Auditors**: Can enable organizational parents to see complete structure
3. **Management**: Dashboard shows accurate implementable control count
4. **Mapping Analysts**: Can map at parent level (e.g., entire AAT-01 family)
5. **Gap Analysis**: Filter to controls with/without mappings

## Conclusion

Successfully standardized control counting across the platform:
- **Dashboard**: 1,172 implementable controls (leaf nodes only)
- **Mapping Explorer**: 1,420 controls by default (maintains hierarchy)
- **Consistent**: Both show the same data with clear labeling
- **Flexible**: Advanced filters allow customization
- **Intuitive**: Clear labels and helpful tooltips

The implementation preserves data integrity, maintains performance, and provides a better user experience with clear communication about what each count represents.
