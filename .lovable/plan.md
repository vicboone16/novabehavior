

# Teacher Mode & Questionnaire System Implementation Plan

## Overview
This plan implements two major features:
1. **Teacher Mode Login**: A streamlined login option that routes users to a simplified data collection interface showing only their assigned students
2. **Questionnaire System**: Create, send, and collect responses from questionnaires sent to teachers, parents, and collaborators

---

## Feature 1: Teacher Mode Login

### Login Flow Changes

**Update Auth.tsx - Two buttons side by side:**
```text
+------------------------------------------+
|                                          |
|  [Email field                          ] |
|  [Password field                       ] |
|                                          |
|  [ Sign In ]  [ Teacher Mode ]           |
|                                          |
|  "Use PIN login instead"                 |
|                                          |
+------------------------------------------+
```

- Both buttons use same authentication logic
- "Sign In" routes to `/` (main dashboard)
- "Teacher Mode" routes to `/teacher-dashboard`
- PIN login also supports Teacher Mode option
- **All roles can use it**: Admin, Super Admin, Staff - anyone with student access

### New Page: Teacher Dashboard (`/teacher-dashboard`)

**What users see:**
1. **Header** - App name, current date, Exit button (to main dashboard), Logout button
2. **Student Grid** - Cards for each accessible student
3. **Expanded View** - When student clicked, shows simplified TeacherFriendlyView inline

**Student Access Rules:**
- Students where `user_id = auth.uid()` (owner)
- Students where user has `user_student_access.can_collect_data = true`
- Admins see all accessible students

**Layout:**
```text
+------------------------------------------+
| Behavior Data Collector   [Exit] [Logout]|
+------------------------------------------+
| Wednesday, January 29, 2026              |
+------------------------------------------+
| Your Students:                           |
| +--------+  +--------+  +--------+       |
| | John S |  | Emma T |  | Alex P |       |
| +--------+  +--------+  +--------+       |
+------------------------------------------+
|                                          |
| [When student selected:]                 |
|                                          |
| ← Back to Students                       |
|                                          |
| John Smith - Today's Session             |
| ┌────────────────────────────────────┐   |
| │ Day Rating: ○ Good  ○ OK  ○ Hard  │   |
| ├────────────────────────────────────┤   |
| │ Quick Behavior Counts:             │   |
| │ [Aggression: 2] [SIB: 0] [+Add]    │   |
| ├────────────────────────────────────┤   |
| │ Quick ABC Entry                    │   |
| │ [Select behaviors] [A] [B] [C]     │   |
| ├────────────────────────────────────┤   |
| │ Comments: ________________________ │   |
| ├────────────────────────────────────┤   |
| │ [Record Now]    [Save Day Summary] │   |
| └────────────────────────────────────┘   |
+------------------------------------------+
```

### Two Submission Options

**"Record Now" Button:**
- Confirms current frequency counts and ABC entries are saved
- Shows toast: "Data recorded at 2:35 PM"
- Does NOT require day rating
- Allows multiple recordings throughout the day

**"Save Day Summary" Button:**
- Requires day rating selection (Good/OK/Hard)
- Saves to `daily_summaries` table
- Shows confirmation: "Day summary saved for John"
- One summary per student per day per user (updates if exists)

### Database: daily_summaries Table

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| student_id | uuid | FK to students |
| user_id | uuid | Who submitted |
| summary_date | date | Date of summary |
| day_rating | text | 'good', 'ok', 'hard' |
| comments | text | Teacher notes |
| created_at | timestamp | When saved |

**RLS Policies:**
- Users can insert/update their own summaries
- Users can read summaries for students they have access to
- Admins can read all summaries

---

## Feature 2: Questionnaire System

### Purpose
Allow BCBAs to create questionnaires (preference assessments, functional behavior questionnaires, parent interviews), send them to external collaborators via email, and collect responses linked to specific students.

### Database Schema

**Table: questionnaire_templates**
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | Creator |
| name | text | Template name |
| description | text | Optional description |
| questions | jsonb | Array of question objects |
| is_archived | boolean | Soft delete |
| created_at | timestamp | When created |
| updated_at | timestamp | When modified |

Question structure:
```json
{
  "id": "uuid",
  "text": "Question text",
  "type": "text | multiple_choice | rating | yes_no",
  "options": ["Option 1", "Option 2"],
  "required": true
}
```

