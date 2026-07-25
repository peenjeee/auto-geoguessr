    // ==UserScript==
    // @name         GeoGuessr Auto Bot (For PNJ Extension)
    // @namespace    http://tampermonkey.net/
    // @version      1.0
    // @description  Automatically clicks PLACE RANGE from the PNJ extension and guesses.
    // @author       Peenjeee
    // @match        https://www.geoguessr.com/*
    // @icon         https://www.google.com/s2/favicons?sz=64&domain=geoguessr.com
    // @grant        GM_registerMenuCommand
    // @grant        GM_unregisterMenuCommand
    // @grant        GM_setValue
    // @grant        GM_getValue
    // ==/UserScript==

    (function () {
        'use strict';

        console.log("PNJ Auto Bot Started!");

        let isBotActive = GM_getValue("isBotActive", true);
        let menuCmdId = null;

        function updateMenu() {
            if (typeof GM_registerMenuCommand === "undefined") return;
            if (menuCmdId !== null && typeof GM_unregisterMenuCommand !== "undefined") {
                GM_unregisterMenuCommand(menuCmdId);
            }
            const title = isBotActive ? "🛑 Turn OFF Auto Bot (Instant)" : "✅ Turn ON Auto Bot (Instant)";
            menuCmdId = GM_registerMenuCommand(title, () => {
                isBotActive = !isBotActive;
                if (typeof GM_setValue !== "undefined") GM_setValue("isBotActive", isBotActive);
                updateMenu();
                console.log("Auto Bot is now: " + (isBotActive ? "ON" : "OFF"));
            });
        }
        updateMenu();

        // Exact text button finder (for PNJ extension)
        function findBtnExact(textTarget) {
            const allEls = document.querySelectorAll('button, div, span, a');
            for (let el of allEls) {
                if (el.textContent && el.textContent.trim().toUpperCase() === textTarget) {
                    if (el.children.length === 0 || el.tagName === 'BUTTON') {
                        return el;
                    }
                }
            }
            return null;
        }

        // Partial text button finder (useful for GeoGuessr Next buttons)
        function findBtnPartial(keywords) {
            const btns = document.querySelectorAll('button, a, [role="button"]');
            for (let btn of btns) {
                const text = btn.textContent.toUpperCase();
                if (keywords.some(kw => text.includes(kw))) {
                    return btn;
                }
            }
            return null;
        }

        // Run the check every 2 seconds
        setInterval(() => {
            // Stop if turned off via Tampermonkey custom menu
            if (!isBotActive) return;

            // 1. Check for Next Round, View Summary, or Play Again buttons
            const nextBtn = document.querySelector('[data-qa="close-round-result"]') ||
                document.querySelector('[data-qa="play-next-round"]') ||
                findBtnPartial(['NEXT', 'AGAIN', 'SUMMARY']);

            if (nextBtn) {
                console.log("Proceeding to next round / Restarting...");
                nextBtn.click();
                return;
            }

            // 2. Call the extension's built-in placement API directly!
            // This completely bypasses the need for the panel or buttons to be open.
            if (window.__pnjCmdPlace && window.__pnjState && window.__pnjState.current) {
                console.log("Placing guess via API...");
                window.__pnjCmdPlace(window.__pnjState.current, "nearby", { scoreRange: { min: 4500, max: 5000 } });

                // 3. Wait 0.8 seconds to allow the pin to be placed, then click GUESS
                setTimeout(() => {
                    const guessBtn = document.querySelector('[data-qa="perform-guess"]') ||
                        document.querySelector('.guess-map__guess-button') ||
                        findBtnExact('GUESS');
                    if (guessBtn && !guessBtn.disabled) {
                        console.log("Submitting guess!");
                        guessBtn.click();
                    }
                }, 800);
            }
        }, 2000);

    })();
