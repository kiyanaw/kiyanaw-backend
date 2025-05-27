# WaveformPlayer Component - Functional Requirements

## Core Purpose
The WaveformPlayer provides an interactive audio/video waveform visualization with region-based navigation and editing capabilities.

## Deep Linking Behavior
- **Initial Load**: When a user navigates to a URL with a region parameter (inbound region), the player must:
  - Automatically scroll the waveform to center the target region
  - Highlight the target region with a distinct color (blue)
  - Position the playhead at the region's start time
  - Maintain this highlighting until user interaction changes it

## Region Highlighting Rules
- **Active Region**: Only one region can be highlighted at a time
- **Playhead-Based Highlighting**: When audio/video plays and the playhead enters a region:
  - The region becomes highlighted (blue)
  - When the playhead exits, the region returns to default color (gray)
- **Inbound Region Priority**: The deep-linked region maintains its highlight until:
  - User manually plays a different region
  - User seeks to a different position
  - Playhead naturally moves through regions during playback

## User Interaction Behaviors

### Region Clicking
- **From Region List**: User clicks a region in the sidebar
  - Player seeks to region start
  - Begins playback immediately
  - Region becomes highlighted during playback
  - Clears any previous inbound region highlighting

### Playback Controls
- **Play/Pause Button**: 
  - If inbound region exists: seeks to inbound region and plays
  - Otherwise: normal play/pause from current position
- **Manual Seeking**: User drags playhead or clicks waveform
  - Clears inbound region highlighting
  - Normal region highlighting follows playhead position

### Region Editing (when enabled)
- **Drag Selection**: User can create new regions by dragging on waveform
- **Region Resize**: Existing regions can be resized by dragging edges
- **Region Movement**: Regions can be repositioned by dragging

## Visual Feedback States
- **Default Region**: Light gray background (`rgba(0, 0, 0, 0.1)`)
- **Active/Highlighted Region**: Blue background (`rgba(0, 213, 255, 0.1)`)
- **Region Numbers**: Display index numbers within each region
- **Playhead**: Shows current playback position
- **Waveform Centering**: Auto-centers view on target regions

## Consistency Requirements
- **State Persistence**: Inbound region highlighting persists across component re-renders
- **Event Synchronization**: Region highlighting must stay synchronized with playhead position
- **No Race Conditions**: Highlighting changes must be atomic and predictable
- **Performance**: Region color updates should not trigger expensive re-renders

## Edge Cases
- **Boundary Positioning**: When playhead is exactly at region boundaries, behavior must be deterministic
- **Rapid Seeking**: Multiple quick seek operations should not cause visual glitches
- **Component Remounting**: Deep-link behavior must work consistently even if component remounts
- **Empty Regions**: Regions with minimal duration should still be interactive
- **Overlapping Events**: Simultaneous region-in/region-out events must be handled gracefully

## Integration Points
- **Event Bus**: Communicates region events with parent components
- **URL Parameters**: Responds to inbound region from routing
- **Region Data**: Synchronizes with external region state management
- **Media Element**: Coordinates with underlying audio/video element for playback 