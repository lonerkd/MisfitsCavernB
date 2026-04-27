# Phase 3: Project Management System (120 hours)

**Status:** 📋 PLANNED  
**Estimated Timeline:** 5 days (at 24/7 development pace)  
**Starting Point:** All Phase 0-2 work complete and pushed to GitHub

---

## 🎯 Phase 3 Objectives

Build the core project management infrastructure that enables creators to:
1. Create and manage production projects
2. Assign crew members with roles
3. Upload and organize production assets
4. Track production timeline and schedule
5. Monitor budget and resource allocation
6. Define project status workflow

---

## 📦 Deliverables

### 1. Project CRUD System
**Files to Create:**
- `lib/projects.ts` - Project business logic
- `app/api/projects/create/route.ts` - Create project
- `app/api/projects/[id]/route.ts` - Get/Update/Delete project
- `app/api/projects/list/route.ts` - List user's projects

**Features:**
- Create new projects with metadata
- Update project details and status
- Delete projects (with cascading)
- List projects with filtering (status, genre, date)
- Search by title/description

**Database:**
- Schema already supports Project model
- Need to add: budget, deadline, genre fields

### 2. Crew Assignment & Roles
**Files to Create:**
- `lib/crew-roles.ts` - Role management
- `app/api/projects/[id]/crew/route.ts` - Manage crew on project
- `app/api/projects/[id]/crew/[userId]/route.ts` - Assign/remove crew member

**Features:**
- Define roles: Director, Producer, Writer, Production Designer, etc.
- Assign crew to specific project roles
- Track crew member availability
- Permission-based access to project data

**Data Model:**
- Need new table: `ProjectCrew` with fields:
  - `id`, `project_id`, `user_id`, `role`, `hourly_rate`, `assigned_at`

### 3. Asset Management System
**Files to Create:**
- `lib/assets.ts` - Asset operations
- `lib/cloudflare-r2.ts` - R2 integration
- `app/api/assets/upload/route.ts` - Upload to R2
- `app/api/assets/[projectId]/route.ts` - List project assets
- `app/api/assets/[id]/delete/route.ts` - Delete asset

**Features:**
- Upload files (storyboards, videos, photos, documents)
- Store references in database
- List assets by type and project
- Delete assets from R2 and database
- Generate R2 signed URLs for access

**Asset Types:**
- Storyboard (image/PNG/JPG)
- Concept Art (image)
- Production Video (video/MP4)
- Photo (image)
- Document (PDF/DOCX)
- Audio (WAV/MP3)

**Integration:**
- Configure Cloudflare R2 credentials in `.env.local`:
  ```
  CLOUDFLARE_ACCOUNT_ID=
  CLOUDFLARE_R2_ACCESS_KEY=
  CLOUDFLARE_R2_SECRET_KEY=
  CLOUDFLARE_R2_BUCKET=misfits-cavern-assets
  CLOUDFLARE_R2_URL=https://r2.misfitscavern.com
  ```

### 4. Production Timeline
**Files to Create:**
- `lib/timeline.ts` - Schedule management
- `app/api/projects/[id]/timeline/route.ts` - Get/create timeline items
- `components/ProductionTimeline.tsx` - Timeline visualization

**Features:**
- Define production phases (pre-production, production, post, release)
- Set milestone dates
- Track completion percentage per phase
- Gantt chart visualization
- Crew task assignments to timeline items

**Timeline Phases:**
1. Development (Script writing)
2. Pre-Production (Planning, design, casting)
3. Production (Filming/recording)
4. Post-Production (Editing, VFX, sound)
5. Marketing (Trailer, promotional content)
6. Release (Launch)

### 5. Budget Tracking
**Files to Create:**
- `lib/budget.ts` - Budget operations
- `app/api/projects/[id]/budget/route.ts` - Get/update budget

**Features:**
- Set project budget
- Track crew costs (hourly rate × hours)
- Track asset/equipment costs
- Budget burndown tracking
- Cost vs. schedule comparison

**Budget Categories:**
- Crew/Talent
- Equipment Rental
- Location/Studio
- Post-Production
- Software/Licenses
- Contingency

### 6. Project Status Workflow
**Implementation:**
- Status options: `concept`, `development`, `pre_production`, `production`, `post_production`, `completed`, `released`
- Track status transitions with timestamps
- Automatic notifications when status changes

---

## 📊 Data Model Updates

### New Tables

#### ProjectCrew
```prisma
model ProjectCrew {
  id            String    @id @default(cuid())
  project_id    String
  project       Project   @relation("crew", fields: [project_id], references: [id], onDelete: Cascade)
  user_id       String
  user          User      @relation("crewed_on", fields: [user_id], references: [id], onDelete: Cascade)
  
  role          String    // "Director", "Producer", "Writer", etc.
  hourly_rate   Float?
  assigned_at   DateTime  @default(now())
  
  @@index([project_id])
  @@index([user_id])
  @@map("project_crews")
}
```

#### Timeline (Optional but recommended)
```prisma
model TimelineItem {
  id            String    @id @default(cuid())
  project_id    String
  project       Project   @relation("timeline", fields: [project_id], references: [id], onDelete: Cascade)
  
  phase         String    // "Development", "Pre-Production", etc.
  title         String
  description   String?   @db.Text
  start_date    DateTime
  end_date      DateTime
  completion    Int       @default(0) // 0-100%
  
  created_at    DateTime  @default(now())
  updated_at    DateTime  @updatedAt
  
  @@index([project_id])
  @@map("timeline_items")
}
```

