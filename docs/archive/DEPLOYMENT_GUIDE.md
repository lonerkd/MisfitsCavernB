# Misfits Cavern - Supabase Deployment Guide

## Current Status
✅ **Frontend Complete**: All 31 routes built and tested locally
✅ **Database Schema Ready**: supabase-schema.sql fully configured with RLS policies
⏳ **Next Step**: Deploy schema to Supabase PostgreSQL database

## Prerequisites
- Supabase account (already configured with credentials in `.env.local`)
- Supabase project created at: `https://fxsryglwpwcqkfjljbrm.supabase.co`

## Step 1: Deploy Database Schema to Supabase

### Method (Copy-Paste via Dashboard - RECOMMENDED)
1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard
   - Select your project: "misfits-cavern-nb"
   - Navigate to: SQL Editor (left sidebar)
   - Click: "New Query" button

2. **Copy the Schema File Contents**
   - Open the file: `supabase-schema.sql` in your editor
   - Select all content (Ctrl+A / Cmd+A)
   - Copy to clipboard (Ctrl+C / Cmd+C)

3. **Paste into SQL Editor**
   - Click in the SQL Editor query box
   - Paste the entire SQL content (Ctrl+V / Cmd+V)
   - **IMPORTANT**: Do NOT paste just the filename "supabase-schema.sql" - paste the actual SQL code

4. **Execute the Schema**
   - Click the blue "Run" button (or press Ctrl+Enter)
   - Wait for completion (should see green checkmarks for each table creation)
   - Verify all 14 tables are created:
     - profiles
     - projects
     - project_crew
     - scripts
     - script_versions
     - script_collaborators
     - jobs
     - job_applications
     - messages
     - activity_feed
     - studio_boards
     - studio_assets
     - portfolio_projects
     - portfolio_media
     - project_tasks

### What the Schema Includes
- **14 PostgreSQL Tables** with proper relationships and constraints
- **Row Level Security (RLS)** policies on all tables for secure multi-user access
- **Automatic Profile Creation** trigger that creates a profile when a new user signs up
- **Auto-Updating Timestamps** triggers for all tables
- **Performance Indexes** for common queries
- **Secure Foreign Keys** with cascading deletes

## Step 2: Verify Schema Deployment

After running the SQL:
1. **Check Tables Created**
   - In Supabase Dashboard, go to: Database → Tables
   - You should see all 15 tables listed (14 custom + auth.users system table)

2. **Verify RLS Policies**
   - Click on any table, then "Authentication" tab
   - Confirm RLS is "Enabled"
   - View policies to ensure they're properly configured

## Step 3: Test Authentication Flow

The app automatically creates user profiles via the `handle_new_user()` trigger when users sign up.

### Manual Test
1. **Start the Dev Server**
   ```bash
   npm run dev
   ```

2. **Navigate to Sign Up**
   - Go to: http://localhost:3000/auth
   - Click "Switch to Sign Up"

3. **Create Test Account**
   - Email: `test@example.com`
   - Password: `TestPassword123!`
   - Click "Sign Up"

4. **Verify Profile Creation**
   - In Supabase Dashboard → Database → Tables → profiles
   - Search for your email address
   - Confirm a profile row was created with:
     - `id` = user's UUID
     - `username` = derived from email (e.g., "test")
     - Other fields = defaults (OPEN, creator, etc.)

5. **Test Sign In**
   - Sign out from profile page
   - Go to /auth and sign back in
   - Should redirect to /profile page showing your details

## Step 4: Test Key Features

### 1. Profile Management
- Navigate to `/profile`
- Update username, bio, role, location, status
- Changes save to database in real-time

### 2. Projects Board (Kanban)
- Go to `/projects`
- Create a new project
- Data persists (saved to database)
- Drag tasks between columns

### 3. Screenwriting Editor
- Go to `/editor`
- Start writing a screenplay
- Auto-save indicator shows sync status
- Word count and stats update in real-time

### 4. Job Board
- Go to `/jobs`
- Create a job post (visible immediately)
- Apply for jobs (tracked in database)

### 5. Crew Directory
- Go to `/crew`
- Filter by role and availability status
- All user profiles visible with status badges

### 6. Lounge (Chat)
- Go to `/lounge`
- Create messages in channels
- Add emoji reactions
- Messages persist across sessions

