import { gameState, avatarConfig, swimmer, aiSwimmer, remoteSwimmers, REQUIRED_AI_WINS, swimTestStages, localSpeechBubble, remoteSpeechBubble } from './state.js';
import { translations } from './locales.js';
import { playPhoneRing, playChimeSound, playBleepSound, speakFilteredDialogue, setAudioVolume, playTickSound, playSplashSound } from './audio.js';
import { initOnlinePeer, joinOnlineRoomByCode, isConnectedToLeastRecentRival, broadcastPacket, bugHotlineChannel } from './network.js';
import { drawCustomSwimmer, spawnOceanCreatures } from './renderer.js';

const pauseOverlay = document.getElementById("pauseOverlay");
const commOverlay = document.getElementById("commOverlay");
const debugOverlay = document.getElementById("debugOverlay");
const callOverlay = document.getElementById("callOverlay");
const onlineOverlay = document.getElementById("onlineOverlay");
const avatarOverlay = document.getElementById("avatarOverlay");
const optionsOverlay = document.getElementById("optionsOverlay");
const creditsOverlay = document.getElementById("creditsOverlay");
const quitOverlay = document.getElementById("quitOverlay");
const hudPauseBtn = document.getElementById("hudPauseBtn");
const modeDisplay = document.getElementById("modeDisplay");
const oceanCornerBtn = document.getElementById("oceanCornerBtn");
const oceanBtnIcon = document.getElementById("oceanBtnIcon");
const oceanBtnText = document.getElementById("oceanBtnText");

export function togglePause() {
    if (gameState.isQuit) return;
    gameState.isPaused = !gameState.isPaused;
    const t = translations[gameState.currentLang];

    if (gameState.isPaused) {
        pauseOverlay.style.display = "flex";
        commOverlay.style.display = "none";
        debugOverlay.style.display = "none";
        callOverlay.style.display = "none";
        onlineOverlay.style.display = "none";
        optionsOverlay.style.display = "none";
        avatarOverlay.style.display = "none";
        creditsOverlay.style.display = "none";
        hudPauseBtn.innerText = t.resumeHud;
        stopSwimTestTicker();
    } else {
        pauseOverlay.style.display = "none";
        hudPauseBtn.innerText = t.pause;
        if (gameState.isSwimTestMode && !gameState.raceOutcome) {
            startSwimTestTicker();
        }
    }
}

export function updateOceanButtonUI() {
    if (!oceanCornerBtn || !oceanBtnIcon || !oceanBtnText) return;
    if (gameState.aiRaceWins >= REQUIRED_AI_WINS) {
        oceanCornerBtn.classList.add("unlocked");
        oceanBtnIcon.innerText = "🌊";
        oceanBtnText.innerText = gameState.isOceanMode ? "LEAVE OCEAN" : "EXPLORE OCEAN 🌊";
    } else {
        oceanCornerBtn.classList.remove("unlocked");
        oceanBtnIcon.innerText = "🔒";
        oceanBtnText.innerText = `OCEAN (${gameState.aiRaceWins}/${REQUIRED_AI_WINS} AI WINS)`;
    }
}

export function toggleOceanMode(canvas) {
    if (gameState.aiRaceWins < REQUIRED_AI_WINS) {
        alert(`🔒 Ocean Mode is locked! Win ${REQUIRED_AI_WINS - gameState.aiRaceWins} more AI Sprint Races to unlock!`);
        return;
    }
    gameState.isOceanMode = !gameState.isOceanMode;
    gameState.isChallengeMode = false;
    gameState.isOnlineMode = false;
    gameState.isSwimTestMode = false;
    stopSwimTestTicker();

    if (gameState.isOceanMode) {
        modeDisplay.innerText = "MODE: DEEP OCEAN EXPLORATION 🌊";
        playSplashSound(100, 0.4);
        spawnOceanCreatures(canvas);
    } else {
        modeDisplay.innerText = "MODE: FREE ROAM";
    }
    updateOceanButtonUI();
}

