

# Navigation Consolidation Plan

## Goal
Reduce the number of buttons in the main header by merging related features and relocating others, so everything fits on one screen.

## Changes Overview

```text
BEFORE (header buttons):                 AFTER (header buttons):
+------------------+                     +------------------+
| Supervision      |                     | Supervision      |
| Referrals        |                     | Referrals        |
| Billing          | ─┐                  | Billing & Analytics (combined) |
| Analytics        | ─┘                  | Clinical Library (IEP + Behavior) |
| IEP Library      | ─┐                  | Teacher Mode     |
| Recruiting       |  │                  +------------------+
| LMS              |  │
| Teacher Mode     |  │                  MOVED:
+------------------+  │                  - LMS → UserMenu dropdown
                      │                  - Recruiting → Admin page tab
                      └─ merged          - Behavior Library → merged into Clinical Library
```

## Detailed Changes

### 1. Merge Billing and Analytics into one page
- Create a new combined "Billing & Analytics" page that uses internal tabs/headers to switch between the existing Billing content and the existing Analytics content.
- The header button label will change to "Billing" with a single DollarSign icon; the Analytics content will appear as an internal tab within that page.
- Remove the separate Analytics header button from `MainLayout.tsx`.
- The `/analytics` route will remain functional but redirect to `/billing` with the analytics tab active (or be kept as a secondary route).

### 2. Merge IEP Library and Behavior Bank into a "Clinical Library"
- Create a new combined page (e.g., `/clinical-library`) with internal tabs: "IEP Supports" and "Behavior Bank".
- The IEP Library tab will render the existing `IEPLibrary` page content.
- The Behavior Bank tab will render the existing `BehaviorLibrary` page content.
- Replace the separate "IEP Library" header button with a single "Clinical Library" button.
- Remove the "Behavior Library" entry from the UserMenu dropdown (since it is now accessible from the Clinical Library page).

### 3. Move Recruiting into the Admin page
- Remove the "Recruiting" button from the header in `MainLayout.tsx`.
- Add a "Recruiting" tab inside the existing Admin page, rendering the current Recruiting page content as a tab panel.
- Only admins/super_admins can access the Admin page, so this naturally enforces the admin-only restriction.

### 4. Move LMS into the UserMenu dropdown
- Remove the "LMS" button from the header in `MainLayout.tsx`.
- Add an "LMS / Training" menu item in `UserMenu.tsx` (alongside Profile, Behavior Library, etc.), which navigates to `/lms`.

---

## Technical Details

### Files to create:
- **`src/pages/ClinicalLibrary.tsx`** -- New combined page with two tabs ("IEP Supports" rendering IEPLibrary content, "Behavior Bank" rendering BehaviorLibrary content). Uses Tabs component with internal state management.

### Files to modify:

**`src/components/MainLayout.tsx`**
- Remove individual buttons for: Analytics, IEP Library, Recruiting, LMS
- Update Billing button label (keep as "Billing" or change to "Billing & Analytics")
- Add a new "Clinical Library" button navigating to `/clinical-library`

**`src/pages/Billing.tsx`**
- Add an "Analytics" tab at the end of the existing tab list
- Import and render the `AnalyticsDashboard` component (and filters) within that tab's content panel
- Update page title to "Billing & Analytics"

**`src/pages/Admin.tsx`**
- Add a "Recruiting" tab that renders the existing Recruiting page content inline

**`src/components/UserMenu.tsx`**
- Remove the "Behavior Library" menu item (now accessible via Clinical Library)
- Add an "LMS / Training" menu item that navigates to `/lms`

**`src/App.tsx`**
- Add route for `/clinical-library`
- Keep existing `/billing`, `/analytics`, `/lms`, `/recruiting`, `/behaviors`, `/iep-library` routes functional for backward compatibility (direct URL access)

### No database changes required
This is purely a UI/navigation restructuring. All existing pages, components, and data remain intact.