### 7. Studio (Mood Board)
- Go to `/studio`
- Create boards and add assets
- Drag assets to position them
- All changes saved to database

### 8. Portfolio
- Go to `/portfolio`
- Add projects with YouTube videos
- Create multiple project entries
- Embed and view videos

## Step 5: Environment Variables

Your `.env.local` has Supabase credentials configured. These should include:
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Public API key for client-side auth
- `SUPABASE_SERVICE_ROLE_KEY` - Secret key (never expose client-side)
- `SUPABASE_DB_PASSWORD` - Database password

These enable the app to:
- Connect to your Supabase project
- Authenticate users via Supabase Auth
- Query the database with proper permissions via RLS

⚠️ **Never commit .env.local to git!** It contains secrets.

## Step 6: Deploy to Production

Once testing is complete:

1. **Build for Production**
   ```bash
   npm run build
   ```

2. **Deploy Options**
   - **Vercel** (Recommended for Next.js):
     - Push to GitHub
     - Connect at vercel.com
     - Environment variables automatically loaded from .env.local

   - **Other Hosting**:
     - Ensure `.env.local` variables are set in production environment
     - Build with `npm run build`
     - Start with `npm run start`

## Troubleshooting

### SQL Syntax Error in Supabase
**Problem**: "Expected ',', got..." error when running SQL

**Solution**: You're pasting the filename instead of file contents
- Make sure you copy the actual SQL code (lines starting with `--` and `CREATE`)
- Not the filename "supabase-schema.sql"

### Connection Timeout
**Problem**: "Connection to server at aws-0-us-west-2.pooler.supabase.com failed"

**Solution**: This is expected in sandbox environments
- The Supabase dashboard SQL Editor works (it connects from Supabase's servers)
- The Next.js app will connect via the credentials in `.env.local`
- Don't try to connect via local `psql` command - use the Supabase dashboard instead

### Profile Not Created on Sign Up
**Problem**: User can sign in but profile doesn't exist in database

**Solution**:
- Verify the `handle_new_user()` trigger was created (check SQL output)
- Check auth.users table to confirm user was created
- Try signing up with a new email address
- Check the Supabase function logs (Database → Functions → handle_new_user)

### RLS Policy Errors
**Problem**: "permission denied for schema public" when using app

**Solution**:
- Verify RLS is enabled on the table that errored
- Check the specific RLS policy for that table
- Ensure your user UUID matches auth.uid() in the policy condition

## Architecture Overview

```
Frontend (Next.js 14)
├── /auth - Email/password signup and login
├── /editor - Screenplay editor with auto-save
├── /projects - Kanban board for project management
├── /jobs - Job board for hiring
├── /crew - User directory with roles and status
├── /studio - Mood board canvas for assets
├── /lounge - Multi-channel chat with reactions
├── /portfolio - Portfolio projects with YouTube
└── /profile - User profile editor

Supabase Backend
├── PostgreSQL Database
│   ├── 14 Custom Tables (with RLS)
│   ├── Auth.users (Supabase managed)
│   └── Auto-profile creation via trigger
├── Row Level Security (RLS)
│   └── All tables have policies for multi-user safety
└── Real-time Subscriptions
    └── Ready for collaborative features

Storage Layer
├── localStorage (fallback/offline support)
└── Supabase (primary when DB is available)
```

## Next Steps (Post-Deployment)

1. **Enable Discord Integration**
   - Add Discord OAuth to auth.ts
   - Link discord_id and discord_username in profiles

2. **Real-time Collaboration**
   - Implement cursor tracking for scripts
   - Enable live editing notifications

3. **Advanced Search**
   - Full-text search across projects, scripts, jobs
   - Filter by role, status, skills

4. **Media Uploads**
   - Avatar uploads to Supabase Storage
   - Script cover image uploads

5. **Analytics & Monitoring**
   - Track user actions with activity_feed table
   - Monitor database performance

## Support

If you encounter issues:
1. Check Supabase logs: Dashboard → Logs
2. Verify RLS policies match auth.uid()
3. Ensure table relationships are correct
4. Test in Supabase SQL Editor directly
5. Check browser console for JavaScript errors

---

**Status**: Ready for production deployment after schema is deployed and tested locally.