export function startSwimTest() {
    gameState.isSwimTestMode = true;
    gameState.isChallengeMode = false;
    gameState.isOnlineMode = false;
    gameState.isOceanMode = false;
    gameState.isPaused = false;

    pauseOverlay.style.display = "none";
    loadSwimTestStage(0);
}

export function loadSwimTestStage(stageIndex) {
    gameState.currentTestStage = stageIndex;
    gameState.testSecondsRemaining = swimTestStages[stageIndex];
    gameState.raceOutcome = null;

    swimmer.x = 60;
    swimmer.y = 240;
    swimmer.angle = 0;
    swimmer.vx = 0;
    swimmer.vy = 0;
    swimmer.stamina = swimmer.maxStamina;

    hudPauseBtn.innerText = translations[gameState.currentLang].pause;
    modeDisplay.innerText = `SWIM TEST: STAGE ${stageIndex + 1}/5 (${swimTestStages[stageIndex]}s)`;
    startSwimTestTicker();
}

export function startSwimTestTicker() {
    stopSwimTestTicker();
    gameState.testTimerInterval = setInterval(() => {
        if (gameState.isPaused || gameState.isQuit || !gameState.isSwimTestMode || gameState.raceOutcome) return;
        gameState.testSecondsRemaining--;
        playTickSound(gameState.testSecondsRemaining <= 3);

        if (gameState.testSecondsRemaining <= 0) {
            gameState.testSecondsRemaining = 0;
            gameState.raceOutcome = "test_fail";
            stopSwimTestTicker();
        }
    }, 1000);
}

export function stopSwimTestTicker() {
    if (gameState.testTimerInterval) {
        clearInterval(gameState.testTimerInterval);
        gameState.testTimerInterval = null;
    }
}

export function startOnlineRace() {
    stopSwimTestTicker();
    gameState.isOnlineMode = true;
    gameState.isChallengeMode = false;
    gameState.isSwimTestMode = false;
    gameState.isOceanMode = false;
    gameState.isPaused = false;

    onlineOverlay.style.display = "none";
    pauseOverlay.style.display = "none";
    hudPauseBtn.innerText = translations[gameState.currentLang].pause;
    modeDisplay.innerText = isConnectedToLeastRecentRival() ? "MODE: ONLINE (OLD RIVAL) ⚔️" : "MODE: ONLINE WITH FAMILY 🌐";
    gameState.raceOutcome = null;

    swimmer.x = 60;
    swimmer.y = gameState.isHost ? 240 : 120;
    swimmer.angle = 0;
    swimmer.vx = 0;
    swimmer.vy = 0;
}

export function triggerBackgroundAlert() {
    playPhoneRing();
    if (document.hidden && typeof Notification !== "undefined" && Notification.permission === "granted") {
        new Notification("Swim Simulator Hotline", {
            body: "someone needs help",
            icon: "https://picsum.photos/id/1025/128/128"
        });
    }
    setTimeout(() => alert("someone needs help"), 100);
}

export function receiveChatMessage(rawText) {
    const containsCurse = /fuck\s*you|f\*{2,3}k/i.test(rawText);
    const isCensored = containsCurse && !isConnectedToLeastRecentRival();
    const text = isCensored ? "####" : (containsCurse ? "Fuck you!" : rawText);

    remoteSpeechBubble.text = text;
    remoteSpeechBubble.timer = 180;

    addChatFeedPill(`${isConnectedToLeastRecentRival() ? "Rival" : "Family"}: ${text}`);
    if (isCensored) {
        playBleepSound();
    } else {
        playChimeSound(800);
        speakFilteredDialogue(text);
    }
}

export function addChatFeedPill(text) {
    const liveChatFeed = document.getElementById("liveChatFeed");
    if (!liveChatFeed) return;
    const pill = document.createElement("div");
    pill.className = "chat-msg-pill";
    pill.innerText = text;
    liveChatFeed.appendChild(pill);
    if (liveChatFeed.children.length > 3) {
        liveChatFeed.removeChild(liveChatFeed.children[0]);
    }
    setTimeout(() => {
        if (pill.parentNode) pill.parentNode.removeChild(pill);
    }, 4500);
}

