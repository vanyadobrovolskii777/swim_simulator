const canvas = document.getElementById("swimCanvas");
const ctx = canvas.getContext("2d");
const gameContainer = document.getElementById("gameContainer");

const previewCanvas = document.getElementById("avatarPreviewCanvas");
const pCtx = previewCanvas.getContext("2d");

const staminaFill = document.getElementById("staminaFill");
const speedDisplay = document.getElementById("speedDisplay");
const modeDisplay = document.getElementById("modeDisplay");
const recordingBadge = document.getElementById("recordingBadge");
const liveChatFeed = document.getElementById("liveChatFeed");

const oceanCornerBtn = document.getElementById("oceanCornerBtn");
const oceanBtnIcon = document.getElementById("oceanBtnIcon");
const oceanBtnText = document.getElementById("oceanBtnText");

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
const secretDebugBtn = document.getElementById("secretDebugBtn");
const hitboxToggleBtn = document.getElementById("hitboxToggleBtn");
const freezeToggleBtn = document.getElementById("freezeToggleBtn");
const recSimBtn = document.getElementById("recSimBtn");

const displayToggleBtn = document.getElementById("displayToggleBtn");
const volVal = document.getElementById("volVal");
const myRoomCodeDisplay = document.getElementById("myRoomCodeDisplay");
const onlineStatusText = document.getElementById("onlineStatusText");
const joinCodeInput = document.getElementById("joinCodeInput");
const customChatInput = document.getElementById("customChatInput");
const creditsSubHeader = document.getElementById("creditsSubHeader");
const roomHistoryIndicator = document.getElementById("roomHistoryIndicator");

let isPaused = false;
let isQuit = false;
let isChallengeMode = false;
let isOnlineMode = false;
let isSwimTestMode = false;
let isOceanMode = false;
let isHost = true;
let raceOutcome = null;
let currentLang = "en";
let masterVolume = 1.0;

// --- 🌊 OCEAN MODE UNLOCK TRACKER (10 AI WINS) ---
let aiRaceWins = 0;
const REQUIRED_AI_WINS = 10;

try {
  const savedWins = localStorage.getItem("swim_sim_ai_wins");
  if (savedWins) {
    aiRaceWins = parseInt(savedWins, 10) || 0;
  }
} catch (e) {}

function updateOceanButtonUI() {
  if (aiRaceWins >= REQUIRED_AI_WINS) {
    oceanCornerBtn.classList.add("unlocked");
    oceanBtnIcon.innerText = "🌊";
    oceanBtnText.innerText = isOceanMode ? "LEAVE OCEAN" : "EXPLORE OCEAN 🌊";
  } else {
    oceanCornerBtn.classList.remove("unlocked");
    oceanBtnIcon.innerText = "🔒";
    oceanBtnText.innerText = `OCEAN (${aiRaceWins}/${REQUIRED_AI_WINS} AI WINS)`;
  }
}

function registerAIWin() {
  aiRaceWins++;
  try {
    localStorage.setItem("swim_sim_ai_wins", aiRaceWins.toString());
  } catch (e) {}
  updateOceanButtonUI();
}

function toggleOceanMode() {
  if (aiRaceWins < REQUIRED_AI_WINS) {
    alert(`🔒 Ocean Mode is locked! Win ${REQUIRED_AI_WINS - aiRaceWins} more AI Sprint Races to unlock the infinite ocean!`);
    return;
  }

  isOceanMode = !isOceanMode;
  isChallengeMode = false;
  isOnlineMode = false;
  isSwimTestMode = false;
  stopSwimTestTicker();

  if (isOceanMode) {
    modeDisplay.innerText = "MODE: DEEP OCEAN EXPLORATION 🌊";
    playSplashSound(100, 0.4);
    spawnOceanCreatures();
  } else {
    modeDisplay.innerText = "MODE: FREE ROAM";
  }

  updateOceanButtonUI();
}

function debugUnlockOcean() {
  aiRaceWins = REQUIRED_AI_WINS;
  try {
    localStorage.setItem("swim_sim_ai_wins", aiRaceWins.toString());
  } catch (e) {}
  updateOceanButtonUI();
  alert("🌊 DEV UNLOCK: 10 AI Wins granted! Ocean Mode Unlocked!");
}

// --- 🌊 OCEAN CREATURES (Fish, Sea Turtles, Jellyfish) ---
let oceanCreatures = [];

function spawnOceanCreatures() {
  oceanCreatures = [];
  
  // Fish Schools
  for (let i = 0; i < 9; i++) {
    oceanCreatures.push({
      type: "fish",
      x: Math.random() * canvas.width,
      y: 80 + Math.random() * (canvas.height - 140),
      vx: (Math.random() > 0.5 ? 1 : -1) * (1.2 + Math.random() * 1.5),
      vy: (Math.random() - 0.5) * 0.4,
      size: 6 + Math.random() * 4,
      color: Math.random() > 0.5 ? "#f59e0b" : "#38bdf8"
    });
  }

  // Sea Turtles
  for (let i = 0; i < 2; i++) {
    oceanCreatures.push({
      type: "turtle",
      x: Math.random() * canvas.width,
      y: 120 + Math.random() * (canvas.height - 200),
      vx: (Math.random() > 0.5 ? 1 : -1) * 0.7,
      vy: (Math.random() - 0.5) * 0.2,
      size: 18,
      paddleAngle: 0
    });
  }

  // Bioluminescent Jellyfish
  for (let i = 0; i < 3; i++) {
    oceanCreatures.push({
      type: "jellyfish",
      x: Math.random() * canvas.width,
      y: 150 + Math.random() * (canvas.height - 220),
      vy: -0.4 - Math.random() * 0.3,
      pulse: Math.random() * Math.PI,
      size: 12,
      color: "#c084fc"
    });
  }
}

// --- 💬 SPEECH BUBBLE & COMMUNICATION STATE ---
let localSpeechBubble = { text: "", timer: 0 };
let remoteSpeechBubble = { text: "", timer: 0 };

// --- 📜 LEAST VS MOST RECENTLY PLAYED ROOM HISTORY TRACKER ---
let currentConnectedRoom = "";
let roomHistory = [];

try {
  const saved = localStorage.getItem("swim_sim_room_history");
  if (saved) {
    roomHistory = JSON.parse(saved);
  }
} catch (e) {}

if (roomHistory.length === 0) {
  roomHistory = ["WORN", "RIVL", "FAM1"];
}

function recordRoomVisit(roomCode) {
  currentConnectedRoom = roomCode.toUpperCase();
  roomHistory = roomHistory.filter(c => c !== currentConnectedRoom);
  roomHistory.push(currentConnectedRoom);
  try {
    localStorage.setItem("swim_sim_room_history", JSON.stringify(roomHistory));
  } catch (e) {}
  updateRoomHistoryIndicator();
}

function updateRoomHistoryIndicator() {
  if (roomHistory.length >= 2) {
    const leastRecent = roomHistory[0];
    const mostRecent = roomHistory[roomHistory.length - 1];
    roomHistoryIndicator.innerText = `Old Rival: [${leastRecent}] | Recent Friend: [${mostRecent}]`;
  } else {
    roomHistoryIndicator.innerText = `Connected Room: [${currentConnectedRoom || "LOBBY"}]`;
  }
}

function isConnectedToLeastRecentRival() {
  if (roomHistory.length < 2) return false;
  return currentConnectedRoom === roomHistory[0];
}

function processChatMessageFilter(text) {
  const containsCurse = /fuck\s*you|f\*{2,3}k/i.test(text);

  if (containsCurse) {
    if (isConnectedToLeastRecentRival()) {
      return { displayText: "Fuck you!", spokenText: "Fuck you!", isCensored: false };
    } else {
      return { displayText: "####", spokenText: "", isCensored: true };
    }
  }

  return { displayText: text, spokenText: text, isCensored: false };
}

function bumpIntoRandomRoom() {
  if (roomHistory.length > 0 && Math.random() < 0.5) {
    const oldRivalCode = roomHistory[0];
    joinCodeInput.value = oldRivalCode;
    joinOnlineRoom();
  } else {
    const randomCode = Math.random().toString(36).substring(2, 6).toUpperCase();
    joinCodeInput.value = randomCode;
    joinOnlineRoom();
  }
}

