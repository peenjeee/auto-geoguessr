# PNJ GeoGuessr Auto Bot

An automated bot (Userscript) to play GeoGuessr automatically, specifically designed to work seamlessly alongside the [PNJ GeoGuessr Tools](https://geo.0xpnj.dev/) extension ([GitHub Repository](https://github.com/peenjeee/geoguessr-reverse-engineering)). This script will intelligently place guesses and proceed to the next round without any manual interaction from the player.

> [!WARNING]
> **Disclaimer:** Please do not use this bot to play against other players (Multiplayer/Versus mode). It is strictly intended to be used for farming EXP and practicing in Classic Map mode only.

## Features
- **Auto Next Round**: Automatically detects and clicks the *Play Next Round*, *View Summary*, or *Play Again* buttons at the end of a round.
- **Auto Place Range**: Automatically triggers the "PLACE RANGE" function from the PNJ extension.
- **Auto Guess**: Submits the guess to the GeoGuessr server immediately after the coordinates are placed.
- **Shadow DOM & Floating UI Penetration**: Advanced element detection designed to find button elements hidden within the *Shadow DOM* or those using absolute/floating CSS positions in modern browsers.
- **True Background Automation**: Operates continuously in the background. You can minimize the browser or switch tabs without breaking the loop!

## Requirements
- A modern desktop browser (Brave, Chrome, Edge, etc.)
- **Tampermonkey** or **Violentmonkey** extension installed.
- **PNJ GeoGuessr Tools** extension installed and active ([Website](https://geo.0xpnj.dev/) | [GitHub](https://github.com/peenjeee/geoguessr-reverse-engineering)).

## Installation Guide
1. Open the Tampermonkey extension in your browser.
2. Select **"Create a new script..."**.
3. Open the `userscript.js` file in this repository and copy all of its code.
4. Paste it into the Tampermonkey editor, replacing all the default code there.
5. Press **File > Save** (or `Ctrl+S`).
6. Ensure the script is enabled in your Tampermonkey dashboard.

## How to Use
1. Open [GeoGuessr](https://www.geoguessr.com/).
2. Start a game in **Classic** mode (Singleplayer).
3. Ensure the Tampermonkey script and the PNJ extension are both active.
4. The bot will immediately take over once the map loads. You can even close or hide the PNJ UI panel, and the bot will still function normally!
5. Sit back and watch the EXP roll in.

## Customization & Configuration
If you want to tweak the bot's speed, you can modify these values inside the `userscript.js` file:
- **Guess Delay (`800` ms)**: Located at `setTimeout(..., 800)`. This gives the GeoGuessr server enough time to register the pin dropped by the PNJ extension before clicking Guess. Increase this if your internet is slow.
- **Scan Interval (`2000` ms)**: Located at the very bottom `}, 2000);`. The bot scans the screen every 2 seconds for new buttons.

## Troubleshooting
- **Bot is not doing anything**: Ensure you are in a Classic game. Make sure the Tampermonkey script is toggled ON.
- **Bot places pin but doesn't guess**: Your internet might be lagging. Try increasing the Guess Delay from `800` to `1500` (1.5 seconds) in the script.
- **To stop the bot**: Simply refresh (F5) the GeoGuessr page and turn off the script via the Tampermonkey popup menu.
