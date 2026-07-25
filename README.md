# PNJ GeoGuessr Tools

Tampermonkey userscript for GeoGuessr. It reads the active round location, shows the PNJ tools panel, provides a **COPY ID** button, and sends round data to the PNJ web resolver tools.

## Features

- **COPY ID**: copies the `pnj_user_id` used by the web resolver tools.
- **Tampermonkey panel toggle**: use **Hide / Show PNJ Panel** from the script menu to hide or show the tools panel.
- **Web telemetry**: sends the active round location to:
  - `http://localhost:3000/api/telemetry`
  - `https://gr.0xpnj.dev/api/telemetry`
- **Map preview**: shows a preview of the active round location.
- **Place exact / range**: places an exact pin or a range-based pin.
- **Auto Bot Mode**: automatically places guesses and continues rounds.

## Requirements

- A modern desktop browser (Brave, Chrome, Edge, etc.)
- **Tampermonkey** or **Violentmonkey** extension installed.
- PNJ web resolver tools running on `http://localhost:3000` or deployed at `https://gr.0xpnj.dev`.

## Related Projects

- [peenjeee/geoguessr-reverse-engineering](https://github.com/peenjeee/geoguessr-reverse-engineering) - browser extension version of PNJ GeoGuessr Tools.
- [peenjeee/geoguessr-challenge](https://github.com/peenjeee/geoguessr-challenge) - collection of free GeoGuessr challenge links.
- [peenjeee/geoguessr-web](https://github.com/peenjeee/geoguessr-web) - PNJ web resolver tools.

## Installation Guide

1. Open **Tampermonkey** or **Violentmonkey** extension.
2. Select **"Create a new script..."**.
3. Open `userscript.js` in this repository and copy all of its code.
4. Paste it into the **Tampermonkey** or **Violentmonkey** editor, replacing default code.
5. Save the script (`Ctrl+S`).

## How to Use

1. Open [GeoGuessr](https://www.geoguessr.com/).
2. Start a GeoGuessr round.
3. The PNJ GeoGuessr Tools panel will appear on your screen.
4. Click **COPY ID**.
5. Open `https://gr.0xpnj.dev` or `http://localhost:3000`.
6. Paste the copied ID and submit it.
7. The resolver tools will show the map and location data for the active GeoGuessr round.

## Hide or Show the Panel

Open the Tampermonkey menu for **PNJ GeoGuessr Tools**, then click **Hide / Show PNJ Panel**.

## Data Flow

```text
GeoGuessr round -> userscript reads coord -> sends telemetry with pnj_user_id -> PNJ web resolver tools
```

The same `pnj_user_id` is stored in browser `localStorage`, so the web resolver tools can show data for the copied ID.
