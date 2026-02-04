

# Enhanced Mobile Data Collection Mode

## Overview

Transform the current mobile mode from frequency-only to a full-featured data collection interface that supports all data types (frequency, duration, latency, interval, ABC) with the ability to add new behaviors on-the-fly, plus the option to switch back to desktop view.

---

## Key Features

1. **All Data Types**: Frequency (+/-), Duration, Latency, Interval, ABC
2. **Add Behaviors**: Create new behaviors directly from mobile mode
3. **Decrement Support**: Easily correct over-counted frequency
4. **Opt-Out Toggle**: Switch to desktop view even on mobile devices

---

## Implementation Plan

### Phase 1: Mobile Mode Preference System

Create a preference system that lets users override automatic mobile detection.

**New Hook: `useMobilePreference.ts`**
- Stores user preference in localStorage
- Three states: `'auto'` | `'mobile'` | `'desktop'`
- Default is `'auto'` (use device detection)
- Persists across sessions

**Integration with `useIsMobile`**
- Check preference first
- If `'auto'`, use device detection
- If `'mobile'` or `'desktop'`, use that regardless of device

### Phase 2: Mobile Layout with Opt-Out Toggle

**Modify `MobileLayout.tsx` / `MainLayout.tsx`**
- Add settings icon in mobile header
- Quick toggle: "Switch to Desktop View"
- Shows confirmation that layout will change
- Remembers preference

**Desktop Mode on Mobile**
- When opted out, shows full desktop interface
- May need horizontal scroll on small screens
- Small floating button to "Return to Mobile View"

### Phase 3: Data Type Selector Toolbar

**New Component: `MobileDataToolbar.tsx`**
- Fixed at bottom of screen
- Five data type icons: Frequency, Duration, Latency, Interval, ABC
- Plus button for adding new behaviors
- Settings gear for mode toggle

```
┌──────────────────────────────────────────┐
│  [#]   [⏱]   [⏲]   [▦]   [ABC]   [+]  [⚙] │
└──────────────────────────────────────────┘
  Freq  Dur   Lat   Int   ABC   Add  Settings
```

### Phase 4: Enhanced Frequency Tracker

**New Component: `MobileFrequencyTally.tsx`**
- Giant center tap zone for +1 (existing)
- Large [-1] button in bottom-left corner
- Current count displayed prominently
- Haptic feedback on both actions

```
┌─────────────────────────────────┐
│                                 │
│           Count: 5              │
│                                 │
│      [  Tap anywhere +1  ]      │
│                                 │
│  [-1]                           │
└─────────────────────────────────┘
```

### Phase 5: Duration Tracker

**New Component: `MobileDurationTracker.tsx`**
- Giant START/STOP toggle button
- Live running timer (large font)
- Total session duration shown above
- Color changes when active (green = running)

```
┌─────────────────────────────────┐
│     Total: 3m 45s (2 episodes)  │
│                                 │
│         ┌─────────┐             │
│         │  0:32   │  (live)     │
│         └─────────┘             │
│                                 │
│    [    ■ STOP TIMER    ]       │
└─────────────────────────────────┘
```

### Phase 6: Latency Tracker

**New Component: `MobileLatencyTracker.tsx`**
- Two-step recording flow
- Step 1: Tap "Instruction Given" - starts timer
- Step 2: Tap "Response Occurred" - stops and records
- Auto-resets for next trial

```
┌─────────────────────────────────┐
│     Avg Latency: 4.2s (3 trials)│
│                                 │
│         ┌─────────┐             │
│         │  0:07   │  (waiting)  │
│         └─────────┘             │
│                                 │
│    [ RESPONSE OCCURRED ]        │
└─────────────────────────────────┘
```

### Phase 7: Interval Tracker

**New Component: `MobileIntervalTracker.tsx`**
- Shows current interval progress bar
- Large "Occurred" button to mark behavior during interval
- Grid of past intervals at bottom
- Visual/audio cue at interval end

```
┌─────────────────────────────────┐
│  Interval 5 of 10    [0:23/0:30]│
│  ████████████░░░░░░░░░          │
│                                 │
│    [  BEHAVIOR OCCURRED  ]      │
│                                 │
│  [✓][✓][○][✓][?][ ][ ][ ][ ][ ] │
└─────────────────────────────────┘
```

### Phase 8: ABC Entry

**New Component: `MobileABCEntry.tsx`**
- Bottom sheet that slides up
- Scrollable sections for A, B, C
- Large toggle chips for each option
- Multi-select for behaviors
- Save button at bottom

```
┌─────────────────────────────────┐
│  Record ABC Event          [X]  │
├─────────────────────────────────┤
│ Antecedent:                     │
│ [Demand] [Transition] [Denied]  │
│ [Attention away] [Alone] [+]    │
│                                 │
│ Behavior:                       │
│ [✓ Aggression] [Elopement]      │
│ [SIB] [Tantrum]                 │
│                                 │
│ Consequence:                    │
│ [Attention] [Escape] [Tangible] │
│ [Ignore] [Redirect] [+]         │
│                                 │
│        [ SAVE ENTRY ]           │
└─────────────────────────────────┘
```

### Phase 9: Add Behavior Sheet

**New Component: `MobileAddBehaviorSheet.tsx`**
- Drawer slides up from bottom
- Behavior name input (required)
- Data method checkboxes
- Optional operational definition
- Adds to current student immediately

