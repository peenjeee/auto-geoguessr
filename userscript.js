// ==UserScript==
// @name         PNJ GeoGuessr Tools
// @namespace    http://tampermonkey.net/
// @version      4.0
// @description  Full-featured GeoGuessr helper.
// @author       Peenjeee
// @match        https://www.geoguessr.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=geoguessr.com
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    console.log("PNJ GeoGuessr Userscript v4.0 Loaded!");

    // Clear stale cache
    try {
        localStorage.removeItem("pnj_rnd_loc");
        localStorage.removeItem("pnj_auto_bot");
    } catch (e) { }

    const state = (window.__pnjState = window.__pnjState || {
        locations: [],
        current: null,
        autoBot: false,
        mapScale: 1492.7,
        minScore: 4500,
        maxScore: 5000
    });

    // Ensure state defaults are valid numbers
    if (!state.minScore || state.minScore < 0) state.minScore = 4500;
    if (!state.maxScore || state.maxScore <= 0) state.maxScore = 5000;

    let lastMapKey = "";

    // ----------------------------------------------------
    // Coordinates Extraction & Hooking
    // ----------------------------------------------------
    function rememberLocation(coord) {
        if (!coord || typeof coord.lat !== "number" || typeof coord.lng !== "number") return;
        if (Math.abs(coord.lat) > 90 || Math.abs(coord.lng) > 180 || (coord.lat === 0 && coord.lng === 0)) return;
        if (Math.abs(coord.lat - 74.01954) < 0.001 && Math.abs(coord.lng - 22.5) < 0.001) return;

        state.current = coord;
        if (window.__pnjState) window.__pnjState.current = coord;
        state.locations.push(coord);
        if (state.locations.length > 20) state.locations.shift();

        updateMapFrame(coord);
    }

    let maplibreMap = null;
    let maplibreMarker = null;

    function loadMapLibre(callback) {
        if (window.maplibregl) {
            callback();
            return;
        }
        if (!document.getElementById("pnj-maplibre-css")) {
            const link = document.createElement("link");
            link.id = "pnj-maplibre-css";
            link.rel = "stylesheet";
            link.href = "https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.css";
            document.head.appendChild(link);
        }
        if (!document.getElementById("pnj-maplibre-js")) {
            const script = document.createElement("script");
            script.id = "pnj-maplibre-js";
            script.src = "https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.js";
            script.onload = callback;
            document.head.appendChild(script);
        }
    }

    function createMapcnMarker() {
        const el = document.createElement('div');
        el.className = 'pnj-mapcn-marker-container';
        el.innerHTML = `
            <div style="position: relative; width: 18px; height: 18px; display: flex; align-items: center; justify-content: center;">
                <div style="position: absolute; width: 100%; height: 100%; border-radius: 50%; background: #ff416d; opacity: 0.75; animation: mapcnPing 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
                <div style="position: relative; width: 14px; height: 14px; border-radius: 50%; background: #ff416d; border: 2.5px solid #ffffff; box-shadow: 0 0 10px rgba(255, 65, 109, 0.9);"></div>
            </div>
        `;
        return el;
    }

    function updateMapFrame(coord) {
        if (!coord || typeof coord.lat !== "number" || typeof coord.lng !== "number") return;
        createUI();

        const mapPanel = document.getElementById("pnj-map-panel");
        const mapContainer = document.getElementById("pnj-map-container");
        if (mapPanel) mapPanel.hidden = false;
        if (!mapContainer) return;

        if (!window.maplibregl) {
            loadMapLibre(() => updateMapFrame(coord));
            return;
        }

        if (!maplibreMap) {
            maplibreMap = new maplibregl.Map({
                container: 'pnj-map-container',
                style: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
                center: [coord.lng, coord.lat],
                zoom: 7,
                attributionControl: false
            });

            const markerEl = createMapcnMarker();

            maplibreMarker = new maplibregl.Marker({ element: markerEl, anchor: 'center' })
                .setLngLat([coord.lng, coord.lat])
                .addTo(maplibreMap);

            setTimeout(() => maplibreMap.resize(), 300);
        } else {
            maplibreMap.setCenter([coord.lng, coord.lat]);
            maplibreMap.setZoom(7);
            if (maplibreMarker) {
                maplibreMarker.setLngLat([coord.lng, coord.lat]);
            }
            setTimeout(() => maplibreMap.resize(), 100);
        }
    }

    function scanReactDOMForCoord() {
        try {
            const elements = document.querySelectorAll('div[class*="game_"], div[class*="layout_"], section');
            for (let el of elements) {
                for (let key in el) {
                    if (key.startsWith("__reactFiber") || key.startsWith("__reactProps")) {
                        let curr = el[key];
                        let depth = 0;
                        while (curr && depth < 30) {
                            const props = curr.memoizedProps;
                            if (props) {
                                if (props.currentRound && typeof props.currentRound.lat === 'number' && typeof props.currentRound.lng === 'number') {
                                    return { lat: props.currentRound.lat, lng: props.currentRound.lng };
                                }
                                if (props.game && props.game.rounds) {
                                    const r = props.game.rounds[props.game.rounds.length - 1];
                                    if (r && typeof r.lat === 'number' && typeof r.lng === 'number') {
                                        return { lat: r.lat, lng: r.lng };
                                    }
                                }
                                if (props.lat && props.lng && typeof props.lat === 'number' && typeof props.lng === 'number') {
                                    return { lat: props.lat, lng: props.lng };
                                }
                            }
                            curr = curr.return;
                            depth++;
                        }
                    }
                }
            }
        } catch (e) { }
        return null;
    }

    function getCurrentCoord() {
        if (window.__pnjState && window.__pnjState.current) {
            const c = window.__pnjState.current;
            if (c && !(Math.abs(c.lat - 74.01954) < 0.001 && Math.abs(c.lng - 22.5) < 0.001)) {
                return c;
            }
        }
        if (state.current) {
            return state.current;
        }
        const domCoord = scanReactDOMForCoord();
        if (domCoord) {
            rememberLocation(domCoord);
            return domCoord;
        }
        return null;
    }

    // Intercept Google Maps StreetView SDK
    function patchStreetView() {
        if (window.google && window.google.maps) {
            if (window.google.maps.StreetViewPanorama && !window.google.maps.StreetViewPanorama.__pnjPatched) {
                const OrigSV = window.google.maps.StreetViewPanorama;
                function PatchedSV(...args) {
                    const instance = new OrigSV(...args);
                    instance.addListener("position_changed", () => {
                        const pos = instance.getPosition();
                        if (pos && typeof pos.lat === "function") {
                            rememberLocation({ lat: pos.lat(), lng: pos.lng() });
                        }
                    });
                    return instance;
                }
                PatchedSV.prototype = OrigSV.prototype;
                window.google.maps.StreetViewPanorama = PatchedSV;
                window.google.maps.StreetViewPanorama.__pnjPatched = true;
            }
        }
    }
    setInterval(patchStreetView, 1000);

    // Network Hooking
    function distanceKm(lat1, lng1, lat2, lng2) {
        const r = 6371;
        const p = Math.PI / 180;
        const a = 0.5 - Math.cos((lat2 - lat1) * p) / 2
            + Math.cos(lat1 * p) * Math.cos(lat2 * p) *
            (1 - Math.cos((lng2 - lng1) * p)) / 2;
        return 2 * r * Math.asin(Math.sqrt(a));
    }

    function extractBounds(obj, depth = 0) {
        if (depth > 10 || !obj || typeof obj !== "object") return null;
        if (obj.min && obj.max && Number.isFinite(obj.min.lat) && Number.isFinite(obj.max.lat)) {
            return obj;
        }
        if (obj.bounds && obj.bounds.min && obj.bounds.max && Number.isFinite(obj.bounds.min.lat)) {
            return obj.bounds;
        }
        if (Array.isArray(obj)) {
            for (let i = 0; i < obj.length; i++) {
                const found = extractBounds(obj[i], depth + 1);
                if (found) return found;
            }
        } else {
            for (const key of Object.keys(obj)) {
                const found = extractBounds(obj[key], depth + 1);
                if (found) return found;
            }
        }
        return null;
    }

    function inspectText(text) {
        if (!text || typeof text !== 'string') return;
        try {
            const matches = text.matchAll(/-?\d+\.\d+,\s*-?\d+\.\d+/g);
            for (const match of matches) {
                const [lat, lng] = match[0].split(",").map(Number);
                if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && (lat !== 0 || lng !== 0)) {
                    rememberLocation({ lat, lng });
                    return;
                }
            }
            if (text.startsWith('{') || text.startsWith('[')) {
                const json = JSON.parse(text);
                const bounds = extractBounds(json);
                if (bounds && bounds.min && bounds.max) {
                    const diagonal = distanceKm(bounds.min.lat, bounds.min.lng, bounds.max.lat, bounds.max.lng);
                    state.mapScale = diagonal > 15000 ? 1492.7 : Math.max(5, diagonal / 10);
                }
                findCoordsInObj(json);
            }
        } catch (e) { }
    }

    function findCoordsInObj(obj, depth = 0) {
        if (depth > 25 || !obj || typeof obj !== 'object') return;
        if (typeof obj.lat === 'number' && typeof obj.lng === 'number') {
            if (Math.abs(obj.lat) <= 90 && Math.abs(obj.lng) <= 180 && (obj.lat !== 0 || obj.lng !== 0)) {
                rememberLocation({ lat: obj.lat, lng: obj.lng });
                return;
            }
        }
        if (Array.isArray(obj)) {
            for (let item of obj) findCoordsInObj(item, depth + 1);
        } else {
            for (let key in obj) {
                if (key.includes('lat') || key.includes('lng') || key.includes('location') || key.includes('round') || key.includes('pano')) {
                    findCoordsInObj(obj[key], depth + 1);
                }
            }
        }
    }

    const origFetch = window.fetch;
    window.fetch = async function (...args) {
        const res = await origFetch.apply(this, args);
        try {
            const clone = res.clone();
            clone.text().then(text => inspectText(text));
        } catch (e) { }
        return res;
    };

    const origXHR = window.XMLHttpRequest.prototype.open;
    window.XMLHttpRequest.prototype.open = function (...args) {
        this.addEventListener('load', function () {
            try { inspectText(this.responseText); } catch (e) { }
        });
        return origXHR.apply(this, args);
    };

    window.addEventListener("pnj_loc_upd", (e) => {
        if (e && e.detail) rememberLocation(e.detail);
    });

    // ----------------------------------------------------
    // Exact Placement Logic & Offset Math
    // ----------------------------------------------------
    function nearbyCoord(coord, scoreRange = {}) {
        const minScore = Math.max(0, Math.min(5000, Number(scoreRange.min ?? state.minScore)));
        const maxScore = Math.max(0, Math.min(5000, Number(scoreRange.max ?? state.maxScore)));
        const low = Math.min(minScore, maxScore);
        const high = Math.max(minScore, maxScore);
        const targetScore = low + Math.random() * (high - low);
        const earthRadiusKm = 6371;
        const scoreScaleKm = state.mapScale || 1492.7;
        const distanceKm = targetScore >= 4999 ? 0 : -scoreScaleKm * Math.log(targetScore / 5000);
        const bearing = Math.random() * Math.PI * 2;
        const startLat = (coord.lat * Math.PI) / 180;
        const startLng = (coord.lng * Math.PI) / 180;
        const angularDistance = distanceKm / earthRadiusKm;
        const endLat = Math.asin(
            (Math.sin(startLat) * Math.cos(angularDistance)) +
            (Math.cos(startLat) * Math.sin(angularDistance) * Math.cos(bearing))
        );
        const endLng = startLng + Math.atan2(
            Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(startLat),
            Math.cos(angularDistance) - (Math.sin(startLat) * Math.sin(endLat))
        );

        return {
            lat: Math.max(-90, Math.min(90, (endLat * 180) / Math.PI)),
            lng: (((((endLng * 180) / Math.PI) + 180) % 360) + 360) % 360 - 180
        };
    }

    function reactFiberKey(element) {
        return Object.keys(element).find((key) => key.startsWith("__reactFiber$"));
    }

    function latLngEvent(coord) {
        return {
            latLng: {
                lat: () => coord.lat,
                lng: () => coord.lng,
            },
        };
    }

    function findReactMapClick(fiber) {
        let current = fiber;
        let depth = 0;
        while (current && depth < 20) {
            const click = current?.memoizedProps?.map?.__e3_?.click;
            if (click) return click;
            current = current.return;
            depth++;
        }
        return null;
    }

    function callReactMapHandlers(mapClick, coord) {
        if (!mapClick || typeof mapClick !== "object") return false;
        let called = false;
        const event = latLngEvent(coord);

        Object.keys(mapClick).forEach((key) => {
            const props = mapClick[key];
            if (!props || typeof props !== "object") return;
            Object.keys(props).forEach((propKey) => {
                const handler = props[propKey];
                if (typeof handler === "function") {
                    handler(event);
                    called = true;
                }
            });
        });

        return called;
    }

    function placeViaReactMap(coord) {
        const element = document.querySelector('[class^="guess-map_canvas__"]');
        if (element) {
            const key = reactFiberKey(element);
            if (key && element[key]) {
                const fiber = element[key];
                const mapClick = findReactMapClick(fiber);
                if (callReactMapHandlers(mapClick, coord)) return true;
            }
        }
        return false;
    }

    function placeGuessOnMap(mode = "exact") {
        const coord = getCurrentCoord();
        if (!coord) {
            alert("No location detected yet! Start the game first.");
            return;
        }

        // 1. Prioritize Extension Handler if Extension is installed & active
        if (typeof window.__pnjCmdPlace === "function") {
            const rangeOpts = mode === "exact" ? { scoreRange: { min: 5000, max: 5000 } } : { scoreRange: { min: state.minScore, max: state.maxScore } };
            window.__pnjCmdPlace(coord, mode === "exact" ? "exact" : "nearby", rangeOpts);
            console.log(`[GeoGuessr Assistant] Placed guess via __pnjCmdPlace (${mode})`);
            return;
        }

        // 2. Standalone Engine Execution
        const target = mode === "exact" ? coord : nearbyCoord(coord, { min: state.minScore, max: state.maxScore });

        if (placeViaReactMap(target)) {
            console.log(`[GeoGuessr Assistant] Placed pin via ReactFiber (${mode}) at:`, target);
            return;
        }

        const guessMapContainer = document.querySelector('[class*="guess-map"]') || document.querySelector('.guess-map');
        if (guessMapContainer) {
            const mapCanvas = guessMapContainer.querySelector("canvas") || guessMapContainer;
            const rect = mapCanvas.getBoundingClientRect();
            const opts = { bubbles: true, cancelable: true, clientX: rect.left + rect.width * 0.5, clientY: rect.top + rect.height * 0.5, button: 0 };
            ["pointerdown", "mousedown", "pointerup", "mouseup", "click"].forEach(type => {
                mapCanvas.dispatchEvent(new MouseEvent(type, opts));
            });
        }

        console.log(`[GeoGuessr Assistant] Placed pin (${mode}) at:`, target);
    }

    // ----------------------------------------------------
    // Build PNJ UI Matching Extension Popup HTML/CSS 100%
    // ----------------------------------------------------
    function createUI() {
        if (document.getElementById("pnj-standalone-panel")) return;

        const container = document.createElement("div");
        container.id = "pnj-standalone-panel";
        container.innerHTML = `
            <style>
                :root {
                    --gg-font: "GeoGuessr", "Neo Sans Std", "Nunito Sans", system-ui, sans-serif;
                    --dark: #2c0d67;
                    --card: #5225a8;
                    --card-deep: #35106f;
                    --outline: #7551c8;
                    --button-top: #b999ff;
                    --button-bottom: #6d3ad6;
                    --muted: #c7b5ff;
                }
                #pnj-standalone-panel {
                    position: fixed;
                    bottom: 20px;
                    left: 20px;
                    z-index: 999999;
                    width: 320px;
                    border: 3px solid #7551c8;
                    border-radius: 22px;
                    background: var(--card);
                    box-shadow: inset 0 0 0 2px var(--outline), 0 12px 26px rgba(34, 9, 85, .45);
                    color: white;
                    font-family: var(--gg-font);
                    font-weight: 800;
                    overflow: hidden;
                }
                #pnj-header {
                    background: linear-gradient(180deg, #5b28b4 0%, #35106f 100%);
                    padding: 12px 16px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    font-size: 18px;
                    font-style: italic;
                    font-weight: 950;
                    cursor: move;
                    border-bottom: 2px solid rgba(255,255,255,0.15);
                    text-shadow: 0 3px 0 rgba(25, 8, 85, .65);
                }
                #pnj-body {
                    padding: 16px;
                    background: linear-gradient(180deg, #5b28b4 0%, #35106f 100%);
                }
                .pnj-btn {
                    width: 100%;
                    min-height: 48px;
                    margin-bottom: 12px;
                    border: 0;
                    border-radius: 999px;
                    background: linear-gradient(180deg, var(--button-top) 0%, var(--button-bottom) 100%);
                    box-shadow: inset 0 2px 0 rgba(255, 255, 255, .35), 0 5px 0 #321071, 0 12px 18px rgba(17, 5, 47, .38);
                    color: #fff;
                    cursor: pointer;
                    font: 950 14px/1 var(--gg-font);
                    text-transform: uppercase;
                    text-shadow: 0 2px 0 rgba(30, 8, 92, .55);
                }
                .pnj-btn:hover { filter: brightness(1.08); }
                .pnj-btn:active { transform: translateY(2px); box-shadow: inset 0 2px 0 rgba(255, 255, 255, .35), 0 2px 0 #321071; }
                .pnj-btn-autobot {
                    background: linear-gradient(180deg, #d61a00, #8f1100);
                    margin-bottom: 14px;
                }
                .pnj-btn-autobot.on {
                    background: linear-gradient(180deg, #22c55e, #15803d);
                }
                .pnj-card {
                    margin-bottom: 14px;
                    padding: 14px 16px;
                    border: 2px solid rgba(255, 255, 255, .18);
                    border-radius: 16px;
                    background: rgba(24, 6, 68, .42);
                    box-shadow: inset 0 2px 0 rgba(255, 255, 255, .08);
                }
                .pnj-range-title {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    font-size: 12px;
                    margin-bottom: 10px;
                    text-transform: uppercase;
                    text-shadow: 0 2px 0 rgba(30, 8, 92, .55);
                }
                .pnj-range-input {
                    width: 60px !important;
                    height: 26px !important;
                    background: rgba(0, 0, 0, 0.5) !important;
                    border: 1px solid rgba(255, 255, 255, 0.4) !important;
                    color: #ffffff !important;
                    border-radius: 6px !important;
                    text-align: center !important;
                    font-family: inherit !important;
                    font-weight: 900 !important;
                    font-size: 13px !important;
                    padding: 0 2px !important;
                    outline: none !important;
                    -moz-appearance: textfield !important;
                    box-sizing: border-box !important;
                }
                .pnj-range-input::-webkit-outer-spin-button,
                .pnj-range-input::-webkit-inner-spin-button {
                    -webkit-appearance: none;
                    margin: 0;
                }
                .pnj-range-slider {
                    --range-left: 90%;
                    --range-right: 100%;
                    position: relative;
                    height: 34px;
                    margin: 8px 0 14px;
                    cursor: pointer;
                }
                .pnj-range-slider::before,
                .pnj-range-slider::after {
                    content: "";
                    position: absolute;
                    top: 13px;
                    height: 8px;
                    border-radius: 999px;
                }
                .pnj-range-slider::before {
                    left: 0;
                    right: 0;
                    background: rgba(255, 255, 255, .28);
                }
                .pnj-range-slider::after {
                    left: var(--range-left);
                    right: calc(100% - var(--range-right));
                    background: #ff416d;
                }
                .pnj-range-slider input[type="range"] {
                    position: absolute;
                    top: 0;
                    left: -10px;
                    width: calc(100% + 20px);
                    height: 34px;
                    margin: 0;
                    appearance: none;
                    background: transparent;
                    border: none;
                    outline: none;
                    box-shadow: none;
                    pointer-events: none;
                }
                .pnj-range-slider input[type="range"]::-webkit-slider-runnable-track {
                    height: 8px;
                    background: transparent;
                }
                .pnj-range-slider input[type="range"]::-webkit-slider-thumb {
                    width: 20px;
                    height: 20px;
                    margin-top: -6px;
                    border: 0;
                    border-radius: 50%;
                    appearance: none;
                    background: #ff416d;
                    box-shadow: 0 2px 0 rgba(58, 11, 111, .65);
                    pointer-events: auto;
                }
                @keyframes mapcnPing {
                    75%, 100% {
                        transform: scale(2.2);
                        opacity: 0;
                    }
                }
                .maplibregl-ctrl-container,
                .maplibregl-ctrl,
                .maplibregl-ctrl-attrib,
                .maplibregl-compact {
                    display: none !important;
                }
                .pnj-map-card {
                    height: 150px;
                    overflow: hidden;
                    margin-bottom: 12px;
                    border: 2px solid rgba(255, 255, 255, .18);
                    border-radius: 16px;
                    background: rgba(24, 6, 68, .42);
                    box-shadow: inset 0 2px 0 rgba(255, 255, 255, .08);
                    position: relative;
                    z-index: 1;
                }
                #pnj-map-container {
                    width: 100%;
                    height: 100%;
                    border-radius: 14px;
                }
                .pnj-copyright {
                    padding: 8px 0 4px;
                    color: var(--muted);
                    font-size: 12px;
                    text-align: center;
                    text-shadow: 0 2px 0 rgba(30, 8, 92, .55);
                }
            </style>
            <div id="pnj-header">
                <span>PNJ GeoGuessr Tools</span>
                <span id="pnj-toggle-btn" style="cursor:pointer;">▼</span>
            </div>
            <div id="pnj-body">
                <button id="pnj-btn-autobot" class="pnj-btn pnj-btn-autobot ${state.autoBot ? 'on' : ''}">
                    AUTO BOT: ${state.autoBot ? 'ON' : 'OFF'}
                </button>
                <button id="pnj-btn-exact" class="pnj-btn">PLACE EXACT</button>

                <div class="pnj-card">
                    <div class="pnj-range-title">
                        <span>Score Range</span>
                        <div style="display: flex; gap: 4px; align-items: center;">
                            <input id="pnj-min-val" type="number" min="0" max="5000" class="pnj-range-input" value="4500">
                            <span>-</span>
                            <input id="pnj-max-val" type="number" min="0" max="5000" class="pnj-range-input" value="5000">
                        </div>
                    </div>
                    <div id="pnj-slider-box" class="pnj-range-slider">
                        <input id="pnj-slider-min" type="range" min="0" max="5000" step="50" value="4500">
                        <input id="pnj-slider-max" type="range" min="0" max="5000" step="50" value="5000">
                    </div>
                    <button id="pnj-btn-range" class="pnj-btn" style="margin-bottom: 0;">PLACE RANGE</button>
                </div>

                <div id="pnj-map-panel" class="pnj-map-card" hidden>
                    <div id="pnj-map-container"></div>
                </div>

                <footer class="pnj-copyright">©<span id="pnj-copyright-year">${new Date().getFullYear()}</span></footer>
            </div>
        `;

        document.body.appendChild(container);

        // Draggable
        const header = document.getElementById("pnj-header");
        let isDragging = false, offset = [0, 0];
        header.addEventListener("mousedown", (e) => {
            isDragging = true;
            offset = [container.offsetLeft - e.clientX, container.offsetTop - e.clientY];
        });
        document.addEventListener("mousemove", (e) => {
            if (isDragging) {
                container.style.left = (e.clientX + offset[0]) + "px";
                container.style.top = (e.clientY + offset[1]) + "px";
                container.style.bottom = "auto";
            }
        });
        document.addEventListener("mouseup", () => isDragging = false);

        // Toggle UI
        document.getElementById("pnj-toggle-btn").addEventListener("click", () => {
            const body = document.getElementById("pnj-body");
            state.uiCollapsed = !state.uiCollapsed;
            body.style.display = state.uiCollapsed ? "none" : "block";
            document.getElementById("pnj-toggle-btn").textContent = state.uiCollapsed ? "▲" : "▼";
        });

        // Inputs & Dual Slider Binding (100% Exact to Extension popup.js)
        const minInp = document.getElementById("pnj-min-val");
        const maxInp = document.getElementById("pnj-max-val");
        const sliderMin = document.getElementById("pnj-slider-min");
        const sliderMax = document.getElementById("pnj-slider-max");
        const sliderBox = document.getElementById("pnj-slider-box");

        function updateNearbyValue(source = null) {
            let minVal = Number(minInp?.value ?? (sliderMin?.value || 4500));
            let maxVal = Number(maxInp?.value ?? (sliderMax?.value || 5000));

            if (isNaN(minVal)) minVal = 4500;
            if (isNaN(maxVal)) maxVal = 5000;

            state.minScore = Math.max(0, Math.min(5000, minVal));
            state.maxScore = Math.max(0, Math.min(5000, maxVal));

            const displayMin = Math.min(state.minScore, state.maxScore);
            const displayMax = Math.max(state.minScore, state.maxScore);

            if (sliderBox) {
                sliderBox.style.setProperty("--range-left", `${displayMin / 50}%`);
                sliderBox.style.setProperty("--range-right", `${displayMax / 50}%`);
            }

            if (source === "slider") {
                if (minInp) minInp.value = state.minScore;
                if (maxInp) maxInp.value = state.maxScore;
            }
        }

        function scoreFromPointer(event) {
            if (!sliderBox) return 4500;
            const bounds = sliderBox.getBoundingClientRect();
            const percent = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width));
            return Math.round((percent * 5000) / 50) * 50;
        }

        function moveRangeHandle(handle, score) {
            if (handle === sliderMin) {
                sliderMin.value = Math.min(score, Number(sliderMax.value));
                if (minInp) minInp.value = sliderMin.value;
            } else {
                sliderMax.value = Math.max(score, Number(sliderMin.value));
                if (maxInp) maxInp.value = sliderMax.value;
            }
            updateNearbyValue("slider");
        }

        function nearestRangeHandle(score) {
            return Math.abs(score - Number(sliderMin.value)) <= Math.abs(score - Number(sliderMax.value))
                ? sliderMin
                : sliderMax;
        }

        let draggedRangeHandle = null;

        if (sliderBox && sliderMin && sliderMax) {
            sliderBox.addEventListener("pointerdown", (event) => {
                const score = scoreFromPointer(event);
                draggedRangeHandle = nearestRangeHandle(score);
                if (draggedRangeHandle === sliderMin) {
                    sliderMin.style.zIndex = "10";
                    sliderMax.style.zIndex = "5";
                } else {
                    sliderMax.style.zIndex = "10";
                    sliderMin.style.zIndex = "5";
                }
                moveRangeHandle(draggedRangeHandle, score);
                sliderBox.setPointerCapture(event.pointerId);
            });

            sliderBox.addEventListener("pointermove", (event) => {
                if (!draggedRangeHandle) return;
                moveRangeHandle(draggedRangeHandle, scoreFromPointer(event));
            });

            const stopDrag = (event) => {
                if (draggedRangeHandle && sliderBox.hasPointerCapture(event.pointerId)) {
                    sliderBox.releasePointerCapture(event.pointerId);
                }
                draggedRangeHandle = null;
            };

            sliderBox.addEventListener("pointerup", stopDrag);
            sliderBox.addEventListener("pointercancel", stopDrag);
        }

        if (minInp && maxInp) {
            const stopPropagationHandler = (e) => {
                e.stopPropagation();
            };

            [minInp, maxInp].forEach(inp => {
                inp.addEventListener("keydown", stopPropagationHandler);
                inp.addEventListener("keyup", stopPropagationHandler);
                inp.addEventListener("keypress", stopPropagationHandler);
            });

            minInp.addEventListener("input", () => {
                let val = Math.max(0, Math.min(5000, Number(minInp.value)));
                if (sliderMin) sliderMin.value = val;
                updateNearbyValue("input");
            });

            maxInp.addEventListener("input", () => {
                let val = Math.max(0, Math.min(5000, Number(maxInp.value)));
                if (sliderMax) sliderMax.value = val;
                updateNearbyValue("input");
            });
        }

        updateNearbyValue();

        document.getElementById("pnj-btn-exact").addEventListener("click", () => placeGuessOnMap("exact"));
        document.getElementById("pnj-btn-range").addEventListener("click", () => placeGuessOnMap("nearby"));

        const botBtn = document.getElementById("pnj-btn-autobot");
        botBtn.addEventListener("click", () => {
            state.autoBot = !state.autoBot;
            botBtn.textContent = `AUTO BOT: ${state.autoBot ? 'ON' : 'OFF'}`;
            botBtn.classList.toggle("on", state.autoBot);
        });

        // Initialize Map Frame if current location is available
        const currentCoord = getCurrentCoord();
        if (currentCoord) updateMapFrame(currentCoord);
    }

    // Auto-Bot Loop
    function findBtnPartial(keywords) {
        const btns = document.querySelectorAll('button, a, [role="button"]');
        for (let btn of btns) {
            const text = (btn.textContent || "").toUpperCase();
            if (keywords.some(kw => text.includes(kw))) return btn;
        }
        return null;
    }

    setInterval(() => {
        const c = getCurrentCoord();
        if (c && !state.current) {
            rememberLocation(c);
        }

        if (!state.autoBot) return;

        const nextBtn = document.querySelector('[data-qa="close-round-result"]') ||
            document.querySelector('[data-qa="play-next-round"]') ||
            findBtnPartial(['NEXT', 'AGAIN', 'SUMMARY']);

        if (nextBtn) {
            nextBtn.click();
            return;
        }

        if (c) {
            placeGuessOnMap("nearby");
            setTimeout(() => {
                const guessBtn = document.querySelector('[data-qa="perform-guess"]') ||
                    document.querySelector('.guess-map__guess-button');
                if (guessBtn && !guessBtn.disabled) {
                    guessBtn.click();
                }
            }, 800);
        }
    }, 2000);

    if (document.readyState === "complete" || document.readyState === "interactive") {
        createUI();
    } else {
        window.addEventListener("DOMContentLoaded", createUI);
    }

})();
