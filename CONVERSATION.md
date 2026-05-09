# Color Vision Assistant — Build Conversation

## User Request

> Can you build me a chrome browser extension that can change the browser colors/display to accommodate and/or simulate color blindness?

---

## Planning Phase

### Initial Exploration

The working directory (`c:\Users\MdotStrange\Tesdt1`) was empty, so this was a fresh project.

A Plan agent was launched to design a Chrome extension (Manifest V3) that:

1. **Simulates** color blindness — lets a user see what a webpage looks like through the eyes of someone with various types of color blindness (protanopia, deuteranopia, tritanopia, achromatopsia, etc.)
2. **Accommodates** color blindness — adjusts webpage colors to make them more distinguishable for users who actually have color blindness (daltonization / color correction)

### Design Decisions

**Technical approach:**
- SVG `feColorMatrix` filters applied to the root `<html>` element
- Single GPU shader pass — covers all page content including video, canvas, and iframes
- No build tools — pure vanilla JS/CSS/HTML
- Manifest V3 (current Chrome extension standard)
- State persisted via `chrome.storage.local`

**Color science:**
- **Simulation matrices** derived from the Viénot 1999 (protanopia, deuteranopia) and Brettel 1997 (tritanopia) models
- Anomalous trichromacy variants are weighted interpolations (~0.6 severity) between identity and full dichromacy matrices
- Achromatopsia uses ITU-R BT.601 luminance coefficients
- **Accommodation matrices** use precomputed daltonization: simulate → compute error → redistribute into visible channels → recombine, collapsed into a single matrix multiply

**8 supported types:**
- Protanopia / Protanomaly (red-blind / red-weak)
- Deuteranopia / Deuteranomaly (green-blind / green-weak)
- Tritanopia / Tritanomaly (blue-blind / blue-weak)
- Achromatopsia / Achromatomaly (total / partial monochromacy)

### User Preferences

**UI Style:** Colorful / playful — vibrant gradient background (purple → blue → cyan) with colored indicator dots for each type.

**Keyboard shortcut:** Yes — `Alt+Shift+C` to toggle current filter on/off without opening the popup (configurable by user in `chrome://extensions/shortcuts`).

---

## File Structure

```
Tesdt1/
  manifest.json
  icons/
    icon16.png
    icon48.png
    icon128.png
  popup/
    popup.html
    popup.css
    popup.js
  content/
    content.js
  background/
    service-worker.js
```

---

## Implementation Details

### manifest.json

- Manifest V3 with permissions: `storage`, `activeTab`, `scripting`
- `host_permissions: ["<all_urls>"]`
- Content script injected at `document_start` on all URLs, `all_frames: true`
- Background service worker for install defaults and tab update persistence
- `commands` entry for `toggle-filter` with suggested key `Alt+Shift+C`

### content/content.js — Core Filter Engine

- Injects a hidden SVG element with a `<filter>` containing `<feColorMatrix>` into `document.documentElement` at `document_start`
- Applies filter via `document.documentElement.style.filter = url(#filterId)`
- Stores all 16 matrices (8 simulation + 8 accommodation) in a lookup object
- Listens for messages from popup to switch/remove filters
- On load, reads `chrome.storage.local` to restore active filter across navigations
- Iframe guard: only applies filter in top frame (child frames inherit from parent compositing)
- Preserves any existing CSS filters on the page
- Injects `@media print` guard to disable filter in print preview

#### Simulation Matrices

| Type | Matrix (SVG feColorMatrix 20-value format) |
|---|---|
| Protanopia | `0.56667 0.43333 0 0 0 0.55833 0.44167 0 0 0 0 0.24167 0.75833 0 0 0 0 0 1 0` |
| Deuteranopia | `0.625 0.375 0 0 0 0.7 0.3 0 0 0 0 0.3 0.7 0 0 0 0 0 1 0` |
| Tritanopia | `0.95 0.05 0 0 0 0 0.43333 0.56667 0 0 0 0.475 0.525 0 0 0 0 0 1 0` |
| Protanomaly | `0.81667 0.18333 0 0 0 0.33333 0.66667 0 0 0 0 0.125 0.875 0 0 0 0 0 1 0` |
| Deuteranomaly | `0.8 0.2 0 0 0 0.25833 0.74167 0 0 0 0 0.14167 0.85833 0 0 0 0 0 1 0` |
| Tritanomaly | `0.96667 0.03333 0 0 0 0 0.73333 0.26667 0 0 0 0.18333 0.81667 0 0 0 0 0 1 0` |
| Achromatopsia | `0.299 0.587 0.114 0 0 0.299 0.587 0.114 0 0 0.299 0.587 0.114 0 0 0 0 0 1 0` |
| Achromatomaly | `0.618 0.32 0.062 0 0 0.163 0.775 0.062 0 0 0.163 0.32 0.516 0 0 0 0 0 1 0` |

