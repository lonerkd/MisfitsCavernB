# RBAC System - Complete Feature Guide

This document covers the expanded Role-Based Access Control (RBAC) system for Misfits Cavern, including audit trails, crew management, and comprehensive admin tooling.

---

## Table of Contents

1. [System Architecture](#system-architecture)
2. [User Roles](#user-roles)
3. [Admin Suite Features](#admin-suite-features)
4. [Audit System](#audit-system)
5. [Crew Management](#crew-management)
6. [Components & Hooks](#components--hooks)
7. [Usage Examples](#usage-examples)
8. [Best Practices](#best-practices)

---

## System Architecture

### Core Components

```
lib/
├── context/
│   ├── AuthContext.tsx        # Global auth state & permission checking
│   └── types.ts               # Type definitions
├── permissions/
│   ├── access-control.tsx     # ProtectedPage, ActionButton, IfAccess
│   ├── access-matrix.ts       # Complete permission matrix
│   ├── role-permissions.ts    # Role-to-permission mapping
│   └── usePermissions.ts      # Custom hooks
├── supabase/
│   ├── audit.ts               # Audit logging functions
│   └── crew-management.ts     # Crew role management
components/
├── CrewManagementModal.tsx    # Crew role assignment UI
└── RoleBasedNav.tsx           # Role-aware navigation

app/admin/
├── page.tsx                   # Dashboard
├── users/page.tsx             # User management
├── analytics/page.tsx         # System analytics
└── audit-logs/page.tsx        # Audit trail viewer
```

---

## User Roles

### Global Roles (4 types)

| Role | Capabilities | Use Case |
|------|-----------|----------|
| **Admin** | Full access, user management, audit logs | Platform management |
| **Project Creator** | Create projects, manage crew, create scripts, post jobs | Content creators |
| **Crew Member** | View projects, create scripts, view portfolio | Collaborators |
| **Guest** | Browse public content | Unauthenticated users |

### Project-Level Roles (4 types)

| Role | Edit | Manage Crew | Scripts | Delete |
|------|------|-------------|---------|--------|
| **Owner** | ✅ | ✅ | ✅ | ✅ |
| **Lead** | ✅ | ✅ | ✅ | ❌ |
| **Contributor** | ✅ | ❌ | ✅ | ❌ |
| **Viewer** | ❌ | ❌ | ✅ | ❌ |

---

## Admin Suite Features

### 1. Dashboard (`/admin`)

**Purpose**: Overview of platform activity and quick actions

**Features**:
- Total users, projects, scripts, jobs statistics
- Quick action buttons to manage users and view analytics
- Real-time stats loading

**How to Access**:
```
You must have admin role to access /admin
```

**Example**:
```typescript
// Dashboard loads on mount
useEffect(() => {
  loadStats();
}, []);
```

---

### 2. User Management (`/admin/users`)

**Purpose**: Manage user roles and permissions

**Features**:
- View all users with roles and status
- Toggle admin role for users (owner only)
- Search and filter by role, status
- Display join dates and activity

**How to Use**:
1. Navigate to `/admin/users`
2. View user table with all users
3. Click shield button to toggle admin role
4. Select user row to highlight them

**Key Functions**:
```typescript
// Toggle admin role
toggleAdminRole(userId: string, currentAdmin: boolean): Promise<void>

// Fires audit log: 'role_changed'
```

---

### 3. Analytics Dashboard (`/admin/analytics`)

**Purpose**: Understand platform usage patterns

**Features**:
- Key metrics (users, projects, jobs, scripts)
- Time range selector (week/month/year)
- System analytics with trends
- Data visualization cards

**Metrics Tracked**:
- Total users and active users
- Project creation and completion
- Script creation volume
- Job postings

**Example Reading Data**:
```typescript
const [analytics, setAnalytics] = useState({
  totalUsers: 0,
  activeUsers: 0,
  totalProjects: 0,
  completedProjects: 0,
  totalScripts: 0,
  totalJobs: 0,
  avgProjectDuration: 0,
});

// Load on mount
useEffect(() => {
  loadAnalytics();
}, [timeRange]);
```

---

### 4. Audit Logs (`/admin/audit-logs`)

**Purpose**: Complete visibility into all system activities

**Features**:
- View all user actions with timestamps
- Filter by action type, user, resource
- Search across actions
- Export to CSV
- Activity summary (logins, actions, projects created)
- Most active users (7-day view)
- Pagination with up to 50 logs per page

**Audit Actions Tracked**:
```typescript
'user_login'           // User authentication
'user_logout'          // User logout
'user_created'         // New user signup
'user_deleted'         // User deletion
'role_changed'         // User role change
'project_created'      // Project creation
'project_deleted'      // Project deletion
'project_updated'      // Project modification
'script_created'       // Script creation
'script_deleted'       // Script deletion
'script_updated'       // Script modification
'crew_invited'         // Crew member added
'crew_removed'         // Crew member removed
'crew_role_changed'    // Crew member role change
'job_created'          // Job posting
'job_closed'           // Job closure
'admin_action'         // General admin action
```

**How to Use**:
1. Go to `/admin/audit-logs`
2. **Search**: Type in search box for user/action/resource
3. **Filter**: Select action type from dropdown
4. **Export**: Click export button to download CSV
5. **Pagination**: Navigate through pages

**Search Tips**:
- Search by username: `john_doe`
- Search by action: `created`
- Search by resource: `project_123`

**CSV Export Format**:
```
Timestamp, User, Action, Resource Type, Resource ID, Details
2026-06-28 23:45:00, john_doe, project_created, project, proj_1, {...}
```

---

## Crew Management

### Overview

Crew management allows project owners and leads to assign roles to project team members.

### CrewManagementModal Component

**Features**:
- Search and add users to projects
- Assign roles (owner, lead, contributor, viewer)
- Update member roles
- Remove members from project
- Real-time permission checks

**Usage**:
```typescript
import { CrewManagementModal } from '@/components/CrewManagementModal';

function ProjectPage() {
  const [showCrewModal, setShowCrewModal] = useState(false);
  const currentUserId = useCurrentUser().user?.id;

  return (
    <>
      <button onClick={() => setShowCrewModal(true)}>
        Manage Crew
      </button>

      {showCrewModal && (
        <CrewManagementModal
          projectId={projectId}
          currentUserId={currentUserId!}
          onClose={() => setShowCrewModal(false)}
        />
      )}
    </>
  );
}
```

### Crew Management Service

**Functions**:
```typescript
// Get all crew members for a project
getProjectCrew(projectId: string): Promise<CrewMember[]>

// Assign user to project with role
assignCrewMember(
  projectId: string,
  userId: string,
  role: CrewRole,
  currentUserId: string
): Promise<CrewMember>

// Update existing member's role
updateCrewMemberRole(
  projectId: string,
  userId: string,
  newRole: CrewRole,
  currentUserId: string
): Promise<CrewMember>

// Remove member from project
removeCrewMember(
  projectId: string,
  userId: string,
  currentUserId: string
): Promise<void>

// Get user's projects and roles
getUserProjects(userId: string): Promise<CrewMember[]>
```

**Audit Logging**:
All crew management actions are automatically logged:
- `crew_invited` - User added to project
- `crew_removed` - User removed from project
- `crew_role_changed` - User role updated

---

## Components & Hooks

### Protected Page Component

**Purpose**: Protect entire pages from unauthorized access

**Usage**:
```typescript
import { ProtectedPage } from '@/lib/permissions/access-control';

export default function MyPage() {
  return (
    <ProtectedPage requiredPermission="create_project">
      <YourContent />
    </ProtectedPage>
  );
}
```

**Behavior**:
- Renders content if user has permission
- Shows "Access Denied" fallback if not authorized
- Automatically logs access denial

### Action Button Component

**Purpose**: Permission-aware button that auto-disables

**Usage**:
```typescript
import { ActionButton } from '@/lib/permissions/access-control';

<ActionButton
  permission="manage_users"
  onClick={() => toggleAdminRole(userId)}
  title="Make admin"
  disabledTooltip="Only admins can manage roles"
  style={customStyles}
>
  <Shield size={14} /> Make Admin
</ActionButton>
```

**Features**:
- Automatically disables if user lacks permission
- Shows tooltip on hover
- Type-safe with Permission type

### IfAccess Component

**Purpose**: Conditionally render UI based on permissions

**Usage**:
```typescript
import { IfAccess } from '@/lib/permissions/access-control';

<IfAccess permission="manage_crew">
  <CrewManagementSection />
</IfAccess>

// With fallback
<IfAccess 
  permission="manage_crew"
  fallback={<p>No crew management access</p>}
>
  <CrewManagementSection />
</IfAccess>
```

### Custom Hooks

**useCurrentUser()**: Get current user info and roles
```typescript
const { 
  user,                    // Profile object
  isAuthenticated,         // boolean
  userRole,               // 'admin' | 'project_creator' | 'crew_member' | 'guest'
  isAdmin,                // boolean
  isCreator,              // boolean
  isCrewMember,           // boolean
} = useCurrentUser();
```

**usePermission()**: Check single permission
```typescript
const canCreate = usePermission('create_project');

// With context
const canEdit = usePermission('edit_project', { projectId });
```

**usePermissions()**: Check all permissions required
```typescript
const hasAccess = usePermissions([
  'create_project',
  'manage_crew',
]);
```

**useAnyPermission()**: Check if user has ANY permission
```typescript
const canAct = useAnyPermission([
  'delete_project',
  'delete_script',
]);
```

**useProjectAccess()**: Get project-specific access
```typescript
const { 
  role,              // 'owner' | 'lead' | 'contributor' | 'viewer'
  canEdit,
  canDelete,
  canManageCrew,
  canViewScripts,
  canEditScripts,
} = useProjectAccess(projectId);
```

---

## Usage Examples

### Example 1: Audit a Specific User

**Goal**: Find all actions taken by a user

```typescript
// In /admin/audit-logs:
// 1. Click filter dropdown
// 2. Type user's username in search
// 3. Leave action filter as "All Actions"
// 4. Review the timeline

// Programmatically:
const { logs } = await getAuditLogs(100, 0, {
  userId: 'specific-user-id'
});

logs.forEach(log => {
  console.log(`${log.created_at}: ${log.action} on ${log.resource_type}`);
});
```

### Example 2: Track Project Creation Activity

**Goal**: See which users create projects most

```typescript
// Go to /admin/audit-logs
// 1. Select "project_created" from action filter
// 2. View "Most Active Users" section for 7-day stats
// 3. Export data for further analysis

// Or programmatically:
const { logs } = await getAuditLogs(1000, 0, {
  action: 'project_created',
  dateFrom: sevenDaysAgo,
});
```

### Example 3: Manage Project Crew

**Goal**: Add team member with specific role

```typescript
import { AssignCrewMember } from '@/lib/supabase/crew-management';

// Add user as project lead
await assignCrewMember(
  projectId,
  userId,
  'lead',  // role
  currentUserId  // for audit log
);

// This automatically:
// 1. Adds user to project
// 2. Sets their role
// 3. Logs 'crew_invited' + 'crew_role_changed' actions
// 4. Sends audit trail entry to database
```

### Example 4: Permission-Based UI Visibility

**Goal**: Show admin-only features

```typescript
import { IfAccess, ActionButton } from '@/lib/permissions/access-control';

function ProjectSettings() {
  return (
    <div>
      <h2>Project Settings</h2>

      {/* Only show for anyone */}
      <input type="text" placeholder="Project title" />

      {/* Only show for editors */}
      <IfAccess permission="edit_project">
        <div>
          <input type="text" placeholder="Description" />
          <button>Save Changes</button>
        </div>
      </IfAccess>

      {/* Only show for deleters */}
      <IfAccess permission="delete_project">
        <ActionButton
          permission="delete_project"
          onClick={deleteProject}
        >
          <Trash2 size={14} /> Delete Project
        </ActionButton>
      </IfAccess>
    </div>
  );
}
```

---

## Best Practices

### 1. Always Log Admin Actions

```typescript
// After any admin operation
await logAuditAction(
  currentUserId,
  'admin_action',
  'resource_type',
  resourceId,
  { 
    description: 'What happened',
    before: oldValue,
    after: newValue 
  }
);
```

### 2. Use ActionButton for Destructive Actions

```typescript
// Good - prevents unauthorized deletion
<ActionButton
  permission="delete_project"
  onClick={deleteProject}
>
  Delete
</ActionButton>

// Avoid - no permission check
<button onClick={deleteProject}>Delete</button>
```

### 3. Wrap Pages with ProtectedPage

```typescript
// Always protect authenticated pages
export default function CreatorPage() {
  return (
    <ProtectedPage requiredPermission="create_project">
      <PageContent />
    </ProtectedPage>
  );
}
```

### 4. Use IfAccess for Optional Features

```typescript
// Show features conditionally
<IfAccess permission="manage_crew">
  <CrewManagementButton />
</IfAccess>

// Falls back gracefully if no permission
```

### 5. Check Audit Logs Regularly

- Monitor `/admin/audit-logs` weekly
- Export data monthly for records
- Review "Most Active Users" for anomalies
- Set up alerts for suspicious activities

### 6. Test with Multiple Roles

Create test accounts for:
- Admin (full access)
- Creator (project features)
- Member (collaboration)
- Guest (public only)

Test each feature as each role to verify access control.

---

## Troubleshooting

### Issue: User can't see protected page

**Check**:
1. Is page wrapped with `ProtectedPage`?
2. Does user have required permission?
3. Check `/admin/audit-logs` for access denial

### Issue: Button shows disabled

**Check**:
1. Is button using `ActionButton`?
2. Does user have required permission?
3. Check `usePermission()` result

### Issue: Audit log missing

**Check**:
1. Was `logAuditAction()` called?
2. Check server logs for errors
3. Verify database has audit_logs table

### Issue: Crew member can't edit

**Check**:
1. Is user assigned to project?
2. Check their role (need at least 'contributor')
3. Verify in `/admin/audit-logs` > search user > filter "crew_role_changed"

---

## File Reference

| File | Purpose |
|------|---------|
| `lib/supabase/audit.ts` | Audit logging functions |
| `lib/supabase/crew-management.ts` | Crew role management |
| `lib/context/AuthContext.tsx` | Global auth state |
| `lib/permissions/access-control.tsx` | ProtectedPage, ActionButton, IfAccess |
| `components/CrewManagementModal.tsx` | Crew UI component |
| `app/admin/audit-logs/page.tsx` | Audit viewer page |

---

## Support

For issues or questions:
1. Check `/admin/audit-logs` to understand current state
2. Review type definitions in `lib/context/types.ts`
3. Check permission matrix in `lib/permissions/access-matrix.ts`
4. Review examples in admin pages (`app/admin/**`)