function getAnnouncerVoice() {
  if (typeof window.speechSynthesis === "undefined") return null;
  const voices = window.speechSynthesis.getVoices();
  return voices.find(v => v.lang.startsWith("en") && (v.name.includes("Male") || v.name.includes("David") || v.name.includes("Alex") || v.name.includes("George"))) || voices[0];
}

function speakFilteredDialogue(spokenText) {
  if (typeof window.speechSynthesis === "undefined" || !spokenText) return;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(spokenText);
    utterance.voice = getAnnouncerVoice();
    utterance.rate = 1.05;
    utterance.pitch = 1.1;
    utterance.volume = masterVolume;
    window.speechSynthesis.speak(utterance);
  } catch (e) {}
}

// --- 🎥 RECORDING DETECTION & MEGA SPEED ENGINE ---
let isRecordingActive = false;
const NORMAL_MAX_SPEED = 5.2;
const MEGA_MAX_SPEED = 18.0;

function startRecordingDetector() {
  if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
    document.addEventListener("visibilitychange", checkMediaTracks);
  }
  setInterval(checkMediaTracks, 1000);
}

function checkMediaTracks() {
  if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
    navigator.mediaDevices.enumerateDevices().then(devices => {
      const isCapturing = devices.some(d => d.label.toLowerCase().includes("obs") || d.label.toLowerCase().includes("screen") || d.label.toLowerCase().includes("broadcast"));
      if (isCapturing && !isRecordingActive) {
        setRecordingBoost(true);
      }
    }).catch(() => {});
  }
}

function setRecordingBoost(enabled) {
  isRecordingActive = enabled;
  recordingBadge.style.display = enabled ? "inline-block" : "none";
  if (recSimBtn) {
    recSimBtn.innerText = enabled ? "ACTIVE (3.5X)" : "OFF";
    recSimBtn.style.background = enabled ? "#dc2626" : "#0f766e";
  }
  if (enabled) {
    playSplashSound(360, 0.25);
  }
}

startRecordingDetector();

// --- 🛠️ CREATOR DEBUG CONTROLS STATE ---
let debugUnlocked = false;
let debugShowHitboxes = false;
let debugFreezeEntities = false;

// --- ⏱️ SWIM TEST SYSTEM STATE ---
const swimTestStages = [30, 25, 20, 15, 10];
let currentTestStage = 0;
let testSecondsRemaining = 30;
let testTimerInterval = null;

// --- 📢 CROSS-TAB BROADCAST CHANNEL ---
let bugHotlineChannel = null;
try {
  bugHotlineChannel = new BroadcastChannel("creator_bug_hotline");
  bugHotlineChannel.onmessage = (event) => {
    if (event.data && event.data.type === "CALL_CREATOR_HELP") {
      triggerBackgroundAlert();
    }
  };
} catch (e) {}

if (typeof Notification !== "undefined" && Notification.permission !== "granted" && Notification.permission !== "denied") {
  Notification.requestPermission();
}

let titleFlashInterval = null;
const originalTitle = document.title;

function startTitleFlash() {
  if (titleFlashInterval) clearInterval(titleFlashInterval);
  let toggle = false;
  titleFlashInterval = setInterval(() => {
    document.title = toggle ? "🚨 (1) SOMEONE NEEDS HELP!" : "🏊 Swim Sim 2026";
    toggle = !toggle;
  }, 600);
}

function stopTitleFlash() {
  if (titleFlashInterval) {
    clearInterval(titleFlashInterval);
    titleFlashInterval = null;
  }
  document.title = originalTitle;
}

window.addEventListener("focus", stopTitleFlash);

// Custom Avatar Configuration
const avatarConfig = {
  skin: "#fcd34d",
  hairStyle: "none",
  hairColor: "#0f172a",
  goggles: "#0f172a",
  eyes: "focus",
  faceFeature: "none",
  suitColor: "#0284c7"
};

// Remote Swimmer State
const remoteSwimmer = {
  connected: false,
  x: 60,
  y: 120,
  angle: 0,
  leftArmAngle: 0,
  rightArmAngle: Math.PI,
  kickCycle: 0,
  config: {
    skin: "#f59e0b",
    hairStyle: "short",
    hairColor: "#78350f",
    goggles: "#06b6d4",
    eyes: "focus",
    faceFeature: "none",
    suitColor: "#ec4899"
  }
};

// WebRTC PeerJS Online Multiplayer
let peer = null;
let peerConnection = null;
let myRoomCode = "";

function initOnlinePeer() {
  if (peer) return;

  myRoomCode = Math.random().toString(36).substring(2, 6).toUpperCase();
  myRoomCodeDisplay.innerText = myRoomCode;

  peer = new Peer(`swim-sim-${myRoomCode}`);

  peer.on('open', () => {
    myRoomCodeDisplay.innerText = myRoomCode;
    recordRoomVisit(myRoomCode);
  });

  peer.on('connection', (conn) => {
    peerConnection = conn;
    isHost = true;
    setupPeerConnection();
  });

  peer.on('error', (err) => {
    if (err.type === 'unavailable-id') {
      myRoomCode = Math.random().toString(36).substring(2, 6).toUpperCase();
      peer = new Peer(`swim-sim-${myRoomCode}`);
    }
  });
}

function setupPeerConnection() {
  onlineStatusText.innerText = "🎉 CONNECTED! Starting race...";
  remoteSwimmer.connected = true;
  liveChatFeed.style.display = "flex";

  peerConnection.on('data', (data) => {
    if (data.type === 'sync') {
      remoteSwimmer.x = data.x;
      remoteSwimmer.y = data.y;
      remoteSwimmer.angle = data.angle;
      remoteSwimmer.leftArmAngle = data.leftArmAngle;
      remoteSwimmer.rightArmAngle = data.rightArmAngle;
      remoteSwimmer.kickCycle = data.kickCycle;
      remoteSwimmer.config = data.config;

      if (data.isKicking) {
        createBubbleCluster(remoteSwimmer.x - 28, remoteSwimmer.y, 2);
      }
    } else if (data.type === 'call_creator') {
      triggerBackgroundAlert();
    } else if (data.type === 'chat_msg') {
      receiveChatMessage(data.text);
    }
  });

  peerConnection.on('close', () => {
    remoteSwimmer.connected = false;
    onlineStatusText.innerText = "❌ Disconnected.";
  });

  setTimeout(() => {
    startOnlineRace();
  }, 1000);
}

function joinOnlineRoom() {
  const code = joinCodeInput.value.trim().toUpperCase();
  if (code.length !== 4) {
    alert("Please enter a valid 4-letter room code!");
    return;
  }

  recordRoomVisit(code);

  onlineStatusText.innerText = `Connecting to Room ${code}...`;
  peerConnection = peer.connect(`swim-sim-${code}`);
  isHost = false;

  peerConnection.on('open', setupPeerConnection);
}

function startOnlineRace() {
  stopSwimTestTicker();
  isOnlineMode = true;
  isChallengeMode = false;
  isSwimTestMode = false;
  isOceanMode = false;
  isPaused = false;

  onlineOverlay.style.display = "none";
  pauseOverlay.style.display = "none";
  hudPauseBtn.innerText = translations[currentLang].pause;
  modeDisplay.innerText = isConnectedToLeastRecentRival() ? "MODE: ONLINE (OLD RIVAL) ⚔️" : "MODE: ONLINE WITH FAMILY 🌐";
  raceOutcome = null;

  swimmer.x = 60;
  swimmer.y = isHost ? 360 : 120;
  swimmer.angle = 0;
  swimmer.vx = 0;
  swimmer.vy = 0;
  swimmer.stamina = swimmer.maxStamina;

  remoteSwimmer.x = 60;
  remoteSwimmer.y = isHost ? 120 : 360;
}

// --- 💬 CHAT & COMMUNICATION ENGINE ---
function openCommMenu() {
  pauseOverlay.style.display = "none";
  commOverlay.style.display = "flex";
  setTimeout(() => {
    if (customChatInput) customChatInput.focus();
  }, 100);
}

