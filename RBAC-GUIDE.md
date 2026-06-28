# Role-Based Access Control (RBAC) Guide

## Overview

Misfits Cavern implements a comprehensive role-based access control system that manages user permissions across the entire application. This guide explains how to use the RBAC system in your code.

## User Roles

There are 4 main user roles:

### 1. **Admin** (Owner/Site Administrator)
- Full access to all features
- Can manage users and view analytics
- Can override any project settings
- Has access to admin panel

**Permissions:**
- ✅ Create/edit/delete projects
- ✅ Manage crew members
- ✅ Create/edit/delete scripts
- ✅ Create/edit/delete jobs
- ✅ Manage portfolios
- ✅ Access studio
- ✅ View analytics
- ✅ Manage users

### 2. **Project Creator** (Your Role - Content Creator)
- Can create and manage own projects
- Can create scripts and manage portfolio
- Can post jobs
- Cannot access admin panel

**Permissions:**
- ✅ Create/edit/delete own projects
- ✅ Manage crew on own projects
- ✅ Create/edit/delete scripts
- ✅ Create/edit/delete jobs
- ✅ Manage portfolio
- ✅ Access studio
- ❌ Manage other users
- ❌ Access admin panel

### 3. **Crew Member** (Collaborators)
- Can view assigned projects
- Can contribute to scripts
- Can update portfolio
- Cannot create new projects or jobs

**Permissions:**
- ❌ Create new projects
- ✅ Edit scripts in assigned projects
- ✅ Manage own portfolio
- ✅ Access studio
- ✅ View lounge
- ❌ Create jobs
- ❌ Post to jobs board

### 4. **Guest** (Site Visitor)
- Can only view public content
- Can browse crew directory
- Cannot create anything
- Must sign in to access features

**Permissions:**
- ✅ View public portfolios
- ✅ Browse crew directory
- ✅ View landing page
- ❌ Access any features
- ❌ Create projects/scripts

---

## Project-Level Roles

Within each project, crew members have specific roles:

### **Owner**
- Created the project
- Can edit/delete the project
- Can manage all crew members
- Can edit/delete any scripts/jobs
- Can view analytics

### **Lead**
- Senior team member
- Can edit project details
- Can manage other crew members (if project creator allows)
- Can create/edit/delete scripts and jobs

### **Contributor**
- Can create and edit scripts
- Can create job postings
- Cannot edit project settings
- Cannot delete scripts
- Cannot manage crew

### **Viewer**
- Can view project
- Can view scripts
- Cannot make changes
- Read-only access

---

## Using RBAC in Your Code

### 1. **Check Current User Permissions**

```tsx
import { useAuth } from '@/lib/context/AuthContext';

export function MyComponent() {
  const { user, userRole, permissions } = useAuth();

  return (
    <div>
      <h1>Welcome, {user?.username}</h1>
      <p>Your role: {userRole}</p>
    </div>
  );
}
```

### 2. **Control Access to Actions**

```tsx
import { ActionButton } from '@/lib/permissions/access-control';

export function ProjectActions({ projectId }) {
  return (
    <>
      <ActionButton
        permission="edit_project"
        context={{ projectId }}
        onClick={() => editProject(projectId)}
        disabledTooltip="Only project owners can edit"
      >
        Edit Project
      </ActionButton>

      <ActionButton
        permission="delete_project"
        context={{ projectId }}
        onClick={() => deleteProject(projectId)}
        disabledTooltip="Only project owners can delete"
      >
        Delete Project
      </ActionButton>
    </>
  );
}
```

### 3. **Show/Hide UI Based on Permissions**

```tsx
import { IfAccess } from '@/lib/permissions/access-control';

export function ProjectDetails({ projectId }) {
  return (
    <div>
      <h1>Project Details</h1>

      <IfAccess permission="edit_project" context={{ projectId }}>
        <button>Edit Project</button>
      </IfAccess>

      <IfAccess
        permission="manage_crew"
        context={{ projectId }}
        fallback={<p>Only project lead can manage crew</p>}
      >
        <div>
          {/* Crew management UI */}
        </div>
      </IfAccess>
    </div>
  );
}
```

### 4. **Protect Pages**

```tsx
import { ProtectedPage } from '@/lib/permissions/access-control';

export default function AdminPage() {
  return (
    <ProtectedPage requiredPermission="manage_users">
      <div>
        <h1>Admin Panel</h1>
        {/* Admin content */}
      </div>
    </ProtectedPage>
  );
}
```

### 5. **Use Permission Hooks**

```tsx
import {
  usePermission,
  usePermissions,
  useAnyPermission,
  useCurrentUser,
  useProjectAccess
} from '@/lib/permissions/usePermissions';

export function ScriptActions({ projectId, scriptId }) {
  const canCreate = usePermission('create_script', { projectId });
  const canEditAndDelete = usePermissions(
    ['edit_script', 'delete_script'],
    { projectId }
  );
  const user = useCurrentUser();
  const projectAccess = useProjectAccess(projectId);

  return (
    <div>
      {canCreate && <button>New Script</button>}
      {canEditAndDelete && <button>Delete</button>}
      {projectAccess.canManageCrew && <button>Manage Crew</button>}
    </div>
  );
}
```

---

## Access Control Matrix

### Pages Accessible by Role

| Page | Admin | Creator | Crew | Guest |
|------|-------|---------|------|-------|
| `/` | ✅ | ✅ | ✅ | ✅ |
| `/profile` | ✅ | ✅ | ✅ | ❌ |
| `/projects` | ✅ | ✅ | ✅ | ❌ |
| `/projects/create` | ✅ | ✅ | ❌ | ❌ |
| `/editor` | ✅ | ✅ | ✅ | ❌ |
| `/jobs` | ✅ | ✅ | ✅ | ❌ |
| `/jobs/post` | ✅ | ✅ | ❌ | ❌ |
| `/portfolio` | ✅ | ✅ | ✅ | ❌ |
| `/studio` | ✅ | ✅ | ✅ | ❌ |
| `/crew` | ✅ | ✅ | ✅ | ✅ |
| `/admin` | ✅ | ❌ | ❌ | ❌ |

