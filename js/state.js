export const APP_VERSION = "v1.2.0"; // Bump this string whenever you commit/push

export const NORMAL_MAX_SPEED = 5.2;
export const MEGA_MAX_SPEED = 18.0;
export const REQUIRED_AI_WINS = 10;
export const swimTestStages = [30, 25, 20, 15, 10];

export const gameState = {
    isPaused: false,
    isQuit: false,
    isChallengeMode: false,
    isOnlineMode: false,
    isSwimTestMode: false,
    isOceanMode: false,
    isHost: true,
    raceOutcome: null,
    currentLang: "en",
    masterVolume: 1.0,
    isRecordingActive: false,

    // Creator Debug
    debugUnlocked: false,
    debugShowHitboxes: false,
    debugFreezeEntities: false,

    // Swim Test
    currentTestStage: 0,
    testSecondsRemaining: 30,
    testTimerInterval: null,

    // Ocean Unlock Tracker
    aiRaceWins: parseInt(localStorage.getItem("swim_sim_ai_wins"), 10) || 0,

    // Room History Tracker
    currentConnectedRoom: "",
    roomHistory: JSON.parse(localStorage.getItem("swim_sim_room_history") || '["WORN", "RIVL", "FAM1"]')
};

export const avatarConfig = {
    skin: "#fcd34d",
    hairStyle: "none",
    hairColor: "#0f172a",
    goggles: "#0f172a",
    eyes: "focus",
    faceFeature: "none",
    suitColor: "#0284c7"
};

export const swimmer = {
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

export const aiSwimmer = {
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

export const remoteSwimmer = {
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

export const localSpeechBubble = { text: "", timer: 0 };
export const remoteSpeechBubble = { text: "", timer: 0 };

export const particles = {
    bubbles: [],
    ripples: [],
    flameParticles: [],
    oceanCreatures: []
};