function closeCommMenu() {
  commOverlay.style.display = "none";
  pauseOverlay.style.display = "none";
  isPaused = false;
  hudPauseBtn.innerText = translations[currentLang].pause;
}

function sendQuickMessage(rawText) {
  triggerLocalChat(rawText);
  closeCommMenu();
}

function sendCustomMessage() {
  const rawText = customChatInput.value.trim();
  if (!rawText) return;
  triggerLocalChat(rawText);
  customChatInput.value = "";
  closeCommMenu();
}

function triggerLocalChat(rawText) {
  const processed = processChatMessageFilter(rawText);

  localSpeechBubble.text = processed.displayText;
  localSpeechBubble.timer = 180;

  addChatFeedPill(`You: ${processed.displayText}`);

  if (processed.isCensored) {
    playBleepSound();
  } else {
    playChimeSound(600);
    speakFilteredDialogue(processed.spokenText);
  }

  if (peerConnection && peerConnection.open) {
    peerConnection.send({ type: 'chat_msg', text: rawText });
  }
}

function receiveChatMessage(rawText) {
  const processed = processChatMessageFilter(rawText);

  remoteSpeechBubble.text = processed.displayText;
  remoteSpeechBubble.timer = 180;

  const senderTag = isConnectedToLeastRecentRival() ? "Rival" : "Family";
  addChatFeedPill(`${senderTag}: ${processed.displayText}`);

  if (processed.isCensored) {
    playBleepSound();
  } else {
    playChimeSound(800);
    speakFilteredDialogue(processed.spokenText);
  }
}

function addChatFeedPill(text) {
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

// Translations
const translations = {
  en: {
    stamina: "STAMINA:",
    speed: "SPEED:",
    pause: "⏸️ PAUSE [P]",
    resumeHud: "▶️ RESUME",
    pauseTitle: "GAME PAUSED",
    pauseSubtitle: "Take a breath and stretch your arms!",
    resume: "▶️ RESUME",
    comm: "💬 COMMUNICATE WITH FAMILY/FRIENDS",
    callCreator: "📞 CALL CREATOR FOR BUGS",
    challenge: "⚔️ AI SPRINT RACE",
    options: "⚙️ OPTIONS",
    credits: "📜 CREDITS",
    quit: "❌ QUIT GAME",
    optionsTitle: "SETTINGS & OPTIONS",
    optionsSubtitle: "Adjust your game experience",
    langLabel: "LANGUAGE:",
    volLabel: "VOLUME",
    displayLabel: "DISPLAY:",
    fullscreen: "🔲 FULLSCREEN",
    windowed: "🪟 WINDOWED",
    back: "⬅️ BACK",
    modeFree: "MODE: FREE ROAM",
    modeRace: "MODE: AI SPRINT RACE"
  },
  es: {
    stamina: "ENERGÍA:",
    speed: "VELOCIDAD:",
    pause: "⏸️ PAUSA [P]",
    resumeHud: "▶️ REANUDAR",
    pauseTitle: "JUEGO PAUSADO",
    pauseSubtitle: "¡Toma aire y estira los brazos!",
    resume: "▶️ REANUDAR",
    comm: "💬 HABLAR CON FAMILIA/AMIGOS",
    callCreator: "📞 LLAMAR AL CREADOR (BUGS)",
    challenge: "⚔️ CARRERA VS IA",
    options: "⚙️ OPCIONES",
    credits: "📜 CRÉDITOS",
    quit: "❌ SALIR",
    optionsTitle: "AJUSTES Y OPCIONES",
    optionsSubtitle: "Configura tu experiencia de juego",
    langLabel: "IDIOMA:",
    volLabel: "VOLUMEN",
    displayLabel: "PANTALLA:",
    fullscreen: "🔲 PANTALLA COMPLETA",
    windowed: "🪟 VENTANA",
    back: "⬅️ VOLVER",
    modeFree: "MODO: NADO LIBRE",
    modeRace: "MODO: CARRERA VS IA"
  },
  fr: {
    stamina: "ENDURANCE:",
    speed: "VITESSE:",
    pause: "⏸️ PAUSE [P]",
    resumeHud: "▶️ REPRENDRE",
    pauseTitle: "JEU EN PAUSE",
    pauseSubtitle: "Respirez et étirez vos bras!",
    resume: "▶️ REPRENDRE",
    comm: "💬 COMMUNIQUER EN FAMILLE",
    callCreator: "📞 APPELER LE CRÉATEUR",
    challenge: "⚔️ COURSE VS IA",
    options: "⚙️ OPTIONS",
    credits: "📜 CRÉDITS",
    quit: "❌ QUITTER",
    optionsTitle: "PARAMÈTRES",
    optionsSubtitle: "Ajustez vos options de jeu",
    langLabel: "LANGUE:",
    volLabel: "VOLUME",
    displayLabel: "AFFICHAGE:",
    fullscreen: "🔲 PLEIN ÉCRAN",
    windowed: "🪟 FENÊTRÉ",
    back: "⬅️ RETOUR",
    modeFree: "MODE: NAGE LIBRE",
    modeRace: "MODE: COURSE VS IA"
  },
  de: {
    stamina: "AUSDAUER:",
    speed: "TEMPO:",
    pause: "⏸️ PAUSE [P]",
    resumeHud: "▶️ WEITER",
    pauseTitle: "SPIEL PAUSIERT",
    pauseSubtitle: "Durchatmen und Arme lockern!",
    resume: "▶️ WEITER",
    comm: "💬 MIT FAMILIE/FREUNDEN CHATTEN",
    callCreator: "📞 ENTWICKLER ANRUFEN",
    challenge: "⚔️ WETTSCHWIMMEN VS KI",
    options: "⚙️ OPTIONEN",
    credits: "📜 CREDITS",
    quit: "❌ BEENDEN",
    optionsTitle: "EINSTELLUNGEN",
    optionsSubtitle: "Passe dein Spielerlebnis an",
    langLabel: "SPRACHE:",
    volLabel: "LAUTSTÄRKE",
    displayLabel: "ANZEIGE:",
    fullscreen: "🔲 VOLLBILD",
    windowed: "🪟 FENSTER",
    back: "⬅️ ZURÜCK",
    modeFree: "MODUS: FREISTIL",
    modeRace: "MODUS: WETTRENNEN"
  }
};

// Web Audio API Setup
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const masterGain = audioCtx.createGain();
masterGain.gain.setValueAtTime(masterVolume, audioCtx.currentTime);
masterGain.connect(audioCtx.destination);

function playSplashSound(pitch = 180, duration = 0.15) {
  if (masterVolume <= 0) return;
  try {
    let osc = audioCtx.createOscillator();
    let gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(masterGain);

    osc.type = "sine";
    osc.frequency.setValueAtTime(pitch, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + duration);

    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);

    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch (e) {}
}

function playChimeSound(pitch = 600) {
  if (masterVolume <= 0) return;
  try {
    let osc = audioCtx.createOscillator();
    let gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(masterGain);

    osc.type = "sine";
    osc.frequency.setValueAtTime(pitch, audioCtx.currentTime);
    osc.frequency.setValueAtTime(pitch * 1.3, audioCtx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.3);
  } catch (e) {}
}

function playBleepSound() {
  if (masterVolume <= 0) return;
  try {
    let osc = audioCtx.createOscillator();
    let gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(masterGain);

    osc.type = "square";
    osc.frequency.setValueAtTime(1000, audioCtx.currentTime);

    gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.25);
  } catch (e) {}
}

