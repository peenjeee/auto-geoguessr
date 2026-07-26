// ==UserScript==
// @name         PNJ GeoGuessr Tools
// @namespace    http://tampermonkey.net/
// @version      6.0
// @description  Full-featured GeoGuessr helper.
// @author       Peenjeee
// @match        https://www.geoguessr.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=geoguessr.com
// @run-at       document-start
// @grant        GM_xmlhttpRequest
// @grant        GM_registerMenuCommand
// @grant        GM_addStyle
// @grant        GM_getResourceText
// @require      https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.js
// @resource     maplibreCss https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.css
// @connect      localhost
// @connect      127.0.0.1
// @connect      gr.0xpnj.dev
// ==/UserScript==

(function () {
    'use strict';

    console.log("PNJ GeoGuessr Userscript v6.0 Loaded!");

    try {
        localStorage.removeItem("pnj_rnd_loc");
        localStorage.removeItem("pnj_auto_bot");
    } catch (e) { }

    const state = (window.__pnjState = window.__pnjState || {
        locations: [],
        current: null,
        currentQuality: 0,
        currentAt: 0,
        autoBot: false,
        mapScale: null,
        minScore: 4500,
        maxScore: 5000
    });

    if (!state.minScore || state.minScore < 0) state.minScore = 4500;
    if (!state.maxScore || state.maxScore <= 0) state.maxScore = 5000;

    let lastMapKey = "";
    const TELEMETRY_URLS = ["http://localhost:3000/api/telemetry", "https://gr.0xpnj.dev/api/telemetry"];
    const DASHBOARD_URL = "https://gr.0xpnj.dev/";
    const USER_ID_KEY = "pnj_user_id";
    const userId = getUserId();

    function togglePanelVisibility() {
        const panel = document.getElementById("pnj-standalone-panel");
        if (!panel) {
            createUI();
            return;
        }
        panel.hidden = !panel.hidden;
    }

    if (typeof GM_registerMenuCommand === "function") {
        GM_registerMenuCommand("Hide / Show PNJ Panel (Insert)", togglePanelVisibility);
        GM_registerMenuCommand("Copy ID (Ctrl+Shift+C)", () => {
            const coord = getCurrentCoord();
            if (coord) broadcastToWeb(coord);
            copyUserId();
        });
    }

    window.addEventListener("keydown", (event) => {
        if (event.repeat) return;
        const target = event.target;
        if (target && /input|textarea|select/i.test(target.tagName)) return;

        if (event.key === "Insert") {
            togglePanelVisibility();
            return;
        }

        if (event.key === "C" && event.ctrlKey && event.shiftKey) {
            event.preventDefault();
            const coord = getCurrentCoord();
            if (coord) broadcastToWeb(coord);
            copyUserId().then(() => {
                const toast = document.createElement("div");
                toast.textContent = "✓ ID Copied!";
                toast.style.cssText = "position:fixed;top:20px;left:50%;transform:translateX(-50%);background:#22c55e;color:#fff;padding:10px 20px;border-radius:8px;font:bold 14px sans-serif;z-index:9999999;box-shadow:0 4px 12px rgba(0,0,0,0.3);";
                document.body.appendChild(toast);
                setTimeout(() => toast.remove(), 1500);
            });
        }
    });

    function generateUserId() {
        return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) =>
            (+c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> +c / 4).toString(16)
        ).toUpperCase();
    }

    function getUserId() {
        let id = localStorage.getItem(USER_ID_KEY);
        if (id) return id.trim().toUpperCase();
        id = generateUserId();
        localStorage.setItem(USER_ID_KEY, id);
        window.open(`${DASHBOARD_URL}?id=${id}`, "_blank");
        return id;
    }

    function copyUserId() {
        if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(userId);
        const input = document.createElement("input");
        input.value = userId;
        document.body.appendChild(input);
        input.select();
        document.execCommand("copy");
        input.remove();
        return Promise.resolve();
    }

    let cleanFetch;
    function sendFetch(url, options) {
        if (!cleanFetch) {
            const frame = document.createElement("iframe");
            frame.style.display = "none";
            frame.src = "about:blank";
            (document.body || document.documentElement).appendChild(frame);
            cleanFetch = frame.contentWindow.fetch.bind(frame.contentWindow);
        }
        return cleanFetch(url, options);
    }

    function broadcastToWeb(coord, targetScore = 5000, distanceKm = 0) {
        const payload = JSON.stringify({
            type: "round_update",
            userId,
            lat: coord.lat,
            lng: coord.lng,
            targetScore: targetScore,
            distanceKm: distanceKm
        });

        TELEMETRY_URLS.forEach((url) => {
            if (typeof GM_xmlhttpRequest === "function") {
                try {
                    GM_xmlhttpRequest({
                        method: "POST",
                        url,
                        headers: { "Content-Type": "application/json" },
                        data: payload
                    });
                } catch (e) { }
            } else {
                try {
                    sendFetch(url, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: payload
                    }).catch(() => { });
                } catch (e) { }
            }
        });

        try {
            const channel = new BroadcastChannel("pnj_geoguessr_channel");
            channel.postMessage(JSON.parse(payload));
            channel.close();
        } catch (e) { }
    }

    function isJunkCoord(lat, lng) {
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return true;
        if (Math.abs(lat) > 85 || Math.abs(lng) > 180) return true;
        if (Math.abs(lat) < 0.5 && Math.abs(lng) < 0.5) return true;
        if (Math.abs(lat - 74.01954) < 0.001 && Math.abs(lng - 22.5) < 0.001) return true;
        return false;
    }

    function rememberLocation(coord, quality = 1) {
        if (!coord || typeof coord.lat !== "number" || typeof coord.lng !== "number") return;
        if (isJunkCoord(coord.lat, coord.lng)) return;

        const now = Date.now();
        if (quality < (state.currentQuality || 0) && now - (state.currentAt || 0) < 45000) return;

        state.current = coord;
        state.currentQuality = quality;
        state.currentAt = now;
        if (window.__pnjState) window.__pnjState.current = coord;
        state.locations.push(coord);
        if (state.locations.length > 20) state.locations.shift();

        updateMapFrame(coord);
        broadcastToWeb(coord);
    }

    // mapcn (mapcn.dev) is React-only, but it is a thin layer over MapLibre GL + free CARTO
    // basemaps with light/dark switching — that is what we reproduce here in plain JS.
    const MAPCN_STYLES = {
        light: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
        dark: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
    };

    let maplibreMap = null;
    let maplibreMarker = null;
    let maplibreCssReady = false;

    // @require loads MapLibre into the userscript scope; fall back to the page global for
    // managers that skip @require or when the script is pasted into a console.
    function getMapLibre() {
        if (typeof maplibregl !== "undefined" && maplibregl) return maplibregl;
        try {
            if (typeof unsafeWindow !== "undefined" && unsafeWindow.maplibregl) return unsafeWindow.maplibregl;
        } catch (e) { }
        return window.maplibregl || null;
    }

    function ensureMapLibreCss() {
        if (maplibreCssReady) return;
        maplibreCssReady = true;

        try {
            if (typeof GM_getResourceText === "function" && typeof GM_addStyle === "function") {
                const css = GM_getResourceText("maplibreCss");
                if (css) {
                    GM_addStyle(css);
                    return;
                }
            }
        } catch (e) { }

        if (!document.getElementById("pnj-maplibre-css")) {
            const link = document.createElement("link");
            link.id = "pnj-maplibre-css";
            link.rel = "stylesheet";
            link.href = "https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.css";
            (document.head || document.documentElement).appendChild(link);
        }
    }

    function mapcnStyleUrl() {
        const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
        return prefersDark ? MAPCN_STYLES.dark : MAPCN_STYLES.light;
    }

    function createMapcnMarker() {
        const el = document.createElement("div");
        el.className = "pnj-mapcn-marker";
        el.innerHTML = `
                    <div class="pnj-mapcn-ping"></div>
                    <div class="pnj-mapcn-dot"></div>
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

        const gl = getMapLibre();
        if (!gl) {
            console.warn("[PNJ] MapLibre unavailable — reinstall the userscript so @require can load it.");
            return;
        }

        ensureMapLibreCss();

        const mapKey = `${coord.lat},${coord.lng}`;

        if (!maplibreMap) {
            try {
                maplibreMap = new gl.Map({
                    container: mapContainer,
                    style: mapcnStyleUrl(),
                    center: [coord.lng, coord.lat],
                    zoom: 7,
                    attributionControl: false,
                });
            } catch (e) {
                console.warn("[PNJ] MapLibre failed to start:", e);
                maplibreMap = null;
                return;
            }

            maplibreMarker = new gl.Marker({ element: createMapcnMarker(), anchor: "center" })
                .setLngLat([coord.lng, coord.lat])
                .addTo(maplibreMap);

            // The card is 150px tall and was hidden until now, so MapLibre may have measured
            // a zero-size container; resize once the style is in and again after layout.
            maplibreMap.on("load", () => maplibreMap.resize());
            setTimeout(() => maplibreMap && maplibreMap.resize(), 300);

            lastMapKey = mapKey;
            return;
        }

        if (mapKey !== lastMapKey) {
            lastMapKey = mapKey;
            maplibreMap.setCenter([coord.lng, coord.lat]);
            maplibreMap.setZoom(7);
            if (maplibreMarker) maplibreMarker.setLngLat([coord.lng, coord.lat]);
            maplibreMap.resize();
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

    function wrapStreetViewClass(OrigSV) {
        function PatchedSV(...args) {
            const instance = new OrigSV(...args);
            instance.addListener("position_changed", () => {
                const pos = instance.getPosition();
                if (pos && typeof pos.lat === "function") {
                    rememberLocation({ lat: pos.lat(), lng: pos.lng() }, 3);
                }
            });
            return instance;
        }
        Object.setPrototypeOf(PatchedSV, OrigSV);
        PatchedSV.prototype = OrigSV.prototype;
        PatchedSV.__pnjPatched = true;
        return PatchedSV;
    }

    function patchSvClass(namespace) {
        const applySv = (value) =>
            (typeof value === "function" && !value.__pnjPatched) ? wrapStreetViewClass(value) : value;

        try {
            let current = applySv(namespace.StreetViewPanorama);
            Object.defineProperty(namespace, "StreetViewPanorama", {
                configurable: true,
                enumerable: true,
                get() { return current; },
                set(value) { current = applySv(value); },
            });
        } catch (e) {
            try {
                if (typeof namespace.StreetViewPanorama === "function" && !namespace.StreetViewPanorama.__pnjPatched) {
                    namespace.StreetViewPanorama = wrapStreetViewClass(namespace.StreetViewPanorama);
                }
            } catch (err) { }
        }
    }

    function hookNamespace(target, prop, onValue) {
        let current = target[prop];
        try {
            Object.defineProperty(target, prop, {
                configurable: true,
                enumerable: true,
                get() { return current; },
                set(value) { current = value; if (value) onValue(value); },
            });
        } catch (e) { }
        if (current) onValue(current);
    }

    hookNamespace(window, "google", (google) => {
        if (google && typeof google === "object") {
            hookNamespace(google, "maps", (maps) => {
                if (maps && typeof maps === "object") patchSvClass(maps);
            });
        }
    });

    function patchStreetView() {
        if (window.google && window.google.maps &&
            window.google.maps.StreetViewPanorama && !window.google.maps.StreetViewPanorama.__pnjPatched) {
            patchSvClass(window.google.maps);
        }
    }
    setInterval(patchStreetView, 1000);

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
        if (obj.min && obj.max && Number.isFinite(obj.min.lat) && Number.isFinite(obj.max.lat)) return obj;
        if (obj.bounds && obj.bounds.min && obj.bounds.max && Number.isFinite(obj.bounds.min.lat)) return obj.bounds;
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

    function extractFromGoogleMaps(text) {
        if (!text || typeof text !== 'string') return false;
        try {
            let match;

            const anchored = /null,null,(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)/g;
            while ((match = anchored.exec(text)) !== null) {
                const lat = Number(match[1]);
                const lng = Number(match[2]);
                if (!isJunkCoord(lat, lng)) {
                    rememberLocation({ lat, lng }, 2);
                    return true;
                }
            }

            const pattern = /-?\d{1,2}\.\d{3,},-?\d{1,3}\.\d{3,}/g;
            while ((match = pattern.exec(text)) !== null) {
                const [lat, lng] = match[0].split(",").map(Number);
                if (!isJunkCoord(lat, lng)) {
                    rememberLocation({ lat, lng }, 1);
                    return true;
                }
            }
        } catch (e) { }
        return false;
    }

    function extractFromJsonResponse(text, url = "") {
        if (!text || typeof text !== 'string') return false;
        if (/bounds|viewport|mapbounds|tile|vt\/|staticmap|guess/.test(url.toLowerCase())) return false;
        try {
            if (text.startsWith('{') || text.startsWith('[')) {
                const json = JSON.parse(text);
                const bounds = extractBounds(json);
                if (bounds && bounds.min && bounds.max) {
                    const diagonal = distanceKm(bounds.min.lat, bounds.min.lng, bounds.max.lat, bounds.max.lng);
                    state.mapScale = diagonal > 15000 ? 1492.7 : Math.max(5, diagonal / 10);
                }
                return findCoordsInJson(json);
            }
        } catch (e) { }
        return false;
    }

    function findCoordsInJson(obj, depth = 0) {
        if (depth > 25 || !obj || typeof obj !== 'object') return false;
        if (typeof obj.lat === 'number' && typeof obj.lng === 'number') {
            if (!isJunkCoord(obj.lat, obj.lng)) {
                rememberLocation({ lat: obj.lat, lng: obj.lng }, 1);
                return true;
            }
        }
        if (Array.isArray(obj)) {
            for (let item of obj) { if (findCoordsInJson(item, depth + 1)) return true; }
        } else {
            for (let key in obj) {
                if (key.includes('lat') || key.includes('lng') || key.includes('location') || key.includes('round') || key.includes('pano')) {
                    if (findCoordsInJson(obj[key], depth + 1)) return true;
                }
            }
        }
        return false;
    }

    const origXHR = window.XMLHttpRequest.prototype.open;
    window.XMLHttpRequest.prototype.open = function (...args) {
        const method = String(args[0] || "").toUpperCase();
        const url = String(args[1] || "");

        const isMapsRpc = method === 'POST' &&
            url.startsWith('https://maps.googleapis.com/$rpc/google.internal.maps.mapsjs.v1.MapsJsInternalService/');
        const isPanoLookup = url.includes("maps.googleapis.com") &&
            (url.includes("GetMetadata") || url.includes("SingleImageSearch"));

        if (isMapsRpc || isPanoLookup) {
            this.addEventListener('load', function () {
                try { extractFromGoogleMaps(this.responseText); } catch (e) { }
            });
        }

        if (url.includes("/api/") || url.includes("geoguessr.com")) {
            this.addEventListener('load', function () {
                try { extractFromJsonResponse(this.responseText, url); } catch (e) { }
            });
        }

        return origXHR.apply(this, args);
    };

    const origFetch = window.fetch;
    window.fetch = async function (...args) {
        const input = args[0];
        const url = typeof input === "string" ? input : (input && input.url ? input.url : "");
        const res = await origFetch.apply(this, args);
        try {
            const clone = res.clone();
            if (url.includes("maps.googleapis.com") && (url.includes("GetMetadata") || url.includes("SingleImageSearch"))) {
                clone.text().then(text => extractFromGoogleMaps(text));
            } else if (url.includes("/api/") || url.includes("geoguessr.com")) {
                clone.text().then(text => extractFromJsonResponse(text, url));
            }
        } catch (e) { }
        return res;
    };

    window.addEventListener("pnj_loc_upd", (e) => {
        if (e && e.detail) rememberLocation(e.detail);
    });

    function nearbyCoord(coord, scoreRange = {}) {
        const minScore = Math.max(0, Math.min(5000, Number(scoreRange.min ?? state.minScore)));
        const maxScore = Math.max(0, Math.min(5000, Number(scoreRange.max ?? state.maxScore)));
        const low = Math.min(minScore, maxScore);
        const high = Math.max(minScore, maxScore);
        const targetScore = low + Math.random() * (high - low);
        const earthRadiusKm = 6371;
        const scoreScaleKm = state.mapScale || 1492;
        const distanceKm = targetScore > 0 ? -scoreScaleKm * Math.log(targetScore / 5000) : scoreScaleKm * 10;
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

        if (typeof window.__pnjCmdPlace === "function") {
            const rangeOpts = mode === "exact" ? { scoreRange: { min: 5000, max: 5000 } } : { scoreRange: { min: state.minScore, max: state.maxScore } };
            window.__pnjCmdPlace(coord, mode === "exact" ? "exact" : "nearby", rangeOpts);
            console.log(`[GeoGuessr Assistant] Placed guess via __pnjCmdPlace (${mode})`);
            return;
        }

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
                            overflow: hidden;
                        }
                        .maplibregl-ctrl-container,
                        .maplibregl-ctrl,
                        .maplibregl-ctrl-attrib,
                        .maplibregl-compact {
                            display: none !important;
                        }
                        .pnj-mapcn-marker {
                            position: relative;
                            width: 18px;
                            height: 18px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                        }
                        .pnj-mapcn-ping {
                            position: absolute;
                            width: 100%;
                            height: 100%;
                            border-radius: 50%;
                            background: #ff416d;
                            opacity: .75;
                            animation: pnjMapcnPing 1.5s cubic-bezier(0, 0, .2, 1) infinite;
                        }
                        .pnj-mapcn-dot {
                            position: relative;
                            width: 14px;
                            height: 14px;
                            border-radius: 50%;
                            background: #ff416d;
                            border: 2.5px solid #fff;
                            box-shadow: 0 0 10px rgba(255, 65, 109, .9);
                        }
                        @keyframes pnjMapcnPing {
                            75%, 100% {
                                transform: scale(2.2);
                                opacity: 0;
                            }
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
                        <button id="pnj-btn-copy-id" class="pnj-btn">COPY ID</button>
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
                                <input id="pnj-slider-min" type="range" min="0" max="5000" step="1" value="4500">
                                <input id="pnj-slider-max" type="range" min="0" max="5000" step="1" value="5000">
                            </div>
                            <button id="pnj-btn-range" class="pnj-btn" style="margin-bottom: 0;">PLACE RANGE</button>
                        </div>

                        <button id="pnj-btn-refresh" class="pnj-btn">REFRESH MAP</button>

                        <div id="pnj-map-panel" class="pnj-map-card" hidden>
                            <div id="pnj-map-container"></div>
                        </div>

                        <footer class="pnj-copyright">©<span id="pnj-copyright-year">${new Date().getFullYear()}</span></footer>
                    </div>
                `;

        document.body.appendChild(container);

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
        document.addEventListener("mouseup", () => {
            isDragging = false;
        });

        document.getElementById("pnj-toggle-btn").addEventListener("click", () => {
            const body = document.getElementById("pnj-body");
            state.uiCollapsed = !state.uiCollapsed;
            body.style.display = state.uiCollapsed ? "none" : "block";
            document.getElementById("pnj-toggle-btn").textContent = state.uiCollapsed ? "▲" : "▼";
        });

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
                if (minInp.value === "") return;
                if (Number(minInp.value) > 5000) minInp.value = 5000;
                if (Number(minInp.value) < 0) minInp.value = 0;
                if (sliderMin) sliderMin.value = Number(minInp.value);
                updateNearbyValue("input");
            });

            maxInp.addEventListener("input", () => {
                if (maxInp.value === "") return;
                if (Number(maxInp.value) > 5000) maxInp.value = 5000;
                if (Number(maxInp.value) < 0) maxInp.value = 0;
                if (sliderMax) sliderMax.value = Number(maxInp.value);
                updateNearbyValue("input");
            });

            const commitRange = (edited) => {
                const readBox = (box, slider) => {
                    const raw = String(box.value || "").trim();
                    const num = raw === "" ? Number(slider.value) : Number(raw);
                    return Math.max(0, Math.min(5000, Number.isFinite(num) ? num : Number(slider.value)));
                };

                let minVal = readBox(minInp, sliderMin);
                let maxVal = readBox(maxInp, sliderMax);
                if (edited === minInp && minVal > maxVal) maxVal = minVal;
                else if (edited === maxInp && maxVal < minVal) minVal = maxVal;

                minInp.value = minVal;
                maxInp.value = maxVal;
                if (sliderMin) sliderMin.value = minVal;
                if (sliderMax) sliderMax.value = maxVal;
                updateNearbyValue("slider");
            };

            minInp.addEventListener("change", () => commitRange(minInp));
            maxInp.addEventListener("change", () => commitRange(maxInp));
        }

        updateNearbyValue();

        document.getElementById("pnj-btn-exact").addEventListener("click", () => placeGuessOnMap("exact"));
        document.getElementById("pnj-btn-range").addEventListener("click", () => placeGuessOnMap("nearby"));
        document.getElementById("pnj-btn-refresh").addEventListener("click", () => {
            const coord = getCurrentCoord();
            if (coord) updateMapFrame(coord);
        });
        document.getElementById("pnj-btn-copy-id").addEventListener("click", (event) => {
            const coord = getCurrentCoord();
            if (coord) broadcastToWeb(coord);
            copyUserId().then(() => {
                event.currentTarget.textContent = "COPIED";
                setTimeout(() => { event.currentTarget.textContent = "COPY ID"; }, 900);
            });
        });

        const botBtn = document.getElementById("pnj-btn-autobot");
        botBtn.addEventListener("click", () => {
            state.autoBot = !state.autoBot;
            botBtn.textContent = `AUTO BOT: ${state.autoBot ? 'ON' : 'OFF'}`;
            botBtn.classList.toggle("on", state.autoBot);
        });

        const currentCoord = getCurrentCoord();
        if (currentCoord) updateMapFrame(currentCoord);
    }

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
        if (c) {
            if (!state.current || Math.abs(state.current.lat - c.lat) > 0.0001 || Math.abs(state.current.lng - c.lng) > 0.0001) {
                rememberLocation(c);
            }
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