export function updateRoomHistoryIndicator() {
    const el = document.getElementById("roomHistoryIndicator");
    if (!el) return;
    if (gameState.roomHistory.length >= 2) {
        el.innerText = `Old Rival: [${gameState.roomHistory[0]}] | Recent Friend: [${gameState.roomHistory[gameState.roomHistory.length - 1]}]`;
    } else {
        el.innerText = `Connected Room: [${gameState.currentConnectedRoom || "LOBBY"}]`;
    }
}

export function renderAvatarPreview(pCtx, previewCanvas) {
    pCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
    pCtx.save();
    pCtx.translate(65, 95);
    pCtx.rotate(Math.PI / 2);
    drawCustomSwimmer(pCtx, 0, 0, 0, Math.PI / 3, (4 * Math.PI) / 3, 0, avatarConfig);
    pCtx.restore();
}

export function openCreditsMenu(customSub = "Sliding Credits Roll") {
    optionsOverlay.style.display = "none";
    pauseOverlay.style.display = "none";
    creditsOverlay.style.display = "flex";
    const subEl = document.getElementById("creditsSubHeader");
    if (subEl) subEl.innerText = customSub;

    const slider = document.querySelector(".credits-slide-container");
    if (slider) {
        slider.style.animation = "none";
        slider.offsetHeight;
        slider.style.animation = "slideDownCredits 14s linear infinite";
    }
}

