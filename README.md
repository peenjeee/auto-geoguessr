# PNJ GeoGuessr Auto Bot

An automated standalone bot and Userscript helper to play GeoGuessr automatically, featuring an interactive control panel, map preview, and automated gameplay.

## Features

- **MapLibre GL / MapCN Map Engine**: WebGL vector map preview with CARTO Voyager light theme, smooth drag-to-pan, and scroll zoom without page zoom.
- **Persistent Map Viewport**: Map position stays locked during the round and only resets when a new round location loads.
- **Protected Location Pin**: Network request filter prevents map zoom and pan in GeoGuessr from altering the location pin.
- **Independent Score Range Inputs**: Independent min/max score range inputs (0 - 5000) with smooth dual-range sliders.
- **Auto Bot Mode**: Automatically places guesses and clicks Next Round / Play Again buttons.

## Requirements

- A modern desktop browser (Brave, Chrome, Edge, etc.)
- **Tampermonkey** or **Violentmonkey** extension installed.

## Installation Guide

1. Open Tampermonkey in your browser.
2. Select **"Create a new script..."**.
3. Open `userscript.js` in this repository and copy all of its code.
4. Paste it into the Tampermonkey editor, replacing default code.
5. Save the script (`Ctrl+S`).

## How to Use

1. Open [GeoGuessr](https://www.geoguessr.com/).
2. Start a game in **Classic** mode (Singleplayer).
3. The PNJ GeoGuessr Tools panel will appear on your screen.
4. Click **PLACE EXACT** or **PLACE RANGE** to drop pins, or toggle **AUTO BOT** for continuous background play.
