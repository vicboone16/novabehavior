# Student Connect — Clinical Intelligence Integration

## Files to copy into the Student Connect project

### 1. Hooks (copy to `src/hooks/`)
- `hooks/useClinicalIntelligence.ts` → `src/hooks/useClinicalIntelligence.ts`
- `hooks/useClinicalTracking.ts` → `src/hooks/useClinicalTracking.ts`

These hooks use `novaCore` from `@/lib/supabase-untyped` to query
the shared Nova Core backend views (`v_ci_caseload_feed`, `v_ci_alert_feed`,
`v_clinical_authorization_summary`, `ci_intervention_recs`).

### 2. Page (copy to `src/pages/`)
- `pages/Intelligence.tsx` → `src/pages/Intelligence.tsx`

Mobile-optimized Intelligence dashboard with 4 tabs:
Caseload, Alerts, Auth Tracking, Recommendations.

### 3. Route Registration — `src/App.tsx`

Add import:
```tsx
import Intelligence from "@/pages/Intelligence";
```

Add route inside `<Route element={<MobileLayout />}>`:
```tsx
<Route path="/intelligence" element={<Intelligence />} />
```

### 4. Navigation — `src/components/layout/MobileLayout.tsx`

Add `Brain` to the lucide-react import:
```tsx
import { Home, Calendar, Users, Inbox as InboxIcon, Brain, ... } from "lucide-react";
```

Add nav item to the `navItems` array:
```tsx
{ path: "/intelligence", icon: Brain, label: "Intel" },
```

### 5. Data Source

All data comes from Nova Core's shared Supabase backend via the
`novaCore` client already configured in `src/lib/supabase-untyped.ts`.
No additional edge functions or secrets are required.