function playTickSound(urgent = false) {
  if (masterVolume <= 0) return;
  try {
    let osc = audioCtx.createOscillator();
    let gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(masterGain);

    osc.type = "triangle";
    osc.frequency.setValueAtTime(urgent ? 600 : 380, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(urgent ? 200 : 120, audioCtx.currentTime + 0.05);

    gain.gain.setValueAtTime(0.18, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.05);
  } catch (e) {}
}

function playPhoneRing() {
  if (masterVolume <= 0) return;
  try {
    let osc = audioCtx.createOscillator();
    let gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(masterGain);

    osc.type = "sine";
    osc.frequency.setValueAtTime(440, audioCtx.currentTime);
    osc.frequency.setValueAtTime(480, audioCtx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.4);
  } catch (e) {}
}

// Swimmer State
const swimmer = {
  x: 360,
  y: 240,
  angle: 0,
  vx: 0,
  vy: 0,
  maxSpeed: NORMAL_MAX_SPEED,
  drag: 0.965,
  stamina: 100,
  maxStamina: 100,

  leftArmAngle: 0,
  rightArmAngle: Math.PI,
  armRotationSpeed: 0,

  isKicking: false,
  kickCycle: 0
};

// AI Swimmer State
const aiSwimmer = {
  x: 60,
  y: 120,
  angle: 0,
  vx: 0,
  vy: 0,
  speed: 2.3,
  leftArmAngle: 0,
  rightArmAngle: Math.PI,
  kickCycle: 0
};

const bubbles = [];
const ripples = [];
const flameParticles = [];

// Input Management
const keys = {};
window.addEventListener("keydown", (e) => {
  if (isQuit) return;

  if (e.key.toLowerCase() === "c" && isOnlineMode && commOverlay.style.display !== "flex") {
    e.preventDefault();
    openCommMenu();
    return;
  }

  if (e.key === "F9" || (e.ctrlKey && e.key.toLowerCase() === "r")) {
    e.preventDefault();
    toggleSimulatedRecording();
    return;
  }

  if (e.key === "`" || e.key === "~" || e.key === "\\") {
    debugUnlocked = !debugUnlocked;
    secretDebugBtn.style.display = debugUnlocked ? "block" : "none";
    return;
  }

  if (e.key.toLowerCase() === "p" || e.key === "Escape") {
    e.preventDefault();
    if (commOverlay.style.display === "flex") {
      closeCommMenu();
    } else if (debugOverlay.style.display === "flex") {
      closeDebugMenu();
    } else if (callOverlay.style.display === "flex") {
      closeCallMenu();
    } else if (creditsOverlay.style.display === "flex") {
      closeCreditsMenu();
    } else if (onlineOverlay.style.display === "flex") {
      closeOnlineMenu();
    } else if (avatarOverlay.style.display === "flex") {
      closeAvatarCustomizer();
    } else if (optionsOverlay.style.display === "flex") {
      closeOptionsMenu();
    } else {
      togglePause();
    }
    return;
  }

  if (isPaused) return;

  keys[e.key.toLowerCase()] = true;
  if (e.code === "Space") {
    e.preventDefault();
    performLegKick();
  }
  if (e.key === "ArrowUp") {
    e.preventDefault();
    performArmStroke(1);
  }
  if (e.key === "ArrowDown") {
    e.preventDefault();
    performArmStroke(-1);
  }
});

window.addEventListener("keyup", (e) => {
  keys[e.key.toLowerCase()] = false;
});

// Pause Logic
function togglePause() {
  if (isQuit) return;
  isPaused = !isPaused;
  const t = translations[currentLang];

  if (isPaused) {
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
    commOverlay.style.display = "none";
    debugOverlay.style.display = "none";
    callOverlay.style.display = "none";
    onlineOverlay.style.display = "none";
    optionsOverlay.style.display = "none";
    avatarOverlay.style.display = "none";
    creditsOverlay.style.display = "none";
    hudPauseBtn.innerText = t.pause;

    if (isSwimTestMode && !raceOutcome) {
      startSwimTestTicker();
    }
  }
}

// Debug Controls
function openDebugMenu() {
  pauseOverlay.style.display = "none";
  debugOverlay.style.display = "flex";
}

function closeDebugMenu() {
  debugOverlay.style.display = "none";
  pauseOverlay.style.display = "flex";
}

function toggleSimulatedRecording() {
  setRecordingBoost(!isRecordingActive);
}

function toggleDebugHitboxes() {
  debugShowHitboxes = !debugShowHitboxes;
  hitboxToggleBtn.innerText = debugShowHitboxes ? "ON" : "OFF";
  hitboxToggleBtn.style.background = debugShowHitboxes ? "#10b981" : "#0f766e";
}

function toggleDebugFreeze() {
  debugFreezeEntities = !debugFreezeEntities;
  freezeToggleBtn.innerText = debugFreezeEntities ? "ON" : "OFF";
  freezeToggleBtn.style.background = debugFreezeEntities ? "#ef4444" : "#0f766e";
}

function debugTeleportAllToFinish() {
  swimmer.x = 620;
  aiSwimmer.x = 620;
  if (remoteSwimmer.connected) {
    remoteSwimmer.x = 620;
  }
  playSplashSound(300, 0.2);
}

function debugMaxStamina() {
  swimmer.stamina = swimmer.maxStamina;
  staminaFill.style.width = "100%";
}

// Call Creator Handlers
function callCreatorForBugs() {
  if (bugHotlineChannel) {
    bugHotlineChannel.postMessage({ type: "CALL_CREATOR_HELP" });
  }
  if (peerConnection && peerConnection.open) {
    peerConnection.send({ type: "call_creator" });
  }

  pauseOverlay.style.display = "none";
  callOverlay.style.display = "flex";
  triggerBackgroundAlert();
}

function triggerBackgroundAlert() {
  playPhoneRing();
  startTitleFlash();

  if (document.hidden && typeof Notification !== "undefined" && Notification.permission === "granted") {
    new Notification("Swim Simulator Hotline", {
      body: "someone needs help",
      icon: "https://picsum.photos/id/1025/128/128"
    });
  }

  setTimeout(() => {
    alert("someone needs help");
  }, 100);
}

function closeCallMenu() {
  callOverlay.style.display = "none";
  pauseOverlay.style.display = "flex";
  stopTitleFlash();
}

// Online Menu Handlers
function openOnlineMenu() {
  pauseOverlay.style.display = "none";
  onlineOverlay.style.display = "flex";
  updateRoomHistoryIndicator();
  initOnlinePeer();
}

function closeOnlineMenu() {
  onlineOverlay.style.display = "none";
  pauseOverlay.style.display = "flex";
}

// Avatar Customizer Handlers
function openAvatarCustomizer() {
  pauseOverlay.style.display = "none";
  avatarOverlay.style.display = "flex";
  renderAvatarPreview();
}

function closeAvatarCustomizer() {
  avatarOverlay.style.display = "none";
  pauseOverlay.style.display = "flex";
}

function updateAvatarPart(part, value) {
  avatarConfig[part] = value;
  renderAvatarPreview();
}

function renderAvatarPreview() {
  pCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);

  pCtx.save();
  pCtx.translate(65, 95);
  pCtx.rotate(Math.PI / 2);

  drawCustomSwimmer(pCtx, 0, 0, 0, Math.PI / 3, (4 * Math.PI) / 3, 0, avatarConfig);
  pCtx.restore();
}

// Options & Credits Menu Handlers
function openOptionsMenu() {
  pauseOverlay.style.display = "none";
  optionsOverlay.style.display = "flex";
}

function closeOptionsMenu() {
  optionsOverlay.style.display = "none";
  pauseOverlay.style.display = "flex";
}

function openCreditsMenu(customSub = "Sliding Credits Roll") {
  optionsOverlay.style.display = "none";
  pauseOverlay.style.display = "none";
  creditsOverlay.style.display = "flex";
  creditsSubHeader.innerText = customSub;

  const slider = document.querySelector(".credits-slide-container");
  if (slider) {
    slider.style.animation = "none";
    slider.offsetHeight;
    slider.style.animation = "slideDownCredits 14s linear infinite";
  }
}

function closeCreditsMenu() {
  creditsOverlay.style.display = "none";
  pauseOverlay.style.display = "flex";
}