#### Budget (Optional but recommended)
```prisma
model BudgetItem {
  id            String    @id @default(cuid())
  project_id    String
  project       Project   @relation("budget", fields: [project_id], references: [id], onDelete: Cascade)
  
  category      String    // "Crew", "Equipment", "Location", etc.
  description   String
  amount        Float
  actual_cost   Float?    @default(0)
  
  created_at    DateTime  @default(now())
  
  @@index([project_id])
  @@map("budget_items")
}
```

---

## 🛠️ Implementation Sequence

### Hour 1-20: Project CRUD
- [ ] Add database fields to Project (budget, deadline, genre)
- [ ] Create `lib/projects.ts` with full CRUD
- [ ] Build 3 API routes for projects
- [ ] Create project pages (list, detail, create, edit)

### Hour 21-40: Crew Assignment
- [ ] Create `ProjectCrew` table
- [ ] Implement crew assignment logic
- [ ] Build crew management API
- [ ] Create crew UI components

### Hour 41-70: Asset Management
- [ ] Setup Cloudflare R2 integration
- [ ] Create `lib/cloudflare-r2.ts`
- [ ] Build upload endpoint with file validation
- [ ] Create asset listing and deletion
- [ ] Build asset gallery UI

### Hour 71-90: Timeline
- [ ] Create `TimelineItem` table
- [ ] Build timeline CRUD operations
- [ ] Create timeline visualization component
- [ ] Add phase management UI

### Hour 91-110: Budget Tracking
- [ ] Create `BudgetItem` table
- [ ] Build budget calculation logic
- [ ] Create budget summary dashboard
- [ ] Add budget tracking UI

### Hour 111-120: Polish & Testing
- [ ] Integration testing
- [ ] UI/UX refinement
- [ ] Performance optimization
- [ ] Documentation

---

## 🔌 Key Dependencies

**Existing (No new installs needed):**
- @prisma/client - Already installed
- Tailwind CSS - Already installed
- React - Already installed

**May Need to Add:**
```json
{
  "recharts": "^3.7.0",           // For budget charts
  "react-big-calendar": "^1.8.5", // For timeline calendar
  "date-fns": "^2.30.0"           // For date calculations
}
```

---

## 🧪 Testing Strategy

### Unit Tests
- Project CRUD operations
- Budget calculations
- Timeline date validations
- Crew role permissions

### Integration Tests
- Create project → Assign crew → Upload assets → Set timeline
- Budget updates when crew rate changes
- Cascading deletes when project deleted

### E2E Tests (Manual)
1. Create a project named "Femme Fatale"
2. Assign crew (Director, Producer, Writer)
3. Upload storyboards and concept art
4. Set production timeline (6 weeks)
5. Set budget ($50K)
6. Verify all data persists

---

## 🎨 UI Components to Build

### Pages
- `/projects/[id]` - Project dashboard
- `/projects/[id]/crew` - Crew management
- `/projects/[id]/assets` - Asset library
- `/projects/[id]/timeline` - Production schedule
- `/projects/[id]/budget` - Budget overview

### Components
- `ProjectCard.tsx` - Project preview
- `CrewAssignment.tsx` - Add/remove crew
- `AssetUploader.tsx` - File upload with progress
- `AssetGallery.tsx` - Grid of project assets
- `TimelineChart.tsx` - Gantt or calendar view
- `BudgetSummary.tsx` - Budget breakdown

---

## 📝 Success Criteria

Phase 3 is complete when:
- ✅ All 4 new tables created and migrated
- ✅ All API endpoints implemented (15+ new endpoints)
- ✅ Projects can be created, edited, deleted
- ✅ Crew can be assigned with roles
- ✅ Assets can be uploaded to R2
- ✅ Timeline can be visualized
- ✅ Budget can be tracked and calculated
- ✅ All new pages compile without errors
- ✅ Build size < 200 KB
- ✅ All code pushed to GitHub

---

## 📚 Reference Materials

**Cloudflare R2 Integration:**
- https://developers.cloudflare.com/r2/
- R2 API: S3-compatible

**Prisma Relations:**
- One-to-many (Project has many scripts, assets, crew)
- Many-to-many via junction table (ProjectCrew)

**Next.js File Upload:**
- FormData for multipart uploads
- ReadableStream for large files

---

## 🚀 Next Phase Preview (Phase 4)

After Phase 3 completes, Phase 4 will add:
- Real-time collaboration (Supabase Realtime)
- Project comments and notes
- Presence awareness (who's online)
- Notifications system
- Team invitations with permissions

**Total Remaining:** 288 hours (Phase 3-5)

---

## 💾 Progress Tracking

- [ ] Start Phase 3
- [ ] Hour 20: Project CRUD complete
- [ ] Hour 40: Crew assignment working
- [ ] Hour 70: Asset uploads to R2
- [ ] Hour 90: Timeline visualization
- [ ] Hour 110: Budget tracking
- [ ] Hour 120: Polish & push to GitHub

---

**Next Step:** Begin Phase 3 development. Start with Project CRUD system.