**Table: questionnaire_invitations**
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| template_id | uuid | FK to templates |
| student_id | uuid | FK to students |
| recipient_email | text | Who to send to |
| recipient_name | text | Recipient name |
| recipient_type | text | 'teacher', 'parent', 'caregiver', 'other' |
| access_token | text | Unique URL token |
| status | text | 'pending', 'completed', 'expired' |
| sent_at | timestamp | When email sent |
| expires_at | timestamp | Expiration date |
| completed_at | timestamp | When submitted |
| created_by | uuid | Who created |

**Table: questionnaire_responses**
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| invitation_id | uuid | FK to invitations |
| student_id | uuid | FK to students |
| responses | jsonb | Answer data |
| submitted_at | timestamp | When submitted |
| respondent_info | jsonb | Optional metadata |

**Table: notifications**
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | Who to notify |
| type | text | Notification type |
| title | text | Title |
| message | text | Message body |
| data | jsonb | Related data |
| read | boolean | Read status |
| created_at | timestamp | When created |

### User Flows

**Creating a Questionnaire:**
1. Navigate to Assessment tab → Questionnaires section
2. Click "Create Template"
3. Add questions using form builder (text, multiple choice, rating scales, yes/no)
4. Save template for reuse

**Sending a Questionnaire:**
1. Select a student
2. Click "Send Questionnaire"
3. Choose template or create new
4. Enter recipient email and name
5. Select recipient type (teacher, parent, caregiver, other)
6. Click "Send" - email dispatched with unique link

**Recipient Experience:**
1. Receives email with branded invitation
2. Clicks secure link → opens public form (no login required)
3. Completes questions
4. Submits → sees confirmation message

**Viewing Responses:**
1. User gets in-app notification when response received
2. View in student's Assessment tab → Questionnaire Responses
3. Can export or include in reports

### Technical Components

**Edge Function: send-questionnaire**
- Uses Resend for email delivery
- Requires `RESEND_API_KEY` secret
- Sends branded email with secure unique link
- Updates invitation `sent_at` timestamp

**Public Form Route: `/questionnaire/:token`**
- No authentication required
- Validates token exists and not expired
- Renders form based on template questions
- Submits responses to database
- Shows success confirmation

**RLS Policies:**
- `questionnaire_templates`: Owner can CRUD, admins can view
- `questionnaire_invitations`: Owner can CRUD
- `questionnaire_responses`: Insert allowed with valid token, owner/admin can read
- `notifications`: Users can only see their own

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/pages/TeacherDashboard.tsx` | Teacher mode page with student list and data entry |
| `src/pages/QuestionnaireForm.tsx` | Public questionnaire submission form |
| `src/components/questionnaire/QuestionnaireBuilder.tsx` | Build questionnaire templates |
| `src/components/questionnaire/QuestionnaireManager.tsx` | View/send questionnaires for a student |
| `src/components/questionnaire/ResponseViewer.tsx` | View submitted responses |
| `src/components/NotificationBell.tsx` | Header notification indicator |
| `supabase/functions/send-questionnaire/index.ts` | Email sending edge function |

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Auth.tsx` | Add "Teacher Mode" button next to "Sign In" |
| `src/components/PinLogin.tsx` | Support teacher mode callback |
| `src/components/TeacherFriendlyView.tsx` | Add "Record Now" button, enhance submission |
| `src/App.tsx` | Add routes: `/teacher-dashboard`, `/questionnaire/:token` |
| `src/pages/AssessmentDashboard.tsx` | Add questionnaire management section |
| `src/components/MainLayout.tsx` | Add notification bell to header |

---

## Implementation Order

### Phase 1: Database Setup
- Create `daily_summaries` table with RLS
- Create questionnaire tables with RLS
- Create `notifications` table with RLS

### Phase 2: Teacher Mode
- Update Auth.tsx with Teacher Mode button
- Update PinLogin.tsx to support teacher mode
- Create TeacherDashboard.tsx page
- Enhance TeacherFriendlyView with Record Now button
- Add route to App.tsx

### Phase 3: Questionnaire System
- Create QuestionnaireBuilder component
- Create QuestionnaireManager component
- Create public QuestionnaireForm page
- Create send-questionnaire edge function (requires RESEND_API_KEY)
- Add to AssessmentDashboard

### Phase 4: Notifications
- Create notifications table trigger
- Create NotificationBell component
- Add to MainLayout header
- Create ResponseViewer component

---

## External Dependencies

**Email Sending:**
- Requires `RESEND_API_KEY` secret to be configured
- User will need a Resend account with verified domain
- Will prompt for this when implementing email functionality

