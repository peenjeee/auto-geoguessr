const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(path.join(__dirname, "userscript.js"), "utf8");
const helpers = source.slice(
    source.indexOf("    function asNumber"),
    source.indexOf("    function rememberLocations")
);
const load = new Function("isJunkCoord", `${helpers}; return collectCoords;`);
const collectCoords = load(() => false);

const candidates = collectCoords({
    rounds: [{
        panorama: { latitude: "1.25", longitude: "2.5" },
        guess: { lat: 3, lng: 4 },
    }],
}, "/api/game");

assert.deepEqual(
    candidates.map(({ lat, lng, round }) => ({ lat, lng, round })),
    [{ lat: 1.25, lng: 2.5, round: 1 }]
);
