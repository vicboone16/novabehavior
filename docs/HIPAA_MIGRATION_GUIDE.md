# HIPAA Compliance Migration Guide
## Lovable Cloud → External Supabase Pro (with BAA)

### Overview
- **Current**: 374 tables, 200+ functions, 300+ RLS policies, 100+ triggers, 50+ views
- **Target**: External Supabase Pro project with signed BAA
- **Apps connected**: 4 (NovaTrack Core, Teacher Hub, Student Connect, Behavior Decoded)

---

## Step 1: Create External Supabase Project

1. Go to [supabase.com](https://supabase.com) → Create account → Create new project (Pro plan)
2. **Request BAA**: Go to Organization Settings → Legal → Request BAA
   - Supabase will send you a BAA to sign
   - BAA covers database, auth, storage, and edge functions
3. Note your new project's:
   - Project URL: `https://YOUR-PROJECT.supabase.co`
   - Anon Key (publishable)
   - Service Role Key (private — never in client code)

---

## Step 2: Export Current Schema via Supabase CLI

Since the schema has 374 tables, the most reliable export method is `supabase db dump`:

```bash
# Install Supabase CLI
npm install -g supabase

# Login and link to current project
supabase login
supabase link --project-ref yboqqmkghwhlhhnsegje

# Full schema dump (DDL only — no data)
supabase db dump --schema public > schema_export.sql

# Data dump (if you want to migrate existing data)
supabase db dump --schema public --data-only > data_export.sql

# Roles and permissions
supabase db dump --role-only > roles_export.sql
```

---

## Step 3: Apply Schema to New Project

```bash
# Link to NEW project
supabase link --project-ref YOUR_NEW_PROJECT_REF

# Apply schema
psql "postgresql://postgres:YOUR_PASSWORD@db.YOUR_NEW_PROJECT.supabase.co:5432/postgres" < schema_export.sql

# Apply data (if migrating)
psql "postgresql://postgres:YOUR_PASSWORD@db.YOUR_NEW_PROJECT.supabase.co:5432/postgres" < data_export.sql
```

---

## Step 4: Migrate Edge Functions

Edge functions need to be deployed to the new project:

```bash
# From your project root
supabase functions deploy --project-ref YOUR_NEW_PROJECT_REF
```

Current edge functions to migrate:
- `bx-ai-search` — AI-powered behavior library search
- `check-user-access` — Cross-app identity gateway
- Any other functions in `supabase/functions/`

---

## Step 5: Migrate Storage Buckets

If you have storage buckets with clinical documents:

```bash
# List current buckets
supabase storage ls --project-ref yboqqmkghwhlhhnsegje

# Create same buckets on new project via dashboard or API
# Then migrate files
```

---

## Step 6: Connect All 4 Apps to New Project

For **each** Lovable project (NovaTrack Core, Teacher Hub, Student Connect, Behavior Decoded):

1. Go to **Settings → Connectors → Supabase**
2. Enter your new project's URL and anon key
3. The app will now point to the HIPAA-covered database

---

## Step 7: Migrate Auth Users

Auth users need special handling:

```bash
# Export users from current project
supabase auth users list --project-ref yboqqmkghwhlhhnsegje > users.json

# Import to new project (may require admin API)
# Use supabase admin API to create users with preserved UUIDs
```

**Important**: User UUIDs must be preserved since all RLS policies, foreign keys, and data reference `auth.uid()`.

---

## Step 8: Update Secrets

Any edge function secrets (API keys, etc.) need to be set on the new project:

```bash
supabase secrets set KEY=VALUE --project-ref YOUR_NEW_PROJECT_REF
```

---

## Step 9: DNS & Environment

Update any custom domains, email templates, and OAuth providers (if using social login) on the new Supabase project.

---

## Current Schema Summary

### Enums
- `app_role`: super_admin, admin, staff, viewer
- `data_state`: no_data, observed_zero, measured
- `note_subtype`: clinical_only, parent_training_only, combined
- `procedure_type`: task_analysis, prompt_hierarchy, chaining, discrete_trial, natural_environment, other
- `program_status`: active, on_hold, completed, archived
- `service_setting`: school, home, telehealth, clinic, community
- `session_note_type`: therapist, assessment, clinical, parent_training, supervision_revision
- `target_closed_reason`: mastered, discontinued, replaced, generalized, archived, other
- `target_phase`: baseline, acquisition, probe, generalization, maintenance
- `target_status`: active, on_hold, closed
- `toi_contributor`: medication_change, missed_dose, illness, poor_sleep_night, unknown, other
- `toi_event_type`: TOI_SLEEPING, TOI_NURSE_OFFICE, TOI_HEALTH_ROOM_REST, etc.
- `toi_location`: classroom, nurse, office, sensory_room, outside, other
- `vb_mapp_fill_state`: EMPTY, HALF, FULL

### Key Table Groups (374 total)
- **ABA Library**: aba_library_interventions, aba_library_tags, aba_plan_templates, etc.
- **Academy/LMS**: academy_modules, academy_paths, lms_courses, lms_progress, etc.
- **Agency/Org**: agencies, agency_memberships, agency_feature_flags, agency_billing_profiles
- **Assessment**: abas3_assessments, socially_savvy_assessments, vb_mapp_responses
- **Auth/RBAC**: user_roles, admin_permissions, agency_user_roles, access_invites
- **Behavior**: behaviors, behavior_bank_entries, bx_presenting_problems, bx_strategies
- **Billing**: billing_claims, billing_payments, authorizations, session_postings
- **Clinical Intelligence**: ci_client_metrics, ci_signals, ci_intervention_recs
- **Client/Student**: students, client_documents, client_contacts, client_case_attributes
- **Data Collection**: session_data, sessions, goal_data, target_trials, skill_programs
- **Notes**: session_notes, note_templates, note_versions
- **Scheduling**: appointments, staff_availability, staff_caseloads
- **Staff**: staff_assignments, staff_credentials, profiles
- **Supervision**: supervision_sessions, supervision_goals
- **Teacher**: teacher_frequency_entries, teacher_duration_entries

---

## Security Checklist (Post-Migration)

- [ ] BAA signed with Supabase
- [ ] All RLS policies verified on new project
- [ ] Edge functions deployed and tested
- [ ] Auth users migrated with preserved UUIDs
- [ ] Storage buckets created with proper policies
- [ ] All 4 apps connected and tested
- [ ] Audit logging confirmed working
- [ ] Encryption at rest enabled (default on Supabase Pro)
- [ ] Point-in-time recovery enabled
- [ ] Network restrictions configured (if needed)
- [ ] Old Lovable Cloud data purged after verification

---

## HIPAA Controls Provided by Supabase Pro + BAA

| Control | Coverage |
|---------|----------|
| Encryption at rest | AES-256 (default) |
| Encryption in transit | TLS 1.2+ |
| Access controls | RLS + Auth |
| Audit logging | Available via pg_audit |
| Backup & recovery | Point-in-time recovery |
| BAA | Signed with Supabase |
| Data residency | Configurable by region |
