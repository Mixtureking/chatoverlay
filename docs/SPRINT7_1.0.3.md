# Sprint 7 - Version 1.0.3

Sprint 7 adds the interactivity and widget layer for OBS broadcast screens.

## Folder Structure

```text
server.ts
src/server/chatInteractivity.ts
src/components/sprint7/Sprint7Widgets.tsx
src/components/sprint7/sprint7State.ts
src/index.css
src/types.ts
docs/SPRINT7_1.0.3.md
```

## OBS Widget Routes

Use one Express server and separate OBS browser sources by route:

```text
http://localhost:3000/obs-chat
http://localhost:3000/obs-timer
http://localhost:3000/obs-wheel
```

Each route renders only the matching widget.

## Interactivity APIs

Parse a chat command:

```http
POST /api/interactivity/chat-command
Content-Type: application/json

{
  "userId": "youtube-channel-id",
  "messageText": "!vote A"
}
```

Vote state:

```http
GET /api/interactivity/votes
POST /api/interactivity/votes
DELETE /api/interactivity/votes
```

`POST /api/interactivity/votes` accepts:

```json
{
  "userId": "youtube-channel-id",
  "option": "A"
}
```

Duplicate votes from the same `userId` are rejected and do not increment totals.

## Chat Commands

Supported command formats:

```text
!roll 20
!pick
!vote A
!vote B
```

Messages that do not start with `!` are ignored by the parser.

## Sprint 7 Widget State

The Sprint 7 state exported by the widget and dashboard uses the required top-level keys:

```json
{
  "todoList": [],
  "customCSS": "",
  "socialLinks": {}
}
```

The import flow is backward compatible with older payloads that wrapped the Sprint 7 object under `sprint7`.

## Widgets

### Chat Widget
- Vote bar A/B with real-time updates.
- Chat roulette with `cyberpunk-glitch`.
- Todo list with add, edit, delete, toggle, clear, and reset.
- Social links marquee with add, edit, delete, reset.
- Live CSS editor with safe injection into `#custom-css-injector`.
- Export, import, and copy state JSON.

### Timer Widget
- Countdown timer in `mm:ss`.
- Clamps at `00:00`.
- Displays completion text when finished.

### Wheel Widget
- SVG wheel with 60fps rotation.
- Wheel center uses `<g id="center">` with a nested `<image>`.
- Prefers live chat authors when YouTube settings are available.
- Falls back to default names safely when not connected.

## CSS Requirements

Implemented selectors:

```css
#custom-css-injector
.cyberpunk-glitch
.arwass-logo
```

`.arwass-logo` uses `object-fit: contain` to preserve the logo ratio.

## Acceptance Checklist

- `GET /obs-chat` renders chat widgets.
- `GET /obs-timer` renders the countdown timer.
- `GET /obs-wheel` renders the wheel only.
- Wheel center contains `<g id="center"><image ... /></g>`.
- Timer clamps at `00:00` and then shows done text.
- Todo completed items render with strike-through.
- CSS editor injects valid CSS into `#custom-css-injector`.
- Unbalanced CSS braces are skipped to prevent a blank screen.
- Export/import restores `todoList`, `customCSS`, and `socialLinks`.

## Verification

Install dependencies first:

```powershell
npm install
npm run lint
npm run dev
```

Open the OBS routes above in a browser or OBS Browser Source.