export function registerUIListeners(pCtx, previewCanvas, gameContainer, canvas) {
    window.togglePause = togglePause;
    window.toggleOceanMode = () => toggleOceanMode(canvas);

    window.openCommMenu = () => {
        pauseOverlay.style.display = "none";
        commOverlay.style.display = "flex";
    };
    window.closeCommMenu = () => {
        commOverlay.style.display = "none";
        gameState.isPaused = false;
        hudPauseBtn.innerText = translations[gameState.currentLang].pause;
    };

    window.sendQuickMessage = (text) => {
        const containsCurse = /fuck\s*you|f\*{2,3}k/i.test(text);
        const isCensored = containsCurse && !isConnectedToLeastRecentRival();
        const displayText = isCensored ? "####" : (containsCurse ? "Fuck you!" : text);

        localSpeechBubble.text = displayText;
        localSpeechBubble.timer = 180;
        addChatFeedPill(`You: ${displayText}`);

        if (isCensored) {
            playBleepSound();
        } else {
            playChimeSound(600);
            speakFilteredDialogue(displayText);
        }
        broadcastPacket({ type: 'chat_msg', text });
        window.closeCommMenu();
    };

    window.sendCustomMessage = () => {
        const input = document.getElementById("customChatInput");
        if (input && input.value.trim()) {
            window.sendQuickMessage(input.value.trim());
            input.value = "";
        }
    };

    window.callCreatorForBugs = () => {
        if (bugHotlineChannel) bugHotlineChannel.postMessage({ type: "CALL_CREATOR_HELP" });
        broadcastPacket({ type: 'call_creator' });
        pauseOverlay.style.display = "none";
        callOverlay.style.display = "flex";
        triggerBackgroundAlert();
    };
    window.closeCallMenu = () => {
        callOverlay.style.display = "none";
        pauseOverlay.style.display = "flex";
    };

    window.openOnlineMenu = () => {
        pauseOverlay.style.display = "none";
        onlineOverlay.style.display = "flex";
        updateRoomHistoryIndicator();
        initOnlinePeer();
    };
    window.closeOnlineMenu = () => {
        onlineOverlay.style.display = "none";
        pauseOverlay.style.display = "flex";
    };
    window.joinOnlineRoom = () => {
        const code = document.getElementById("joinCodeInput").value.trim();
        if (code) joinOnlineRoomByCode(code);
    };

    window.openAvatarCustomizer = () => {
        pauseOverlay.style.display = "none";
        avatarOverlay.style.display = "flex";
        renderAvatarPreview(pCtx, previewCanvas);
    };
    window.closeAvatarCustomizer = () => {
        avatarOverlay.style.display = "none";
        pauseOverlay.style.display = "flex";
    };
    window.updateAvatarPart = (part, value) => {
        avatarConfig[part] = value;
        renderAvatarPreview(pCtx, previewCanvas);
    };

    window.openOptionsMenu = () => {
        pauseOverlay.style.display = "none";
        optionsOverlay.style.display = "flex";
    };
    window.closeOptionsMenu = () => {
        optionsOverlay.style.display = "none";
        pauseOverlay.style.display = "flex";
    };
    window.openCreditsMenu = () => openCreditsMenu();
    window.closeCreditsMenu = () => {
        creditsOverlay.style.display = "none";
        pauseOverlay.style.display = "flex";
    };

    window.changeLanguage = (lang) => {
        gameState.currentLang = lang;
        const t = translations[lang];
        document.getElementById("staminaLabel").innerText = t.stamina;
        document.getElementById("pauseTitle").innerText = t.pauseTitle;
        document.getElementById("resumeBtn").innerText = t.resume;
        document.getElementById("commMenuBtn").innerText = t.comm;
        document.getElementById("challengeBtn").innerText = t.challenge;
        document.getElementById("optionsBtn").innerText = t.options;
        document.getElementById("creditsBtn").innerText = t.credits;
        document.getElementById("quitBtn").innerText = t.quit;
    };

    window.changeVolume = (val) => setAudioVolume(val);
    window.toggleDisplayMode = () => {
        if (!document.fullscreenElement) {
            gameContainer.requestFullscreen().catch(() => {});
        } else {
            document.exitFullscreen().catch(() => {});
        }
    };

    window.openDebugMenu = () => {
        pauseOverlay.style.display = "none";
        debugOverlay.style.display = "flex";
    };
    window.closeDebugMenu = () => {
        debugOverlay.style.display = "none";
        pauseOverlay.style.display = "flex";
    };
    window.toggleDebugHitboxes = () => {
        gameState.debugShowHitboxes = !gameState.debugShowHitboxes;
        document.getElementById("hitboxToggleBtn").innerText = gameState.debugShowHitboxes ? "ON" : "OFF";
    };
    window.toggleDebugFreeze = () => {
        gameState.debugFreezeEntities = !gameState.debugFreezeEntities;
        document.getElementById("freezeToggleBtn").innerText = gameState.debugFreezeEntities ? "ON" : "OFF";
    };
    window.debugTeleportAllToFinish = () => {
        swimmer.x = 620;
        aiSwimmer.x = 620;
        if (remoteSwimmers.peer1.connected) remoteSwimmers.peer1.x = 620;
        if (remoteSwimmers.peer2.connected) remoteSwimmers.peer2.x = 620;
    };
    window.debugMaxStamina = () => {
        swimmer.stamina = swimmer.maxStamina;
    };
    window.debugUnlockOcean = () => {
        gameState.aiRaceWins = REQUIRED_AI_WINS;
        localStorage.setItem("swim_sim_ai_wins", "10");
        updateOceanButtonUI();
    };

    window.startSwimTest = startSwimTest;
    window.startChallengeMode = () => {
        stopSwimTestTicker();
        gameState.isChallengeMode = true;
        gameState.isOnlineMode = false;
        gameState.isSwimTestMode = false;
        gameState.isOceanMode = false;
        gameState.isPaused = false;
        pauseOverlay.style.display = "none";
        hudPauseBtn.innerText = translations[gameState.currentLang].pause;
        modeDisplay.innerText = translations[gameState.currentLang].modeRace;
        gameState.raceOutcome = null;

        swimmer.x = 60;
        swimmer.y = 360;
        swimmer.angle = 0;
        swimmer.vx = 0;
        swimmer.vy = 0;
        swimmer.stage = 1;
        swimmer.hearts = 3;

        aiSwimmer.x = 60;
        aiSwimmer.y = 120;
        aiSwimmer.vx = 0;
        aiSwimmer.vy = 0;
        aiSwimmer.stage = 1;
    };

    window.quitGame = () => {
        stopSwimTestTicker();
        gameState.isQuit = true;
        gameState.isPaused = true;
        pauseOverlay.style.display = "none";
        quitOverlay.style.display = "flex";
    };
}