### Project-Level Actions by Role

| Action | Owner | Lead | Contributor | Viewer |
|--------|-------|------|-------------|--------|
| Edit project | ✅ | ✅ | ❌ | ❌ |
| Delete project | ✅ | ❌ | ❌ | ❌ |
| Manage crew | ✅ | ✅ | ❌ | ❌ |
| Create script | ✅ | ✅ | ✅ | ❌ |
| Edit script | ✅ | ✅ | ✅ | ❌ |
| Delete script | ✅ | ✅ | ❌ | ❌ |
| Create job | ✅ | ✅ | ✅ | ❌ |
| Edit job | ✅ | ✅ | ✅ | ❌ |
| Delete job | ✅ | ✅ | ❌ | ❌ |

---

## Implementation Examples

### Example 1: Conditional Edit Button

```tsx
export function ScriptEditor({ scriptId, projectId }) {
  const { canPerformAction } = useAuth();
  const canEdit = canPerformAction('edit_script', { scriptId, projectId });

  return (
    <div>
      <textarea disabled={!canEdit} />
      {!canEdit && <p style={{ color: 'red' }}>Read-only access</p>}
    </div>
  );
}
```

### Example 2: Project Management Interface

```tsx
export function ProjectHeader({ projectId }) {
  const projectAccess = useProjectAccess(projectId);

  if (!projectAccess.isLoaded) {
    projectAccess.loadAccess();
    return <div>Loading...</div>;
  }

  return (
    <header>
      <h1>Project Name</h1>
      <span>Role: {projectAccess.role}</span>

      {projectAccess.canEdit && (
        <button>Edit Project</button>
      )}

      {projectAccess.canManageCrew && (
        <button>Manage Crew</button>
      )}

      {projectAccess.canDelete && (
        <button style={{ color: 'red' }}>Delete Project</button>
      )}
    </header>
  );
}
```

### Example 3: Crew Member Badges

```tsx
export function CrewMemberCard({ member, projectId }) {
  const { user } = useAuth();
  const { canManageCrew } = useProjectAccess(projectId);

  return (
    <div style={{ border: '1px solid #ccc', padding: 16 }}>
      <img src={member.avatar_url} />
      <h3>{member.username}</h3>
      <p>Role: {member.project_role}</p>

      {canManageCrew && (
        <button onClick={() => changeMemberRole(member.id)}>
          Change Role
        </button>
      )}

      {user?.id === member.id && (
        <button onClick={() => leaveCrew()}>Leave Crew</button>
      )}
    </div>
  );
}
```

### Example 4: Admin Panel

```tsx
export function AdminPanel() {
  const { userRole } = useAuth();

  if (userRole !== 'admin') {
    return <div>Access Denied</div>;
  }

  return (
    <div>
      <h1>Admin Panel</h1>
      <section>
        <h2>Manage Users</h2>
        {/* User management interface */}
      </section>
      <section>
        <h2>View Analytics</h2>
        {/* Analytics dashboard */}
      </section>
    </div>
  );
}
```

---

## Setting Up AuthProvider

Wrap your app with `AuthProvider` in your layout:

```tsx
import { AuthProvider } from '@/lib/context/AuthContext';

export default function RootLayout({ children }) {
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  );
}
```

---

## Database Schema Updates

The system uses these fields for access control:

```sql
-- Profiles table
- is_admin: boolean (identifies admins)

-- Projects table  
- creator_id: uuid (project owner)
- is_public: boolean (visibility)

-- Project crew table
- role: text ('owner', 'lead', 'contributor', 'viewer')
- status: text ('pending', 'confirmed', 'declined')
```

---

## Checking Permissions Programmatically

```tsx
import { canAccessPage, canPerformAction } from '@/lib/permissions/access-matrix';

// Check if admin can access admin panel
const adminCanAccess = canAccessPage('admin', '/admin'); // true

// Check if crew member can post jobs
const crewCanPostJobs = canPerformAction('crew_member', 'job.create'); // false

// Check if creator can delete projects
const creatorCanDelete = canPerformAction('project_creator', 'project.delete'); // true
```

---

## Best Practices

1. **Always check permissions before showing buttons**
   - Use `IfAccess` or `ActionButton` components
   - Don't rely on visual hiding alone

2. **Load project access when needed**
   - Use `useProjectAccess()` hook
   - Call `loadAccess()` when entering a project

3. **Check permissions server-side too**
   - Even though client checks the UI, server must validate
   - Use RLS policies in Supabase

4. **Use TypeScript for safety**
   - Type permissions and roles correctly
   - Let TypeScript catch invalid permission names

5. **Test with different roles**
   - Create test accounts for each role
   - Verify buttons appear/disappear correctly

---

## Troubleshooting

**Issue: "useAuth must be used within AuthProvider"**
- Solution: Make sure AuthProvider wraps your component in the layout

**Issue: Button always disabled**
- Solution: Check that you're loading project access first
- Call `loadProjectAccess()` when entering a project

**Issue: Guest can access protected pages**
- Solution: Wrap pages with `<ProtectedPage>` component
- Or check `isAuthenticated` and redirect to login

---

## Contact & Support

For questions about the RBAC system, refer to:
- `/lib/context/AuthContext.tsx` - Main auth context
- `/lib/permissions/` - Permission logic
- `/RBAC-GUIDE.md` - This guide
