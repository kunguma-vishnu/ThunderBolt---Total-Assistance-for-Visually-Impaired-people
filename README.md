# ThunderBolt — Total Assistance for Visually Impaired People

**PathGuide** is a camera + Claude vision navigation assistant for blind users, designed for a cap-mounted Android phone. A sighted helper sets it up once (load a map, pick a destination); after that the whole screen is one big button — tap, take a photo, hear a spoken instruction.

## Features

- **Tap-to-navigate interface** — the entire screen is a single button. Tap it, the phone captures a photo from the rear camera, sends it to Claude, and speaks the response aloud (via the Web Speech API).
- **Waypoint-based routing** — maps are ordered lists of waypoints (label, notes, transition instructions) loaded from JSON. Claude tracks current progress and gives step-by-step instructions ("turn slightly right, take 3 small steps") without distances or compass directions.
- **Hazard detection** — if the live photo shows an obstacle, cable, wet floor, step, person, or open door edge, the instruction addresses the hazard first.
- **Confidence-aware guidance** — if a photo doesn't match the expected waypoint, or is too dark/blurry, PathGuide asks the user to stop and hold still rather than guessing a direction.
- **Arrival & waypoint advancement detection** — Claude signals when the user has reached the next waypoint or the final destination.
- **Practice mode** — replay a built-in demo sequence or a recorded cache of a previous live run, with no API calls, for training or demos without network/cost.
- **Session recording** — optionally record live Claude responses to a local practice cache for later replay.
- **Debug panel** — a session log for the team to inspect requests/responses during testing.
- **Server-side API key** — Claude calls go through a Netlify serverless function (`claude-proxy.js`) so the Anthropic API key never reaches the browser.

## Files

| File | Purpose |
|---|---|
| `pathguide.html` | Main app. Calls Claude through the Netlify function proxy — no API key ever touches the browser. Use this for real deployments. |
| `index.html` | Standalone variant that calls the Claude API directly from the browser using a key entered by the user and stored in `localStorage`. Useful for quick local testing without deploying a proxy. |
| `netlify/functions/claude-proxy.js` | Serverless function that holds `ANTHROPIC_API_KEY` server-side and forwards requests to the Claude Messages API. |
| `netlify.toml` | Netlify build config (functions directory + publish root). |

Both HTML files are single-file apps — all CSS and JS are inline, no build step or bundler required.

## Setup & Installation

### 1. Deploy to Netlify (recommended — keeps your API key private)

1. Fork or clone this repo.
2. Create a new site on [Netlify](https://www.netlify.com/) and connect it to your repo (or drag-and-drop deploy).
3. In **Site settings → Environment variables**, add:
   - `ANTHROPIC_API_KEY` = your Claude API key
4. Deploy. Netlify will pick up `netlify.toml` automatically (publishes the repo root, functions live in `netlify/functions`).
5. Open the deployed site — this serves `pathguide.html`, which calls `/.netlify/functions/claude-proxy` for all Claude requests.

Netlify provides HTTPS by default, which is required for camera access (`getUserMedia`) on mobile browsers.

### 2. Local / quick testing (no deploy)

If you just want to try it out without setting up a proxy:

1. Open `index.html` directly (or serve it over HTTPS/localhost — camera access requires a secure context).
2. On the setup screen, paste your Claude API key into the **API key** field. It's stored only in that device's `localStorage`.
3. Load a map and pick a destination (see below), or enable **Practice mode** to try it without any API key at all.

### 3. Loading a map

Maps are JSON with this shape:

```json
{
  "map_version": 1,
  "location_name": "string",
  "waypoints": [
    {
      "label": "string",
      "notes": "string (optional)",
      "transition_from_previous": "string (optional)"
    }
  ]
}
```

On the setup screen you can:
- Upload a map JSON file, or
- Paste map JSON directly, or
- Load a map previously saved to `localStorage` under the key `pathmapper_maps` (e.g. by a companion map-authoring tool).

### 4. Running a session

1. Load a map and pick a destination waypoint.
2. (Optional) Enable **Practice mode** to demo without live API calls, or **Record live responses** to save a cache for later practice replay.
3. Tap **Start Navigation**. Hand the phone to the user.
4. The user taps anywhere on screen to capture a photo and get the next spoken instruction.

## Requirements

- A phone browser with camera (`getUserMedia`) and speech synthesis support (modern mobile Chrome/Safari).
- HTTPS (or localhost) — required for camera access.
- A Claude API key (set as a Netlify environment variable for the proxy setup, or entered manually for the standalone `index.html`).