function changeLanguage(lang) {
  currentLang = lang;
  const t = translations[lang];

  document.getElementById("staminaLabel").innerText = t.stamina;
  document.getElementById("pauseTitle").innerText = t.pauseTitle;
  document.getElementById("pauseSubtitle").innerText = t.pauseSubtitle;
  document.getElementById("resumeBtn").innerText = t.resume;
  document.getElementById("commMenuBtn").innerText = t.comm;
  document.getElementById("callCreatorBtn").innerText = t.callCreator;
  document.getElementById("challengeBtn").innerText = t.challenge;
  document.getElementById("optionsBtn").innerText = t.options;
  document.getElementById("creditsBtn").innerText = t.credits;
  document.getElementById("quitBtn").innerText = t.quit;
  document.getElementById("optionsTitle").innerText = t.optionsTitle;
  document.getElementById("optionsSubtitle").innerText = t.optionsSubtitle;
  document.getElementById("langLabel").innerText = t.langLabel;
  document.getElementById("volumeLabel").innerHTML = `${t.volLabel} (<span id="volVal">${Math.round(masterVolume * 100)}%</span>):`;
  document.getElementById("displayLabel").innerText = t.displayLabel;
  document.getElementById("backOptionsBtn").innerText = t.back;

  hudPauseBtn.innerText = isPaused ? t.resumeHud : t.pause;
  if (!isOnlineMode && !isSwimTestMode && !isOceanMode) {
    modeDisplay.innerText = isChallengeMode ? t.modeRace : t.modeFree;
  }
  updateDisplayButtonText();
}

function changeVolume(val) {
  masterVolume = parseFloat(val);
  masterGain.gain.setValueAtTime(masterVolume, audioCtx.currentTime);
  document.getElementById("volVal").innerText = `${Math.round(masterVolume * 100)}%`;
  playSplashSound(220, 0.08);
}

function toggleDisplayMode() {
  if (!document.fullscreenElement) {
    gameContainer.requestFullscreen().catch(() => {});
  } else {
    document.exitFullscreen().catch(() => {});
  }
}

document.addEventListener("fullscreenchange", updateDisplayButtonText);

function updateDisplayButtonText() {
  const t = translations[currentLang];
  if (document.fullscreenElement) {
    displayToggleBtn.innerText = t.windowed;
  } else {
    displayToggleBtn.innerText = t.fullscreen;
  }
}

// Swim Test Mode Controller
function startSwimTest() {
  isSwimTestMode = true;
  isChallengeMode = false;
  isOnlineMode = false;
  isOceanMode = false;
  isPaused = false;

  pauseOverlay.style.display = "none";
  debugOverlay.style.display = "none";
  callOverlay.style.display = "none";
  commOverlay.style.display = "none";
  optionsOverlay.style.display = "none";
  avatarOverlay.style.display = "none";
  creditsOverlay.style.display = "none";

  currentTestStage = 0;
  loadSwimTestStage(currentTestStage);
}

function loadSwimTestStage(stageIndex) {
  currentTestStage = stageIndex;
  testSecondsRemaining = swimTestStages[stageIndex];
  raceOutcome = null;

  swimmer.x = 60;
  swimmer.y = 240;
  swimmer.angle = 0;
  swimmer.vx = 0;
  swimmer.vy = 0;
  swimmer.stamina = swimmer.maxStamina;

  hudPauseBtn.innerText = translations[currentLang].pause;
  modeDisplay.innerText = `SWIM TEST: STAGE ${stageIndex + 1}/5 (${swimTestStages[stageIndex]}s)`;

  startSwimTestTicker();
}

function startSwimTestTicker() {
  stopSwimTestTicker();
  testTimerInterval = setInterval(() => {
    if (isPaused || isQuit || !isSwimTestMode || raceOutcome) return;

    testSecondsRemaining--;

    playTickSound(testSecondsRemaining <= 3);

    if (testSecondsRemaining <= 0) {
      testSecondsRemaining = 0;
      raceOutcome = "test_fail";
      stopSwimTestTicker();
    }
  }, 1000);
}

function stopSwimTestTicker() {
  if (testTimerInterval) {
    clearInterval(testTimerInterval);
    testTimerInterval = null;
  }
}

// Challenge Mode
function startChallengeMode() {
  stopSwimTestTicker();
  isChallengeMode = true;
  isOnlineMode = false;
  isSwimTestMode = false;
  isOceanMode = false;
  isPaused = false;
  pauseOverlay.style.display = "none";
  debugOverlay.style.display = "none";
  callOverlay.style.display = "none";
  commOverlay.style.display = "none";
  optionsOverlay.style.display = "none";
  avatarOverlay.style.display = "none";
  creditsOverlay.style.display = "none";

  const t = translations[currentLang];
  hudPauseBtn.innerText = t.pause;
  modeDisplay.innerText = t.modeRace;
  raceOutcome = null;

  swimmer.x = 60;
  swimmer.y = 360;
  swimmer.angle = 0;
  swimmer.vx = 0;
  swimmer.vy = 0;
  swimmer.stamina = swimmer.maxStamina;

  aiSwimmer.x = 60;
  aiSwimmer.y = 120;
  aiSwimmer.vx = 0;
  aiSwimmer.vy = 0;
  aiSwimmer.speed = 2.4 + Math.random() * 0.4;
}

// Quit Game
function quitGame() {
  stopSwimTestTicker();
  isQuit = true;
  isPaused = true;
  pauseOverlay.style.display = "none";
  debugOverlay.style.display = "none";
  callOverlay.style.display = "none";
  commOverlay.style.display = "none";
  optionsOverlay.style.display = "none";
  avatarOverlay.style.display = "none";
  onlineOverlay.style.display = "none";
  creditsOverlay.style.display = "none";
  quitOverlay.style.display = "flex";
  window.close();
}

// Kicking & Strokes
function performLegKick() {
  if (debugFreezeEntities) return;
  if (swimmer.stamina < 5) return;

  swimmer.stamina -= isRecordingActive ? 2 : 6;
  swimmer.isKicking = true;

  const boostMult = isRecordingActive ? 3.5 : 1.0;
  const forwardX = Math.cos(swimmer.angle);
  const forwardY = Math.sin(swimmer.angle);

  swimmer.vx += forwardX * (1.8 * boostMult);
  if (!isChallengeMode && !isOnlineMode && !isSwimTestMode) {
    swimmer.vy += forwardY * (1.8 * boostMult);
  }

  playSplashSound(isRecordingActive ? 280 : 140, 0.12);

  const feetX = swimmer.x - forwardX * 30;
  const feetY = swimmer.y - forwardY * 30;
  createBubbleCluster(feetX, feetY, isRecordingActive ? 12 : 5);
}

function performArmStroke(direction = 1) {
  if (debugFreezeEntities) return;
  if (swimmer.stamina < 8) return;

  swimmer.stamina -= isRecordingActive ? 3 : 9;
  swimmer.armRotationSpeed += direction * (isRecordingActive ? 1.2 : 0.45);

  const boostMult = isRecordingActive ? 3.5 : 1.0;
  const forwardX = Math.cos(swimmer.angle);
  const forwardY = Math.sin(swimmer.angle);

  swimmer.vx += forwardX * (direction * 2.3 * boostMult);
  if (!isChallengeMode && !isOnlineMode && !isSwimTestMode) {
    swimmer.vy += forwardY * (direction * 2.3 * boostMult);
  }

  playSplashSound(isRecordingActive ? 420 : 220, 0.18);
  createRipple(swimmer.x, swimmer.y);
}

function createBubbleCluster(x, y, count) {
  for (let i = 0; i < count; i++) {
    bubbles.push({
      x: x + (Math.random() - 0.5) * 16,
      y: y + (Math.random() - 0.5) * 16,
      radius: 2 + Math.random() * 3,
      alpha: 0.8,
      vx: (Math.random() - 0.5) * 0.8,
      vy: (Math.random() - 0.5) * 0.8
    });
  }
}

function createRipple(x, y) {
  ripples.push({
    x: x,
    y: y,
    radius: 8,
    maxRadius: isRecordingActive ? 55 : 36,
    alpha: 0.6
  });
}

