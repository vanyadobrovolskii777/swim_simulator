document.addEventListener("DOMContentLoaded", () => {
    const searchForm = document.getElementById("search-form");
    const searchInput = document.getElementById("search-input");
    const luckyBtn = document.getElementById("lucky-btn");
    const resultsContainer = document.getElementById("results");

    // Top Bar elements
    const callBtn = document.getElementById("call-btn");
    const favoritesBtn = document.getElementById("favorites-btn");
    const moreBtn = document.getElementById("more-btn");
    const moreDropdown = document.getElementById("more-dropdown");
    const modalOverlay = document.getElementById("modal-overlay");
    const callModal = document.getElementById("call-modal");
    const favoritesModal = document.getElementById("favorites-modal");
    const clearHistoryBtn = document.getElementById("clear-history-btn");

    // Phone Dialer elements
    const phoneInput = document.getElementById("phone-input");
    const keyBtns = document.querySelectorAll(".key-btn");
    const backspaceBtn = document.getElementById("dialer-backspace");
    const startCallBtn = document.getElementById("start-call-btn");

    // Fake Win98 Window Controls
    const fakeCloseBtn = document.getElementById("fake-close-btn");
    const fakeMinBtn = document.getElementById("fake-min-btn");
    const fakeMaxBtn = document.getElementById("fake-max-btn");
    const fakeCloseModal = document.getElementById("fake-close-modal");
    const confirmExitBtn = document.getElementById("confirm-exit-btn");
    const windowFrame = document.querySelector(".window-frame");

    // ==========================================
    // 🔊 Audio API: Static & DTMF Dial Tones
    // ==========================================
    let audioCtx = null;

    function getAudioContext() {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === "suspended") {
            audioCtx.resume();
        }
        return audioCtx;
    }

    const dtmfFreqs = {
        "1": [697, 1209], "2": [697, 1336], "3": [697, 1477],
        "4": [770, 1209], "5": [770, 1336], "6": [770, 1477],
        "7": [852, 1209], "8": [852, 1336], "9": [852, 1477],
        "*": [941, 1209], "0": [941, 1336], "#": [941, 1477]
    };

    function playTone(key, durationMs = 150) {
        try {
            const ctx = getAudioContext();
            const freqs = dtmfFreqs[key];
            if (!freqs) return;

            const osc1 = ctx.createOscillator();
            const osc2 = ctx.createOscillator();
            const gainNode = ctx.createGain();

            osc1.frequency.value = freqs[0];
            osc2.frequency.value = freqs[1];

            gainNode.gain.setValueAtTime(0.12, ctx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationMs / 1000);

            osc1.connect(gainNode);
            osc2.connect(gainNode);
            gainNode.connect(ctx.destination);

            osc1.start();
            osc2.start();
            osc1.stop(ctx.currentTime + durationMs / 1000);
            osc2.stop(ctx.currentTime + durationMs / 1000);
        } catch (e) {
            console.warn("Audio tone error:", e);
        }
    }

    function playStaticLoadingSound(durationMs = 1200) {
        try {
            const ctx = getAudioContext();
            const bufferSize = ctx.sampleRate * (durationMs / 1000);
            const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const output = buffer.getChannelData(0);

            let lastOut = 0.0;
            for (let i = 0; i < bufferSize; i++) {
                const white = Math.random() * 2 - 1;
                output[i] = (lastOut + 0.04 * white) / 1.04;
                lastOut = output[i];
                if (Math.random() < 0.003) output[i] += (Math.random() - 0.5) * 0.8;
            }

            const whiteNoise = ctx.createBufferSource();
            whiteNoise.buffer = buffer;

            const filter = ctx.createBiquadFilter();
            filter.type = "bandpass";
            filter.frequency.setValueAtTime(1600, ctx.currentTime);
            filter.Q.setValueAtTime(1.8, ctx.currentTime);

            const gainNode = ctx.createGain();
            gainNode.gain.setValueAtTime(0.01, ctx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.08);
            gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + durationMs / 1000);

            whiteNoise.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(ctx.destination);

            whiteNoise.start();
            whiteNoise.stop(ctx.currentTime + durationMs / 1000);
        } catch (e) {
            console.warn("Audio context blocked:", e);
        }
    }

    // ==========================================
    // 🔮 Magic Gibbering Voice Synthesizer
    // ==========================================
    function playMagicGibberishCall() {
        const modalBody = callModal.querySelector(".modal-body");
        const originalContent = modalBody.innerHTML;

        modalBody.innerHTML = `
      <div style="text-align: center; padding: 10px;">
        <div style="font-size: 32px; animation: spin-spell 2s infinite linear;">✨🔮✨</div>
        <p style="color: #6a0dad; font-weight: bold; font-size: 14px; margin: 8px 0;">CONNECTED TO THE ASTRAL OPERATOR...</p>
        <div id="incantation-text" style="font-family: 'Courier New', monospace; font-size: 13px; color: #333; background: #fff; padding: 8px; border: 2px inset #fff; height: 55px; overflow: hidden;">
          ...establishing ethereal frequency...
        </div>
        <button class="win98-dialog-btn" id="hangup-magic-btn" style="margin-top: 12px; background: #d93025; color: #fff; font-weight: bold;">Hang Up</button>
      </div>
    `;

        // Gibberish incantations
        const phrases = [
            "Zorblax kalamari vintrox quendar!",
            "Alakazam wibbly-wobbly gobble-degook!",
            "Sim-sala-bim hocus pokus skiddle-dee-doo!",
            "Floopity doo bazzle fizzle chronos abracadabra!",
            "Razzle dazzle wiggly giggly shazam bong!"
        ];

        let isCallActive = true;
        const hangupBtn = document.getElementById("hangup-magic-btn");
        const incantationBox = document.getElementById("incantation-text");

        // Eerie frequency wobbler
        const ctx = getAudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(880, ctx.currentTime + 3);
        gain.gain.setValueAtTime(0.04, ctx.currentTime);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();

        // Voice utterance loop
        function speakGibberish(index = 0) {
            if (!isCallActive || index >= phrases.length) {
                if (isCallActive) {
                    incantationBox.textContent = "*The spellbound line went dead...*";
                    try { osc.stop(); } catch(e){}
                }
                return;
            }

            const phrase = phrases[index];
            incantationBox.textContent = `"${phrase}"`;

            if ('speechSynthesis' in window) {
                window.speechSynthesis.cancel();
                const utterance = new SpeechSynthesisUtterance(phrase);
                utterance.pitch = 1.8 + Math.random() * 0.4; // High-pitched magical voice
                utterance.rate = 1.35; // Fast gibberish cadence
                utterance.onend = () => {
                    if (isCallActive) {
                        setTimeout(() => speakGibberish(index + 1), 300);
                    }
                };
                window.speechSynthesis.speak(utterance);
            } else {
                setTimeout(() => speakGibberish(index + 1), 1200);
            }
        }

        speakGibberish(0);

        hangupBtn.addEventListener("click", () => {
            isCallActive = false;
            if ('speechSynthesis' in window) window.speechSynthesis.cancel();
            try { osc.stop(); } catch(e){}
            modalBody.innerHTML = originalContent;
            wireUpDialer();
        });
    }

    // ==========================================
    // 📞 Phone Dialer Logic & Easter Egg
    // ==========================================
    function wireUpDialer() {
        const currentInput = document.getElementById("phone-input");
        const currentKeys = document.querySelectorAll(".key-btn");
        const currentBackspace = document.getElementById("dialer-backspace");
        const currentCallBtn = document.getElementById("start-call-btn");

        currentKeys.forEach((btn) => {
            btn.onclick = () => {
                const key = btn.getAttribute("data-key");
                if (currentInput) currentInput.value += key;
                playTone(key);
            };
        });

        if (currentBackspace && currentInput) {
            currentBackspace.onclick = () => {
                currentInput.value = currentInput.value.slice(0, -1);
            };
        }

        if (currentInput) {
            currentInput.onkeydown = (e) => {
                if (dtmfFreqs[e.key]) playTone(e.key);
            };
        }

        if (currentCallBtn && currentInput) {
            currentCallBtn.onclick = () => {
                const rawNumber = currentInput.value.trim();
                const cleanNumber = rawNumber.replace(/[^0-9+*#]/g, "");

                if (!cleanNumber) {
                    alert("Please enter a phone number first!");
                    return;
                }

                // 🌟 Easter Egg check for 5552368
                if (cleanNumber === "5552368" || cleanNumber === "15552368") {
                    playTone("5", 100);
                    setTimeout(() => playTone("5", 100), 120);
                    setTimeout(() => playTone("5", 100), 240);
                    setTimeout(() => {
                        playMagicGibberishCall();
                    }, 400);
                    return;
                }

                // Standard Real Device Calling
                playTone("1", 80);
                setTimeout(() => playTone("5", 80), 90);
                setTimeout(() => playTone("9", 120), 180);

                setTimeout(() => {
                    window.location.href = `tel:${cleanNumber}`;
                }, 300);
            };
        }
    }

    wireUpDialer();

    // ==========================================
    // Navigation & Modals
    // ==========================================
    if (fakeCloseBtn && fakeCloseModal) {
        fakeCloseBtn.addEventListener("click", () => {
            fakeCloseModal.classList.remove("hidden");
        });
    }

    if (confirmExitBtn && windowFrame) {
        confirmExitBtn.addEventListener("click", () => {
            fakeCloseModal.classList.add("hidden");
            windowFrame.innerHTML = `
        <div style="padding: 100px 20px; text-align: center; font-family: monospace; color: #ffffff; background: #000000; min-height: 400px;">
          <h2 style="color: #ff9900; font-size: 24px;">It is now safe to turn off your computer.</h2>
          <p style="color: #888888; margin-top: 20px;">(Click anywhere or refresh to reload Google Search)</p>
        </div>
      `;
            windowFrame.addEventListener("click", () => window.location.reload(), { once: true });
        });
    }

    if (fakeMinBtn && windowFrame) {
        fakeMinBtn.addEventListener("click", () => {
            alert("Application minimized to taskbar.");
        });
    }

    if (fakeMaxBtn && windowFrame) {
        fakeMaxBtn.addEventListener("click", () => {
            windowFrame.style.maxWidth = windowFrame.style.maxWidth === "100%" ? "900px" : "100%";
        });
    }

    window.cancelExit = function () {
        if (fakeCloseModal) fakeCloseModal.classList.add("hidden");
    };

    if (callBtn && modalOverlay && callModal) {
        callBtn.addEventListener("click", () => {
            modalOverlay.classList.remove("hidden");
            callModal.classList.add("active");
            if (favoritesModal) favoritesModal.classList.remove("active");
        });
    }

    if (favoritesBtn && modalOverlay && favoritesModal) {
        favoritesBtn.addEventListener("click", () => {
            modalOverlay.classList.remove("hidden");
            favoritesModal.classList.add("active");
            if (callModal) callModal.classList.remove("active");
        });
    }

    if (moreBtn && moreDropdown) {
        moreBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            moreDropdown.classList.toggle("show");
        });
    }

    window.addEventListener("click", () => {
        if (moreDropdown && moreDropdown.classList.contains("show")) {
            moreDropdown.classList.remove("show");
        }
    });

    if (modalOverlay) {
        modalOverlay.addEventListener("click", (e) => {
            if (e.target === modalOverlay) closeModals();
        });
    }

    window.closeModals = function () {
        if ('speechSynthesis' in window) window.speechSynthesis.cancel();
        if (modalOverlay) modalOverlay.classList.add("hidden");
        if (callModal) callModal.classList.remove("active");
        if (favoritesModal) favoritesModal.classList.remove("active");
    };

    if (clearHistoryBtn && searchInput && resultsContainer) {
        clearHistoryBtn.addEventListener("click", (e) => {
            e.preventDefault();
            searchInput.value = "";
            resultsContainer.innerHTML = "";
            resultsContainer.classList.add("hidden");
            if (moreDropdown) moreDropdown.classList.remove("show");
        });
    }

    // ==========================================
    // Search Execution
    // ==========================================
    if (searchForm && searchInput) {
        searchForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const query = searchInput.value.trim();
            if (!query) return;

            playStaticLoadingSound(1400);
            await performLiveSearch(query);
        });
    }

    if (luckyBtn && searchInput) {
        luckyBtn.addEventListener("click", () => {
            const query = searchInput.value.trim();
            if (!query) {
                alert("Please enter a search term first!");
                return;
            }
            playStaticLoadingSound(800);
            window.location.href = `https://www.google.com/search?q=${encodeURIComponent(query)}&btnI=1`;
        });
    }

    async function performLiveSearch(query) {
        if (!resultsContainer) return;
        resultsContainer.classList.remove("hidden");
        resultsContainer.innerHTML = `<p><em>Searching archives for "${escapeHtml(query)}"...</em></p>`;

        let searchItems = [];
        let videoResults = [];

        try {
            const webEndpoint = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
                query
            )}&utf8=&format=json&origin=*`;
            const webRes = await fetchWithTimeout(webEndpoint, 3500);
            if (webRes && webRes.ok) {
                const data = await webRes.json();
                searchItems = data.query?.search || [];
            }
        } catch (err) {
            console.warn("Web search error:", err);
        }

        try {
            const ytEndpoint = `https://inv.tux.pizza/api/v1/search?q=${encodeURIComponent(query)}&type=video`;
            const ytRes = await fetchWithTimeout(ytEndpoint, 2500);
            if (ytRes && ytRes.ok) {
                const ytData = await ytRes.json();
                if (Array.isArray(ytData)) {
                    videoResults = ytData.slice(0, 3);
                }
            }
        } catch (err) {
            console.warn("Video search error:", err);
        }

        renderResults(query, searchItems, videoResults);
    }

    function renderResults(query, items, videos) {
        if (!resultsContainer) return;
        resultsContainer.innerHTML = "";

        const countText = document.createElement("p");
        countText.style.margin = "0 0 16px 0";
        countText.style.fontSize = "13px";
        countText.style.color = "#555555";
        countText.innerHTML = `Results for <strong>"${escapeHtml(query)}"</strong>:`;
        resultsContainer.appendChild(countText);

        // Video Section
        const videoSection = document.createElement("div");
        videoSection.className = "video-section";
        videoSection.innerHTML = `<div class="video-header"><strong>▶ Video Results (CRT VCR Filter):</strong></div>`;

        if (videos && videos.length > 0) {
            videos.forEach((vid) => {
                const vidCard = document.createElement("div");
                vidCard.className = "video-card";
                const thumb = vid.videoThumbnails?.[0]?.url || `https://i.ytimg.com/vi/${vid.videoId}/hqdefault.jpg`;
                vidCard.innerHTML = `
          <a href="https://www.youtube.com/watch?v=${vid.videoId}" target="_blank" rel="noopener noreferrer" class="video-thumb-wrapper">
            <img class="video-thumb" src="${thumb}" alt="${escapeHtml(vid.title || '')}" />
          </a>
          <div class="video-info">
            <a class="result-title" href="https://www.youtube.com/watch?v=${vid.videoId}" target="_blank" rel="noopener noreferrer">${escapeHtml(vid.title || '')}</a>
            <div class="result-url">https://www.youtube.com/watch?v=${vid.videoId}</div>
            <div class="result-snippet">${escapeHtml(vid.author || "YouTube")} • ${formatViews(vid.viewCount)}</div>
          </div>
        `;
                videoSection.appendChild(vidCard);
            });
        } else {
            const directSearchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
            const vidCard = document.createElement("div");
            vidCard.className = "video-card";
            vidCard.innerHTML = `
        <div class="video-info">
          <a class="result-title" href="${directSearchUrl}" target="_blank" rel="noopener noreferrer">Watch "${escapeHtml(query)}" on YouTube</a>
          <div class="result-url">${directSearchUrl}</div>
          <div class="result-snippet">Search and stream live video feeds directly matching "${escapeHtml(query)}".</div>
        </div>
      `;
            videoSection.appendChild(vidCard);
        }
        resultsContainer.appendChild(videoSection);

        // Web Section
        const webSectionHeader = document.createElement("div");
        webSectionHeader.style.margin = "20px 0 10px 0";
        webSectionHeader.innerHTML = `<strong>Web Results:</strong>`;
        resultsContainer.appendChild(webSectionHeader);

        if (!items || items.length === 0) {
            const noResults = document.createElement("p");
            noResults.textContent = `No web documents found for "${query}".`;
            resultsContainer.appendChild(noResults);
            return;
        }

        items.forEach((item) => {
            const pageUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/ /g, "_"))}`;
            const resultItem = document.createElement("div");
            resultItem.className = "result-item";
            const snippet = (item.snippet || "").replace(/<span class="searchmatch">/g, "<b>").replace(/<\/span>/g, "</b>");

            resultItem.innerHTML = `
        <div class="result-title">
          <a href="${pageUrl}" target="_blank" rel="noopener noreferrer" style="color: #0000cc; text-decoration: underline;">
            ${escapeHtml(item.title)}
          </a>
        </div>
        <div class="result-url">${pageUrl}</div>
        <div class="result-snippet">${snippet}...</div>
      `;
            resultsContainer.appendChild(resultItem);
        });
    }

    async function fetchWithTimeout(url, timeoutMs = 3000) {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeoutMs);
        try {
            const response = await fetch(url, { signal: controller.signal });
            clearTimeout(id);
            return response;
        } catch (err) {
            clearTimeout(id);
            return null;
        }
    }

    function formatViews(views) {
        if (!views) return "YouTube Video";
        if (views >= 1000000) return (views / 1000000).toFixed(1) + "M views";
        if (views >= 1000) return (views / 1000).toFixed(1) + "K views";
        return views + " views";
    }

    function escapeHtml(str) {
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
});