# PNJ GeoGuessr Auto Bot

An automated bot (Userscript) to play GeoGuessr automatically, specifically designed to work alongside the [PNJ GeoGuessr Tools](https://geo.0xpnj.dev/) extension ([GitHub Repository](https://github.com/peenjeee/geoguessr-reverse-engineering)). This script will intelligently place guesses and proceed to the next round without manual interaction from the player.

> [!WARNING]
> **Disclaimer:** Please do not use this bot to play against other players (Multiplayer/Versus mode). It is strictly intended to be used for farming EXP and practicing in Classic Map mode only.

## Features
- **Auto Next Round**: Automatically detects and clicks the *Play Next Round*, *View Summary*, or *Play Again* buttons at the end of a round.
- **Auto Place Range**: Automatically clicks the "PLACE RANGE" button from the PNJ extension UI.
- **Auto Guess**: Submits the guess to the GeoGuessr server immediately after the coordinates are placed.
- **Shadow DOM & Floating UI Penetration**: Specifically designed to detect button elements hidden within the *Shadow DOM* or those using absolute/floating positions in modern browsers (like Brave, Chrome, Edge).

## Requirements
- Browser (Brave, Chrome, Edge, etc.)
- **Tampermonkey** or **Violentmonkey** extension installed in your browser.
- **PNJ GeoGuessr Tools** extension installed and active ([Website](https://geo.0xpnj.dev/) | [GitHub](https://github.com/peenjeee/geoguessr-reverse-engineering)).

## Installation Guide
1. Open the Tampermonkey extension in your browser.
2. Select **"Create a new script..."**.
3. Open the `userscript.js` file in this folder and copy all of its code.
4. Paste it into the Tampermonkey editor, replacing all the default code there.
5. Press **File > Save** (or `Ctrl+S`).
6. The script is ready to use!

## How to Use
1. Open [GeoGuessr](https://www.geoguessr.com/).
2. Start a game in **Classic** mode.
3. Ensure your PNJ extension is active and its UI panel is visible on the screen.
4. Sit back, and the bot will take over!

## Notes
- **True Background Automation**: Once started, this script functions completely autonomously. As long as you maintain an active internet connection and keep the browser tab open with the extension loaded, the bot will run continuously in the background. You are completely free to switch to other tabs, minimize the browser, or step away from your computer to focus on other activities while the bot grinds EXP for you!
- You can stop the bot by refreshing (F5) the GeoGuessr page or disabling the script via the Tampermonkey popup menu.
- The delay for guessing is set to 800ms so the GeoGuessr server has time to register the pin movement from the PNJ extension. If it feels too slow or too fast, you can change the number `800` in the `userscript.js` file.