// --- UPDATE LOOP ---
function update() {
  if (isPaused || isQuit) return;

  const t = translations[currentLang];
  swimmer.maxSpeed = isRecordingActive ? MEGA_MAX_SPEED : NORMAL_MAX_SPEED;

  if (swimmer.stamina < swimmer.maxStamina) {
    swimmer.stamina = Math.min(swimmer.maxStamina, swimmer.stamina + (isRecordingActive ? 0.6 : 0.18));
  }
  staminaFill.style.width = `${(swimmer.stamina / swimmer.maxStamina) * 100}%`;

  if (localSpeechBubble.timer > 0) localSpeechBubble.timer--;
  if (remoteSpeechBubble.timer > 0) remoteSpeechBubble.timer--;

  // Swim Test Completion Check
  if (isSwimTestMode && !raceOutcome) {
    if (swimmer.x >= 640) {
      if (currentTestStage < 4) {
        loadSwimTestStage(currentTestStage + 1);
      } else {
        raceOutcome = "test_win";
        stopSwimTestTicker();
        setTimeout(() => {
          openCreditsMenu("🏆 SWIM TEST PASSED! CONGRATULATIONS!");
        }, 1200);
      }
    }
  }

  // Update Ocean Creatures (Ocean Mode)
  if (isOceanMode && !debugFreezeEntities) {
    oceanCreatures.forEach(c => {
      c.x += c.vx || 0;
      c.y += c.vy || 0;

      if (c.type === "fish") {
        if (c.x < -30) c.x = canvas.width + 30;
        if (c.x > canvas.width + 30) c.x = -30;
      } else if (c.type === "turtle") {
        c.paddleAngle += 0.05;
        if (c.x < -40) c.x = canvas.width + 40;
        if (c.x > canvas.width + 40) c.x = -40;
      } else if (c.type === "jellyfish") {
        c.pulse += 0.04;
        c.y += Math.sin(c.pulse) * 0.5;
        if (c.y < -30) c.y = canvas.height + 20;
      }
    });
  }

  if (!debugFreezeEntities) {
    const boostMult = isRecordingActive ? 2.5 : 1.0;

    if (isChallengeMode || isOnlineMode || isSwimTestMode) {
      swimmer.angle = 0;
      swimmer.vy = 0;

      if (isChallengeMode && !raceOutcome) {
        aiSwimmer.x += aiSwimmer.speed;
        aiSwimmer.leftArmAngle += 0.22;
        aiSwimmer.rightArmAngle += 0.22;
        aiSwimmer.kickCycle += 0.28;

        if (Math.random() < 0.12) {
          createBubbleCluster(aiSwimmer.x - 28, aiSwimmer.y, 2);
        }
      }

      if (!raceOutcome && !isSwimTestMode) {
        if (swimmer.x >= 640) {
          raceOutcome = "win";
          if (isChallengeMode) {
            registerAIWin(); // Increment and save AI win progress
          }
        } else if (isChallengeMode && aiSwimmer.x >= 640) {
          raceOutcome = "lose";
        } else if (isOnlineMode && remoteSwimmer.x >= 640) {
          raceOutcome = "lose";
        }
      }
    } else {
      if (keys["a"]) swimmer.angle -= 0.055 * (isRecordingActive ? 1.4 : 1.0);
      if (keys["d"]) swimmer.angle += 0.055 * (isRecordingActive ? 1.4 : 1.0);
      if (keys["w"]) {
        swimmer.vx += Math.cos(swimmer.angle) * 0.2 * boostMult;
        swimmer.vy += Math.sin(swimmer.angle) * 0.2 * boostMult;
      }
      if (keys["s"]) {
        swimmer.vx -= Math.cos(swimmer.angle) * 0.1 * boostMult;
        swimmer.vy -= Math.sin(swimmer.angle) * 0.1 * boostMult;
      }
    }

    swimmer.vx *= swimmer.drag;
    swimmer.vy *= swimmer.drag;

    const currentSpeed = Math.hypot(swimmer.vx, swimmer.vy);
    if (currentSpeed > swimmer.maxSpeed) {
      swimmer.vx = (swimmer.vx / currentSpeed) * swimmer.maxSpeed;
      swimmer.vy = (swimmer.vy / currentSpeed) * swimmer.maxSpeed;
    }

    swimmer.x += swimmer.vx;
    swimmer.y += swimmer.vy;
  }

  if (isChallengeMode) {
    swimmer.x = Math.max(30, Math.min(650, swimmer.x));
    swimmer.y = 360;
  } else if (isOnlineMode) {
    swimmer.x = Math.max(30, Math.min(650, swimmer.x));
    swimmer.y = isHost ? 360 : 120;
  } else if (isSwimTestMode) {
    swimmer.x = Math.max(30, Math.min(650, swimmer.x));
    swimmer.y = 240;
  } else {
    // Screen Wrap in Ocean Mode, Wall Clamping in Free Roam
    if (isOceanMode) {
      if (swimmer.x < 0) swimmer.x = canvas.width;
      if (swimmer.x > canvas.width) swimmer.x = 0;
      if (swimmer.y < 40) swimmer.y = 40;
      if (swimmer.y > canvas.height - 30) swimmer.y = canvas.height - 30;
    } else {
      swimmer.x = Math.max(30, Math.min(canvas.width - 30, swimmer.x));
      swimmer.y = Math.max(30, Math.min(canvas.height - 30, swimmer.y));
    }
  }

  if (!debugFreezeEntities) {
    swimmer.leftArmAngle += swimmer.armRotationSpeed;
    swimmer.rightArmAngle += swimmer.armRotationSpeed;
    swimmer.armRotationSpeed *= 0.93;

    const currentSpeed = Math.hypot(swimmer.vx, swimmer.vy);
    if (swimmer.isKicking || currentSpeed > 0.6) {
      swimmer.kickCycle += isRecordingActive ? 0.6 : 0.25;
      if (Math.random() < (isRecordingActive ? 0.6 : 0.15)) {
        const feetX = swimmer.x - Math.cos(swimmer.angle) * 28;
        const feetY = swimmer.y - Math.sin(swimmer.angle) * 28;
        createBubbleCluster(feetX, feetY, isRecordingActive ? 4 : 1);

        if (isRecordingActive) {
          flameParticles.push({
            x: feetX + (Math.random() - 0.5) * 8,
            y: feetY + (Math.random() - 0.5) * 8,
            radius: 4 + Math.random() * 6,
            alpha: 1.0,
            color: Math.random() > 0.5 ? "#f59e0b" : "#ef4444"
          });
        }
      }
    }
  }

  if (isOnlineMode && peerConnection && peerConnection.open) {
    peerConnection.send({
      type: 'sync',
      x: swimmer.x,
      y: swimmer.y,
      angle: swimmer.angle,
      leftArmAngle: swimmer.leftArmAngle,
      rightArmAngle: swimmer.rightArmAngle,
      kickCycle: swimmer.kickCycle,
      isKicking: swimmer.isKicking,
      config: avatarConfig
    });
  }

  for (let i = bubbles.length - 1; i >= 0; i--) {
    const b = bubbles[i];
    b.x += b.vx;
    b.y += b.vy;
    b.alpha -= 0.015;
    if (b.alpha <= 0) bubbles.splice(i, 1);
  }

  for (let i = flameParticles.length - 1; i >= 0; i--) {
    const p = flameParticles[i];
    p.alpha -= 0.04;
    p.radius *= 0.95;
    if (p.alpha <= 0) flameParticles.splice(i, 1);
  }

  for (let i = ripples.length - 1; i >= 0; i--) {
    const r = ripples[i];
    r.radius += isRecordingActive ? 1.8 : 0.8;
    r.alpha -= 0.02;
    if (r.alpha <= 0 || r.radius >= r.maxRadius) ripples.splice(i, 1);
  }

  const currentSpeed = Math.hypot(swimmer.vx, swimmer.vy);
  speedDisplay.innerText = `${t.speed} ${(currentSpeed * 2.2).toFixed(1)} KTS`;
}

