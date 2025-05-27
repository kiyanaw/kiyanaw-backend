# WaveSurfer "Blinking" Issue – Root Cause & Fix

## 👀 Symptom
While interacting with the waveform (zoom / drag / just letting it play) the entire WaveSurfer canvas keeps flashing – the player appears to re-initialise every second, making it unusable.

## 🔍 Root Cause
1. **Region store emits redundant updates**  
   `src/hooks/useRegions.ts` subscribes to DataStore using `DataStore.observeQuery(Region, …).subscribe(snapshot => …)`.  
   Amplify fires **multiple snapshots** during sync (initial load, each delta, `isSynced` heartbeat, etc.).  
2. **Unconditional `setRegions(snapshot.items)`**  
   Every snapshot – even if the `items` array is identical – calls `setRegions`, regenerating a **new `regions` array reference**.
3. **WaveformPlayer clears & re-adds regions on every `regions` change**  
   In `src/components/player/WaveformPlayer.tsx`:
   ```ts
   const renderRegions = useCallback(() => {
     regionsPluginRef.current.clearRegions();
     regions.forEach(r => regionsPluginRef.current.addRegion(…));
   }, [regions, canEdit]);
   ```
   Because `regions` is a **new reference each snapshot**, `renderRegions` executes, clearing the plugin – the canvas flashes.

The WaveSurfer instance itself is **not** being recreated; the constant *clear → paint* cycle is what looks like a re-render / "blink".

## ✅ Fix
Only update React state when the Regions list **actually changes**.

### 1. Debounce `setRegions` inside the subscription
```ts
// src/hooks/useRegions.ts
import isEqual from 'lodash.isequal';
…
const regionSubscription = DataStore.observeQuery(Region, …)
  .subscribe(({ items, isSynced }) => {
    // Ignore intermediate snapshots
    if (!isSynced) return;

    setRegions((prev) => {
      // Prevent redundant updates
      if (isEqual(prev.map(r => r.id), items.map(r => r.id))) return prev;
      return items;
    });
  });
```

### 2. Alternatively: guard inside `setRegions`
Add a shallow-compare at the top of `setRegions` so identical input is discarded.
```ts
const setRegions = useCallback((regions: any[]) => {
  setState(prev => {
    // 🔒 short-circuit when nothing changed
    if (prev.regions.length === regions.length &&
        prev.regions.every((r, i) => r.id === regions[i].id && r.start === regions[i].start && r.end === regions[i].end)) {
      return prev;
    }
    … // existing sort / map logic
  });
}, []);
```

Either approach stops the flood of redundant `regions` updates, so `renderRegions` only fires when something *really* changed.  The waveform remains steady; zoom & drag work smoothly.

## 📝 Next Steps
* Consider throttling high-frequency DataStore snapshots globally with a helper.
* If you need live cursors / locks, emit separate events instead of replacing the whole `regions` array. 