```
┌─────────────────────────────────┐
│  Add New Behavior          [X]  │
├─────────────────────────────────┤
│ Behavior Name:                  │
│ ┌─────────────────────────────┐ │
│ │ e.g., Verbal aggression     │ │
│ └─────────────────────────────┘ │
│                                 │
│ Track with:                     │
│ [✓] Frequency  [✓] Duration     │
│ [ ] Latency    [ ] Interval     │
│ [✓] ABC                         │
│                                 │
│        [ ADD BEHAVIOR ]         │
└─────────────────────────────────┘
```

---

## Technical Details

### Files to Create

```
src/components/mobile/
├── MobileDataToolbar.tsx       # Bottom data type selector + settings
├── MobileFrequencyTally.tsx    # Enhanced frequency with +/-
├── MobileDurationTracker.tsx   # Start/stop duration timer
├── MobileLatencyTracker.tsx    # Two-step latency recording
├── MobileIntervalTracker.tsx   # Mobile interval tracking
├── MobileABCEntry.tsx          # ABC recording bottom sheet
├── MobileAddBehaviorSheet.tsx  # Add new behavior drawer
└── MobileSettingsSheet.tsx     # Settings including desktop toggle

src/hooks/
└── useMobilePreference.ts      # Preference for mobile/desktop/auto
```

### Files to Modify

1. **`src/hooks/use-mobile.tsx`**
   - Import `useMobilePreference`
   - Check preference before device detection
   - Export combined hook that respects user preference

2. **`src/components/mobile/MobileDataMode.tsx`**
   - Remove frequency-only filter
   - Add `dataMode` state for current collection type
   - Import and render appropriate tracker component
   - Add toolbar at bottom
   - Add settings sheet for opt-out

3. **`src/components/MainLayout.tsx`**
   - Use enhanced `useIsMobile` that respects preference
   - Add small floating "Mobile View" button when user has opted for desktop on mobile

4. **`src/components/mobile/index.ts`**
   - Export all new components

### Mobile Preference Hook

```typescript
// src/hooks/useMobilePreference.ts
type MobilePreference = 'auto' | 'mobile' | 'desktop';

export function useMobilePreference() {
  const [preference, setPreference] = useState<MobilePreference>(() => {
    return (localStorage.getItem('mobilePreference') as MobilePreference) || 'auto';
  });

  const setMobilePreference = (pref: MobilePreference) => {
    localStorage.setItem('mobilePreference', pref);
    setPreference(pref);
  };

  return { preference, setMobilePreference };
}
```

### Enhanced useIsMobile Hook

```typescript
// Updated src/hooks/use-mobile.tsx
export function useIsMobile() {
  const { preference } = useMobilePreference();
  const [isDeviceMobile, setIsDeviceMobile] = useState<boolean>(false);

  useEffect(() => {
    // Device detection logic (existing)
    const mql = window.matchMedia(`(max-width: 767px)`);
    setIsDeviceMobile(mql.matches);
    // ...listener setup
  }, []);

  // Respect user preference
  if (preference === 'mobile') return true;
  if (preference === 'desktop') return false;
  return isDeviceMobile; // 'auto' mode
}
```

### Settings Sheet Content

```typescript
// In MobileSettingsSheet.tsx
<Sheet>
  <SheetContent side="bottom">
    <SheetHeader>
      <SheetTitle>Display Settings</SheetTitle>
    </SheetHeader>
    
    <div className="py-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">Use Desktop View</p>
          <p className="text-sm text-muted-foreground">
            Switch to full desktop interface
          </p>
        </div>
        <Switch 
          checked={preference === 'desktop'}
          onCheckedChange={(checked) => 
            setMobilePreference(checked ? 'desktop' : 'auto')
          }
        />
      </div>
    </div>
  </SheetContent>
</Sheet>
```

---

## User Experience Summary

### Automatic Mobile Mode
- Detects mobile device automatically
- Shows optimized touch interface
- All data types available via bottom toolbar

### Opting Out
1. Tap settings gear in toolbar (or header)
2. Toggle "Use Desktop View" switch
3. Interface switches to full desktop layout
4. Preference saved for future sessions

### Returning to Mobile Mode
- When in desktop mode on mobile, small floating button appears
- Tap "Mobile View" to return
- Or go to settings to toggle back

### Data Collection Flow
1. Select student (swipe or tap dots)
2. Select behavior (swipe or tap chips)
3. Select data type (tap toolbar icon)
4. Collect data with giant touch targets
5. Swipe to next behavior/student

---

## Summary of Changes

| Component | Action | Purpose |
|-----------|--------|---------|
| `useMobilePreference.ts` | Create | Store mobile/desktop preference |
| `use-mobile.tsx` | Modify | Respect user preference |
| `MobileDataMode.tsx` | Modify | Add all data types, toolbar, settings |
| `MobileDataToolbar.tsx` | Create | Bottom navigation for data types |
| `MobileFrequencyTally.tsx` | Create | Frequency with +/- buttons |
| `MobileDurationTracker.tsx` | Create | Duration start/stop |
| `MobileLatencyTracker.tsx` | Create | Latency two-step recording |
| `MobileIntervalTracker.tsx` | Create | Mobile interval grid |
| `MobileABCEntry.tsx` | Create | ABC entry bottom sheet |
| `MobileAddBehaviorSheet.tsx` | Create | Add behavior from mobile |
| `MobileSettingsSheet.tsx` | Create | Settings with opt-out toggle |
| `MainLayout.tsx` | Modify | Add "Mobile View" button when opted out |