// --- RENDER LOOP ---
function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (isOceanMode) {
    // 🌊 Deep Ocean Gradient Background
    const oceanGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    oceanGrad.addColorStop(0, "#0369a1");
    oceanGrad.addColorStop(0.5, "#075985");
    oceanGrad.addColorStop(1, "#082f49");
    ctx.fillStyle = oceanGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Ocean Sun Rays
    ctx.fillStyle = "rgba(255, 255, 255, 0.06)";
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(80 + i * 140, 0);
      ctx.lineTo(130 + i * 140, 0);
      ctx.lineTo(220 + i * 140, canvas.height);
      ctx.lineTo(170 + i * 140, canvas.height);
      ctx.fill();
    }

    // Render Ocean Wildlife
    oceanCreatures.forEach(c => {
      ctx.save();
      if (c.type === "fish") {
        ctx.fillStyle = c.color;
        ctx.beginPath();
        ctx.ellipse(c.x, c.y, c.size * 1.5, c.size * 0.7, c.vx > 0 ? 0 : Math.PI, 0, Math.PI * 2);
        ctx.fill();
        // Tail
        ctx.beginPath();
        const tailX = c.vx > 0 ? c.x - c.size * 1.4 : c.x + c.size * 1.4;
        ctx.moveTo(tailX, c.y);
        ctx.lineTo(c.vx > 0 ? tailX - 6 : tailX + 6, c.y - 4);
        ctx.lineTo(c.vx > 0 ? tailX - 6 : tailX + 6, c.y + 4);
        ctx.fill();
      } else if (c.type === "turtle") {
        ctx.fillStyle = "#15803d";
        ctx.beginPath();
        ctx.ellipse(c.x, c.y, c.size, c.size * 0.75, c.vx > 0 ? 0 : Math.PI, 0, Math.PI * 2);
        ctx.fill();
        // Shell rim
        ctx.strokeStyle = "#166534";
        ctx.lineWidth = 2;
        ctx.stroke();
        // Head
        ctx.fillStyle = "#22c55e";
        ctx.beginPath();
        ctx.arc(c.vx > 0 ? c.x + c.size * 1.2 : c.x - c.size * 1.2, c.y, 5, 0, Math.PI * 2);
        ctx.fill();
      } else if (c.type === "jellyfish") {
        ctx.fillStyle = "rgba(192, 132, 252, 0.4)";
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.size, Math.PI, 0);
        ctx.fill();
        ctx.strokeStyle = "#c084fc";
        ctx.lineWidth = 1.5;
        for (let t = -6; t <= 6; t += 4) {
          ctx.beginPath();
          ctx.moveTo(c.x + t, c.y);
          ctx.quadraticCurveTo(c.x + t + Math.sin(c.pulse) * 4, c.y + 12, c.x + t, c.y + 18);
          ctx.stroke();
        }
      }
      ctx.restore();
    });

  } else if (isChallengeMode || isOnlineMode || isSwimTestMode) {
    if (isChallengeMode || isOnlineMode) {
      ctx.fillStyle = "rgba(15, 23, 42, 0.4)";
      ctx.fillRect(0, 0, canvas.width, 240);

      ctx.fillStyle = "#ef4444";
      ctx.fillRect(0, 236, canvas.width, 8);
      ctx.strokeStyle = "#ffffff";
      ctx.setLineDash([10, 10]);
      ctx.strokeRect(0, 236, canvas.width, 8);
      ctx.setLineDash([]);
    }

    ctx.strokeStyle = "#facc15";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(640, 0);
    ctx.lineTo(640, canvas.height);
    ctx.stroke();

    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.font = "bold 16px monospace";

    if (isSwimTestMode) {
      ctx.fillStyle = testSecondsRemaining <= 3 ? "#ef4444" : (testSecondsRemaining <= 6 ? "#f59e0b" : "#fef08a");
      ctx.font = "bold 20px monospace";
      ctx.fillText(`⏱️ STAGE ${currentTestStage + 1}/5 | TIME: ${testSecondsRemaining}s`, 30, 45);
    } else if (isOnlineMode) {
      const rivalTag = isConnectedToLeastRecentRival() ? "OLD RIVAL" : "FAMILY/FRIEND";
      ctx.fillText(isHost ? `LANE 1: ${rivalTag}` : `LANE 1: YOU (GUEST)`, 30, 40);
      ctx.fillText(isHost ? `LANE 2: YOU (HOST)` : `LANE 2: ${rivalTag} (HOST)`, 30, 280);
    } else {
      ctx.fillText("LANE 1: AI", 30, 40);
      ctx.fillText("LANE 2: PLAYER", 30, 280);
    }
    ctx.fillText("FINISH 🏁", 610, 30);
  } else {
    // Standard Swimming Pool
    ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
    ctx.setLineDash([12, 12]);
    ctx.lineWidth = 2;
    for (let y = 80; y < canvas.height; y += 80) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }

  // Flame particles
  flameParticles.forEach(p => {
    ctx.fillStyle = p.color;
    ctx.globalAlpha = p.alpha;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1.0;
  });

  // Ripples
  ripples.forEach((r) => {
    ctx.strokeStyle = isRecordingActive ? `rgba(250, 204, 21, ${r.alpha})` : `rgba(224, 242, 254, ${r.alpha})`;
    ctx.lineWidth = isRecordingActive ? 3 : 2;
    ctx.beginPath();
    ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
    ctx.stroke();
  });

  // Bubbles
  bubbles.forEach((b) => {
    ctx.fillStyle = `rgba(255, 255, 255, ${b.alpha})`;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
    ctx.fill();
  });

  // AI Opponent (Challenge Mode)
  if (isChallengeMode) {
    const aiConfig = {
      skin: "#f59e0b",
      hairStyle: "none",
      hairColor: "#000",
      goggles: "#000",
      eyes: "focus",
      faceFeature: "none",
      suitColor: "#ef4444"
    };
    drawCustomSwimmer(ctx, aiSwimmer.x, aiSwimmer.y, aiSwimmer.angle, aiSwimmer.leftArmAngle, aiSwimmer.rightArmAngle, aiSwimmer.kickCycle, aiConfig, "AI_OPPONENT");
  }

  // Remote Player (Online Mode)
  if (isOnlineMode && remoteSwimmer.connected) {
    drawCustomSwimmer(ctx, remoteSwimmer.x, remoteSwimmer.y, remoteSwimmer.angle, remoteSwimmer.leftArmAngle, remoteSwimmer.rightArmAngle, remoteSwimmer.kickCycle, remoteSwimmer.config, "ONLINE_PLAYER");
    if (remoteSpeechBubble.timer > 0) {
      drawSpeechBubble(ctx, remoteSwimmer.x, remoteSwimmer.y - 30, remoteSpeechBubble.text, isConnectedToLeastRecentRival() ? "#ef4444" : "#ec4899");
    }
  }

  // Local Player
  drawCustomSwimmer(ctx, swimmer.x, swimmer.y, swimmer.angle, swimmer.leftArmAngle, swimmer.rightArmAngle, swimmer.kickCycle, avatarConfig, "LOCAL_PLAYER");
  if (localSpeechBubble.timer > 0) {
    drawSpeechBubble(ctx, swimmer.x, swimmer.y - 30, localSpeechBubble.text, "#38bdf8");
  }

  // Result Banner Display
  if (raceOutcome) {
    ctx.fillStyle = "rgba(3, 32, 48, 0.92)";
    ctx.fillRect(140, 170, 440, 140);
    ctx.lineWidth = 4;

    if (raceOutcome === "test_fail") {
      ctx.strokeStyle = "#ef4444";
      ctx.strokeRect(140, 170, 440, 140);

      ctx.fillStyle = "#f87171";
      ctx.font = "bold 22px monospace";
      ctx.textAlign = "center";
      ctx.fillText("❌ SWIM TEST FAILED!", 360, 220);

      ctx.fillStyle = "#e0f2fe";
      ctx.font = "12px monospace";
      ctx.fillText(`Ran out of time on Stage ${currentTestStage + 1}!`, 360, 250);
      ctx.fillText("Press P to Pause & Try Again from Stage 1", 360, 275);
      ctx.textAlign = "left";
    } else if (raceOutcome === "test_win") {
      ctx.strokeStyle = "#10b981";
      ctx.strokeRect(140, 170, 440, 140);

      ctx.fillStyle = "#34d399";
      ctx.font = "bold 22px monospace";
      ctx.textAlign = "center";
      ctx.fillText("🏆 ALL 5 STAGES COMPLETED!", 360, 225);

      ctx.fillStyle = "#fef08a";
      ctx.font = "13px monospace";
      ctx.fillText("Opening Credits Roll...", 360, 260);
      ctx.textAlign = "left";
    } else {
      ctx.strokeStyle = raceOutcome === "win" ? "#10b981" : "#ef4444";
      ctx.strokeRect(140, 170, 440, 140);

      ctx.fillStyle = raceOutcome === "win" ? "#34d399" : "#f87171";
      ctx.font = "bold 22px monospace";
      ctx.textAlign = "center";
      ctx.fillText(raceOutcome === "win" ? "🏆 YOU WIN THE RACE!" : "💀 YOU LOST THE RACE!", 360, 230);

      ctx.fillStyle = "#e0f2fe";
      ctx.font = "12px monospace";
      ctx.fillText(isChallengeMode ? `AI Wins: ${aiRaceWins}/${REQUIRED_AI_WINS} (Win 10 to unlock Ocean!)` : "Press P to Pause / Rematch", 360, 265);
      ctx.textAlign = "left";
    }
  }
}

