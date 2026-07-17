// ==UserScript==
// @name         GeoGuessr Auto Bot (For PNJ Extension)
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Automatically clicks PLACE RANGE from the PNJ extension and guesses.
// @author       Peenjeee
// @match        https://www.geoguessr.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=geoguessr.com
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    console.log("PNJ Auto Bot Started!");

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
        // 1. Check for Next Round, View Summary, or Play Again buttons
        const nextBtn = document.querySelector('[data-qa="close-round-result"]') ||
            document.querySelector('[data-qa="play-next-round"]') ||
            findBtnPartial(['NEXT', 'AGAIN', 'SUMMARY']);

        if (nextBtn) {
            console.log("Proceeding to next round / Restarting...");
            nextBtn.click();
            return;
        }

        // 2. Click the "PLACE RANGE" button from your PNJ Extension
        const placeRangeBtn = document.querySelector('#btn-range') || findBtnExact('PLACE RANGE');

        if (placeRangeBtn) {
            console.log("Placing guess...");
            placeRangeBtn.click();

            // 3. Wait 0.8 seconds to allow the pin to be placed, then click GUESS
            setTimeout(() => {
                const guessBtn = document.querySelector('[data-qa="perform-guess"]') ||
                    document.querySelector('.guess-map__guess-button') ||
                    findBtnExact('GUESS');
                if (guessBtn) {
                    console.log("Submitting guess!");
                    guessBtn.click();
                }
            }, 800); // 800ms delay
        }
    }, 2000);

})();
