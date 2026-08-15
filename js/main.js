import { gameState, swimmer, aiSwimmer, remoteSwimmer, particles, avatarConfig, NORMAL_MAX_SPEED, MEGA_MAX_SPEED, REQUIRED_AI_WINS, APP_VERSION } from './state.js';
import { translations } from './locales.js';
import { playSplashSound } from './audio.js';
import { peerConnection } from './network.js';
import { render, createBubbleCluster, createRipple } from './renderer.js';
import { registerUIListeners, updateOceanButtonUI, openCreditsMenu } from './ui.js';

const canvas = document.getElementById("swimCanvas");
const ctx = canvas.getContext("2d");
const gameContainer = document.getElementById("gameContainer");
const previewCanvas = document.getElementById("avatarPreviewCanvas");
const pCtx = previewCanvas.getContext("2d");

const staminaFill = document.getElementById("staminaFill");
const speedDisplay = document.getElementById("speedDisplay");

// Display App Version
const versionBadge = document.getElementById("versionBadge");
if (versionBadge) {
  versionBadge.innerText = APP_VERSION;
}

// Register DOM and UI Callbacks
registerUIListeners(pCtx, previewCanvas, gameContainer, canvas);
updateOceanButtonUI();

// Input Tracking
const keys = {};
window.addEventListener("keydown", (e) => {
  if (gameState.isQuit) return;

  if (e.key.toLowerCase() === "c" && gameState.isOnlineMode && document.getElementById("commOverlay").style.display !== "flex") {
    e.preventDefault();
    window.openCommMenu();
    return;
  }

  if (e.key === "`" || e.key === "~" || e.key === "\\") {
    gameState.debugUnlocked = !gameState.debugUnlocked;
    document.getElementById("secretDebugBtn").style.display = gameState.debugUnlocked ? "block" : "none";
    return;
  }

  if (e.key.toLowerCase() === "p" || e.key === "Escape") {
    e.preventDefault();
    window.togglePause();
    return;
  }

  if (gameState.isPaused) return;

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

function performLegKick() {
  if (gameState.debugFreezeEntities || swimmer.stamina < 5) return;
  swimmer.stamina -= gameState.isRecordingActive ? 2 : 6;
  swimmer.isKicking = true;

  const boostMult = gameState.isRecordingActive ? 3.5 : 1.0;
  const forwardX = Math.cos(swimmer.angle);
  const forwardY = Math.sin(swimmer.angle);

  // Apply kick impulse in direction facing
  swimmer.vx += forwardX * (1.8 * boostMult);
  swimmer.vy += forwardY * (1.8 * boostMult);

  playSplashSound(gameState.isRecordingActive ? 280 : 140, 0.12);
  createBubbleCluster(swimmer.x - forwardX * 30, swimmer.y - forwardY * 30, gameState.isRecordingActive ? 12 : 5);
}

function performArmStroke(direction = 1) {
  if (gameState.debugFreezeEntities || swimmer.stamina < 8) return;
  swimmer.stamina -= gameState.isRecordingActive ? 3 : 9;
  swimmer.armRotationSpeed += direction * (gameState.isRecordingActive ? 1.2 : 0.45);

  const boostMult = gameState.isRecordingActive ? 3.5 : 1.0;
  const forwardX = Math.cos(swimmer.angle);
  const forwardY = Math.sin(swimmer.angle);

  // Apply stroke propulsion along current angle
  swimmer.vx += forwardX * (direction * 2.3 * boostMult);
  swimmer.vy += forwardY * (direction * 2.3 * boostMult);

  playSplashSound(gameState.isRecordingActive ? 420 : 220, 0.18);
  createRipple(swimmer.x, swimmer.y);
}

function update() {
  if (gameState.isPaused || gameState.isQuit) return;

  const t = translations[gameState.currentLang];
  swimmer.maxSpeed = gameState.isRecordingActive ? MEGA_MAX_SPEED : NORMAL_MAX_SPEED;

  if (swimmer.stamina < swimmer.maxStamina) {
    swimmer.stamina = Math.min(swimmer.maxStamina, swimmer.stamina + (gameState.isRecordingActive ? 0.6 : 0.18));
  }
  staminaFill.style.width = `${(swimmer.stamina / swimmer.maxStamina) * 100}%`;

  // Swim Test Finish Check
  if (gameState.isSwimTestMode && !gameState.raceOutcome && swimmer.x >= 640) {
    if (gameState.currentTestStage < 4) {
      window.loadSwimTestStage(gameState.currentTestStage + 1);
    } else {
      gameState.raceOutcome = "test_win";
      window.stopSwimTestTicker();
      setTimeout(() => openCreditsMenu("🏆 SWIM TEST PASSED! CONGRATULATIONS!"), 1200);
    }
  }

  // Position & Movement Calculations (Full 360° Movement Enabled)
  if (!gameState.debugFreezeEntities) {
    const boostMult = gameState.isRecordingActive ? 2.5 : 1.0;

    // AI Logic in challenge mode
    if (gameState.isChallengeMode && !gameState.raceOutcome) {
      aiSwimmer.x += aiSwimmer.speed;
      aiSwimmer.leftArmAngle += 0.22;
      aiSwimmer.rightArmAngle += 0.22;
      aiSwimmer.kickCycle += 0.28;
    }

    // Steering & Gliding in ALL modes (WASD + Arrow Keys)
    if (keys["a"] || keys["arrowleft"]) {
      swimmer.angle -= 0.055 * (gameState.isRecordingActive ? 1.4 : 1.0);
    }
    if (keys["d"] || keys["arrowright"]) {
      swimmer.angle += 0.055 * (gameState.isRecordingActive ? 1.4 : 1.0);
    }
    if (keys["w"]) {
      swimmer.vx += Math.cos(swimmer.angle) * 0.2 * boostMult;
      swimmer.vy += Math.sin(swimmer.angle) * 0.2 * boostMult;
    }
    if (keys["s"]) {
      swimmer.vx -= Math.cos(swimmer.angle) * 0.1 * boostMult;
      swimmer.vy -= Math.sin(swimmer.angle) * 0.1 * boostMult;
    }

    // Check race finish line
    if (!gameState.raceOutcome && !gameState.isSwimTestMode) {
      if (swimmer.x >= 640) {
        gameState.raceOutcome = "win";
        if (gameState.isChallengeMode) {
          gameState.aiRaceWins++;
          localStorage.setItem("swim_sim_ai_wins", gameState.aiRaceWins.toString());
          updateOceanButtonUI();
        }
      } else if (gameState.isChallengeMode && aiSwimmer.x >= 640) {
        gameState.raceOutcome = "lose";
      } else if (gameState.isOnlineMode && remoteSwimmer.x >= 640) {
        gameState.raceOutcome = "lose";
      }
    }

    // Apply water drag and speed limits in 2D
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

  // Bounds & Lane Area Handling
  if (gameState.isChallengeMode) {
    swimmer.x = Math.max(30, Math.min(650, swimmer.x));
    swimmer.y = Math.max(250, Math.min(canvas.height - 30, swimmer.y)); // Free swim in Lane 2
  } else if (gameState.isOnlineMode) {
    swimmer.x = Math.max(30, Math.min(650, swimmer.x));
    if (gameState.isHost) {
      swimmer.y = Math.max(250, Math.min(canvas.height - 30, swimmer.y)); // Host in Lane 2
    } else {
      swimmer.y = Math.max(30, Math.min(230, swimmer.y)); // Guest in Lane 1
    }
  } else if (gameState.isSwimTestMode) {
    swimmer.x = Math.max(30, Math.min(650, swimmer.x));
    swimmer.y = Math.max(30, Math.min(canvas.height - 30, swimmer.y));
  } else {
    // Ocean and Free Roam
    if (gameState.isOceanMode) {
      if (swimmer.x < 0) swimmer.x = canvas.width;
      if (swimmer.x > canvas.width) swimmer.x = 0;
      if (swimmer.y < 40) swimmer.y = 40;
      if (swimmer.y > canvas.height - 30) swimmer.y = canvas.height - 30;
    } else {
      swimmer.x = Math.max(30, Math.min(canvas.width - 30, swimmer.x));
      swimmer.y = Math.max(30, Math.min(canvas.height - 30, swimmer.y));
    }
  }

  // Arm & Leg animation cycles
  if (!gameState.debugFreezeEntities) {
    swimmer.leftArmAngle += swimmer.armRotationSpeed;
    swimmer.rightArmAngle += swimmer.armRotationSpeed;
    swimmer.armRotationSpeed *= 0.93;

    const currentSpeed = Math.hypot(swimmer.vx, swimmer.vy);
    if (swimmer.isKicking || currentSpeed > 0.6) {
      swimmer.kickCycle += gameState.isRecordingActive ? 0.6 : 0.25;
      if (Math.random() < (gameState.isRecordingActive ? 0.6 : 0.15)) {
        const feetX = swimmer.x - Math.cos(swimmer.angle) * 28;
        const feetY = swimmer.y - Math.sin(swimmer.angle) * 28;
        createBubbleCluster(feetX, feetY, gameState.isRecordingActive ? 4 : 1);

        if (gameState.isRecordingActive) {
          particles.flameParticles.push({
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

  // Sync P2P Packets
  if (gameState.isOnlineMode && peerConnection?.open) {
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

  // Update Bubbles
  for (let i = particles.bubbles.length - 1; i >= 0; i--) {
    const b = particles.bubbles[i];
    b.x += b.vx;
    b.y += b.vy;
    b.alpha -= 0.015;
    if (b.alpha <= 0) particles.bubbles.splice(i, 1);
  }

  // Update Flame Particles
  for (let i = particles.flameParticles.length - 1; i >= 0; i--) {
    const p = particles.flameParticles[i];
    p.alpha -= 0.04;
    p.radius *= 0.95;
    if (p.alpha <= 0) particles.flameParticles.splice(i, 1);
  }

  // Update Ripples
  for (let i = particles.ripples.length - 1; i >= 0; i--) {
    const r = particles.ripples[i];
    r.radius += gameState.isRecordingActive ? 1.8 : 0.8;
    r.alpha -= 0.02;
    if (r.alpha <= 0 || r.radius >= r.maxRadius) particles.ripples.splice(i, 1);
  }

  speedDisplay.innerText = `${t.speed} ${(Math.hypot(swimmer.vx, swimmer.vy) * 2.2).toFixed(1)} KTS`;
}

function gameLoop() {
  update();
  render(ctx, canvas);
  requestAnimationFrame(gameLoop);
}

gameLoop();