function drawSpeechBubble(targetCtx, x, y, text, borderColor) {
  targetCtx.save();
  targetCtx.font = "bold 11px monospace";
  const metrics = targetCtx.measureText(text);
  const textWidth = metrics.width;
  const bubbleWidth = textWidth + 16;
  const bubbleHeight = 22;

  const bx = Math.max(10, Math.min(canvas.width - bubbleWidth - 10, x - bubbleWidth / 2));
  const by = Math.max(10, y);

  targetCtx.fillStyle = "rgba(15, 23, 42, 0.92)";
  targetCtx.strokeStyle = borderColor;
  targetCtx.lineWidth = 2;

  targetCtx.beginPath();
  targetCtx.roundRect(bx, by, bubbleWidth, bubbleHeight, 6);
  targetCtx.fill();
  targetCtx.stroke();

  targetCtx.fillStyle = "#f8fafc";
  targetCtx.textAlign = "center";
  targetCtx.fillText(text, bx + bubbleWidth / 2, by + 15);

  targetCtx.restore();
}

function drawCustomSwimmer(targetCtx, x, y, angle, leftArm, rightArm, kick, config, entityTag = "") {
  targetCtx.save();
  targetCtx.translate(x, y);
  targetCtx.rotate(angle);

  const leftLegOffset = Math.sin(kick) * 7;
  const rightLegOffset = -Math.sin(kick) * 7;

  targetCtx.strokeStyle = config.skin;
  targetCtx.lineWidth = 6;
  targetCtx.lineCap = "round";

  targetCtx.beginPath();
  targetCtx.moveTo(-10, -5);
  targetCtx.lineTo(-26 + leftLegOffset * 0.2, -8 + leftLegOffset);
  targetCtx.stroke();

  targetCtx.beginPath();
  targetCtx.moveTo(-10, 5);
  targetCtx.lineTo(-26 + rightLegOffset * 0.2, 8 + rightLegOffset);
  targetCtx.stroke();

  targetCtx.fillStyle = config.suitColor;
  targetCtx.fillRect(-12, -7, 14, 14);

  targetCtx.fillStyle = config.skin;
  targetCtx.beginPath();
  targetCtx.ellipse(4, 0, 14, 8, 0, 0, Math.PI * 2);
  targetCtx.fill();

  const leftArmX = Math.cos(leftArm) * 16;
  const leftArmY = Math.sin(leftArm) * 12;
  const rightArmX = Math.cos(rightArm) * 16;
  const rightArmY = Math.sin(rightArm) * 12;

  targetCtx.beginPath();
  targetCtx.moveTo(6, -8);
  targetCtx.lineTo(6 + leftArmX, -10 + leftArmY);
  targetCtx.stroke();

  targetCtx.beginPath();
  targetCtx.moveTo(6, 8);
  targetCtx.lineTo(6 + rightArmX, 10 + rightArmY);
  targetCtx.stroke();

  targetCtx.fillStyle = config.skin;
  targetCtx.beginPath();
  targetCtx.arc(16, 0, 8, 0, Math.PI * 2);
  targetCtx.fill();

  if (config.hairStyle !== "none") {
    targetCtx.fillStyle = config.hairColor;
    if (config.hairStyle === "short") {
      targetCtx.beginPath();
      targetCtx.arc(14, 0, 7.5, Math.PI * 0.5, Math.PI * 1.5);
      targetCtx.fill();
    } else if (config.hairStyle === "spiky") {
      targetCtx.beginPath();
      targetCtx.moveTo(11, -8);
      targetCtx.lineTo(7, -12);
      targetCtx.lineTo(13, -6);
      targetCtx.lineTo(8, -8);
      targetCtx.lineTo(15, -4);
      targetCtx.fill();
    } else if (config.hairStyle === "ponytail") {
      targetCtx.beginPath();
      targetCtx.arc(13, 0, 8, Math.PI * 0.4, Math.PI * 1.6);
      targetCtx.fill();
      targetCtx.beginPath();
      targetCtx.ellipse(6, 0, 6, 3, 0, 0, Math.PI * 2);
      targetCtx.fill();
    } else if (config.hairStyle === "waves") {
      targetCtx.beginPath();
      targetCtx.ellipse(10, -8, 8, 4, -0.3, 0, Math.PI * 2);
      targetCtx.ellipse(10, 8, 8, 4, 0.3, 0, Math.PI * 2);
      targetCtx.fill();
    }
  }

  if (config.faceFeature === "freckles") {
    targetCtx.fillStyle = "#78350f";
    targetCtx.fillRect(19, -4, 1.5, 1.5);
    targetCtx.fillRect(18, 0, 1.5, 1.5);
    targetCtx.fillRect(19, 4, 1.5, 1.5);
  } else if (config.faceFeature === "blush") {
    targetCtx.fillStyle = "rgba(244, 63, 94, 0.6)";
    targetCtx.beginPath();
    targetCtx.arc(18, -4, 2.5, 0, Math.PI * 2);
    targetCtx.arc(18, 4, 2.5, 0, Math.PI * 2);
    targetCtx.fill();
  } else if (config.faceFeature === "stubble") {
    targetCtx.fillStyle = "rgba(15, 23, 42, 0.5)";
    targetCtx.fillRect(20, -3, 3, 6);
  }

  targetCtx.fillStyle = "#0f172a";
  if (config.eyes === "focus") {
    targetCtx.fillRect(18, -4, 3, 2);
    targetCtx.fillRect(18, 2, 3, 2);
  } else if (config.eyes === "wide") {
    targetCtx.beginPath();
    targetCtx.arc(19, -3, 2, 0, Math.PI * 2);
    targetCtx.arc(19, 3, 2, 0, Math.PI * 2);
    targetCtx.fill();
  } else if (config.eyes === "chill") {
    targetCtx.fillRect(18, -4, 3, 1);
    targetCtx.fillRect(18, 3, 3, 1);
  } else if (config.eyes === "determined") {
    targetCtx.beginPath();
    targetCtx.moveTo(17, -5);
    targetCtx.lineTo(21, -3);
    targetCtx.moveTo(17, 5);
    targetCtx.lineTo(21, 3);
    targetCtx.stroke();
  }

  if (config.goggles !== "none") {
    targetCtx.fillStyle = "#0f172a";
    targetCtx.fillRect(15, -7, 2, 14);

    targetCtx.fillStyle = config.goggles;
    targetCtx.fillRect(17, -6, 4, 4);
    targetCtx.fillRect(17, 2, 4, 4);

    targetCtx.strokeStyle = "#ffffff";
    targetCtx.lineWidth = 1;
    targetCtx.strokeRect(17, -6, 4, 4);
    targetCtx.strokeRect(17, 2, 4, 4);
  }

  // Debug Vectors
  if (debugShowHitboxes && entityTag) {
    targetCtx.strokeStyle = "#14b8a6";
    targetCtx.lineWidth = 1.5;
    targetCtx.strokeRect(-28, -14, 52, 28);

    targetCtx.fillStyle = "#2dd4bf";
    targetCtx.font = "9px monospace";
    targetCtx.fillText(`[${entityTag}]`, -24, -18);
    targetCtx.fillText(`x:${Math.round(x)} y:${Math.round(y)}`, -24, 24);
  }

  targetCtx.restore();
}

function loop() {
  update();
  render();
  requestAnimationFrame(loop);
}

updateOceanButtonUI();
loop();