#### Accommodation (Daltonization) Matrices

| Type | Matrix (SVG feColorMatrix 20-value format) |
|---|---|
| Protanopia | `1 0 0 0 0 0.30333 0.69667 0 0 0 0.30333 -0.30333 1 0 0 0 0 0 1 0` |
| Deuteranopia | `0.51 0.49 0 0 0 0 1 0 0 0 -0.49 0.49 1 0 0 0 0 0 1 0` |
| Tritanopia | `1 -0.3325 0.3325 0 0 0 0.6675 0.3325 0 0 0 0 1 0 0 0 0 0 1 0` |
| Protanomaly | `1 0 0 0 0 0.09167 0.90833 0 0 0 0.09167 -0.09167 1 0 0 0 0 0 1 0` |
| Deuteranomaly | `0.87083 0.12917 0 0 0 0 1 0 0 0 -0.12917 0.12917 1 0 0 0 0 0 1 0` |
| Tritanomaly | `1 -0.09167 0.09167 0 0 0 0.90833 0.09167 0 0 0 0 1 0 0 0 0 0 1 0` |
| Achromatopsia | `1.5 -0.25 -0.25 0 0 -0.25 1.5 -0.25 0 0 -0.25 -0.25 1.5 0 0 0 0 0 1 0` |
| Achromatomaly | `1.25 -0.125 -0.125 0 0 -0.125 1.25 -0.125 0 0 -0.125 -0.125 1.25 0 0 0 0 0 1 0` |

### popup/ — User Interface

- **320px wide**, colorful/playful theme with purple-to-blue gradient background
- Color-coded indicator dots next to each type: red for protan, green for deutan, blue for tritan, gray for achromat
- **Mode toggle**: segmented control switching between "Simulate" and "Accommodate"
- **Type selector**: 8 radio-style buttons with color indicator dots
- **Off button**: clears all filters
- Glassmorphism effects (`backdrop-filter: blur(8px)`, translucent white backgrounds)
- Smooth hover/selection animations, rounded corners
- Footer shows keyboard shortcut hint

### background/service-worker.js

- Sets default storage on install (`enabled: false, mode: "simulate", type: "protanopia"`)
- On `tabs.onUpdated` (status complete), re-sends active filter to content script for SPA navigation support
- Handles `toggle-filter` command (`Alt+Shift+C`) to toggle filter on/off without popup

### icons/

- Generated programmatically using .NET `System.Drawing`
- Color wheel eye design: 6 colored pie segments (purple, blue, cyan, green, yellow, red) with white inner circle and dark center dot
- Created at 16x16, 48x48, and 128x128 pixels

---

## Edge Cases Handled

- **Iframes**: `all_frames: true` in manifest, but filter only applied in top frame to avoid double-filtering
- **SPAs/dynamic content**: compositing-level filter covers all content automatically, no MutationObserver needed
- **Existing page filters**: preserved and composed with extension filter
- **Print**: `@media print { html { filter: none !important; } }` injected to disable in print
- **Performance**: single GPU shader pass, negligible overhead even on complex pages

---

## Storage Schema

```json
{
  "enabled": "boolean",
  "mode": "simulate | accommodate",
  "type": "protanopia | deuteranopia | tritanopia | protanomaly | deuteranomaly | tritanomaly | achromatopsia | achromatomaly"
}
```

---

## How to Install and Test

1. Open Chrome and go to `chrome://extensions`
2. Enable **Developer mode** (toggle in top-right)
3. Click **Load unpacked** and select the `Tesdt1` folder
4. Click the extension icon on any webpage to open the popup
5. Pick **Simulate** or **Accommodate** mode, then click a color blindness type
6. Use `Alt+Shift+C` to quickly toggle on/off

### Verification Checklist

- [ ] Open a colorful webpage (e.g., Google Images, a data visualization)
- [ ] Select "Simulate" > "Protanopia" — page should shift to yellow/blue tones
- [ ] Switch through all 8 types — each should produce a visibly different transformation
- [ ] Toggle to "Accommodate" mode — colors should look enhanced/shifted rather than reduced
- [ ] Click "Turn Off" — page returns to normal
- [ ] Enable a filter, navigate to a new page — filter should persist
- [ ] Test on YouTube (video content), Google Maps (canvas), and a site with iframes
- [ ] Press `Alt+Shift+C` — filter toggles without opening popup
- [ ] Verify print preview shows unfiltered content
