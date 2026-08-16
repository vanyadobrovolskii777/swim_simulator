import { gameState, swimmer, aiSwimmer, remoteSwimmers, particles, avatarConfig, NORMAL_MAX_SPEED, MEGA_MAX_SPEED, APP_VERSION, bossState, stageData } from './state.js';
import { translations } from './locales.js';
import { playSplashSound, playBleepSound, playChimeSound } from './audio.js';
import { broadcastPacket } from './network.js';
import { render, createBubbleCluster, createRipple } from './renderer.js';
import { registerUIListeners, updateOceanButtonUI, openCreditsMenu } from './ui.js';

const canvas = document.getElementById("swimCanvas");
const ctx = canvas.getContext("2d");
const gameContainer = document.getElementById("gameContainer");
const previewCanvas = document.getElementById("avatarPreviewCanvas");
const pCtx = previewCanvas.getContext("2d");

const staminaFill = document.getElementById("staminaFill");
const speedDisplay = document.getElementById("speedDisplay");

const versionBadge = document.getElementById("versionBadge");
if (versionBadge) versionBadge.innerText = APP_VERSION;

registerUIListeners(pCtx, previewCanvas, gameContainer, canvas);
updateOceanButtonUI();

// Spawn Initial Mushrooms
spawnStageMushrooms();

function spawnStageMushrooms() {
  stageData.mushrooms = [
    { x: 160, y: 120 },
    { x: 260, y: 340 },
    { x: 380, y: 160 }
  ];
}

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

  const boostMult = gameState.isRecordingActive ? 3.5 : (swimmer.hasMushroomPower ? 1.8 : 1.0);
  const forwardX = Math.cos(swimmer.angle);
  const forwardY = Math.sin(swimmer.angle);

  swimmer.vx += forwardX * (1.8 * boostMult);
  swimmer.vy += forwardY * (1.8 * boostMult);

  playSplashSound(gameState.isRecordingActive ? 280 : 140, 0.12);
  createBubbleCluster(swimmer.x - forwardX * 30, swimmer.y - forwardY * 30, 8);
}

function performArmStroke(direction = 1) {
  if (gameState.debugFreezeEntities || swimmer.stamina < 8) return;
  swimmer.stamina -= gameState.isRecordingActive ? 3 : 9;
  swimmer.armRotationSpeed += direction * (gameState.isRecordingActive ? 1.2 : 0.45);

  const boostMult = gameState.isRecordingActive ? 3.5 : (swimmer.hasMushroomPower ? 1.8 : 1.0);
  const forwardX = Math.cos(swimmer.angle);
  const forwardY = Math.sin(swimmer.angle);

  swimmer.vx += forwardX * (direction * 2.3 * boostMult);
  swimmer.vy += forwardY * (direction * 2.3 * boostMult);

  playSplashSound(gameState.isRecordingActive ? 420 : 220, 0.18);
  createRipple(swimmer.x, swimmer.y);
}

function update() {
  if (gameState.isPaused || gameState.isQuit) return;

  const t = translations[gameState.currentLang];
  swimmer.maxSpeed = gameState.isRecordingActive ? MEGA_MAX_SPEED : (swimmer.hasMushroomPower ? 8.5 : NORMAL_MAX_SPEED);

  if (swimmer.stamina < swimmer.maxStamina) {
    swimmer.stamina = Math.min(swimmer.maxStamina, swimmer.stamina + (gameState.isRecordingActive ? 0.6 : 0.18));
  }
  staminaFill.style.width = `${(swimmer.stamina / swimmer.maxStamina) * 100}%`;

  // Invulnerability and Mushroom Timer
  if (swimmer.invulnerableTimer > 0) swimmer.invulnerableTimer--;
  if (swimmer.hasMushroomPower) {
    swimmer.mushroomTimer--;
    if (swimmer.mushroomTimer <= 0) swimmer.hasMushroomPower = false;
  }

  // Update Moving Obstacle Walls (Stages 2, 3, 4)
  if (swimmer.stage >= 2 && swimmer.stage <= 4) {
    stageData.walls.forEach(w => {
      w.y += w.vy;
      if (w.y < w.minY || w.y > w.maxY) w.vy *= -1;

      // Check Swimmer Collision with Wall
      if (
          swimmer.x > w.x - 14 &&
          swimmer.x < w.x + w.width + 14 &&
          swimmer.y > w.y - 14 &&
          swimmer.y < w.y + w.height + 14
      ) {
        swimmer.vx = -3.5;
        swimmer.x = w.x - 20;
        playSplashSound(120, 0.2);
      }
    });
  }

  // --- STAGE 5: KRAKEN BOSS AI & ATTACK LOGIC ---
  if (swimmer.stage === 5 && !gameState.raceOutcome) {
    // 1. Target Circle Follows Swimmer
    if (!bossState.isTargetLocked) {
      bossState.targetX += (swimmer.x - bossState.targetX) * 0.05;
      bossState.targetY += (swimmer.y - bossState.targetY) * 0.05;
      bossState.attackCooldown--;

      if (bossState.attackCooldown <= 0) {
        bossState.isTargetLocked = true;
        bossState.targetLockTimer = 90; // 1.5 seconds to escape!
        playBleepSound();
      }
    } else {
      // 2. Circle is LOCKED. Count down until slam attack!
      bossState.targetLockTimer--;
      if (bossState.targetLockTimer <= 0) {
        bossState.isTargetLocked = false;
        bossState.attackCooldown = 180;
        bossState.x = bossState.targetX;
        bossState.y = bossState.targetY;
        bossState.isStunned = true;
        bossState.stunTimer = 240; // Stunned for 4 seconds
        playSplashSound(80, 0.4);

        // Check if player failed to escape circle
        const dist = Math.hypot(swimmer.x - bossState.targetX, swimmer.y - bossState.targetY);
        if (dist < bossState.circleRadius && swimmer.invulnerableTimer === 0) {
          swimmer.hearts--;
          swimmer.invulnerableTimer = 90;
          playBleepSound();
          if (swimmer.hearts <= 0) {
            gameState.raceOutcome = "boss_lose";
          }
        }
      }
    }

    // Boss Stun Recover Timer
    if (bossState.isStunned) {
      bossState.stunTimer--;
      if (bossState.stunTimer <= 0) bossState.isStunned = false;
    }

    // 3. Eating Scattered Mushrooms
    for (let i = stageData.mushrooms.length - 1; i >= 0; i--) {
      const m = stageData.mushrooms[i];
      if (Math.hypot(swimmer.x - m.x, swimmer.y - m.y) < 24) {
        stageData.mushrooms.splice(i, 1);
        swimmer.hasMushroomPower = true;
        swimmer.mushroomTimer = 360; // 6 seconds power
        playChimeSound(800);
        setTimeout(spawnStageMushrooms, 5000);
      }
    }

    // 4. Pushing Boss into the Lava Pit
    const distToBoss = Math.hypot(swimmer.x - bossState.x, swimmer.y - bossState.y);
    if (distToBoss < 45 && swimmer.hasMushroomPower) {
      bossState.x += Math.cos(swimmer.angle) * 8.5;
      bossState.y += Math.sin(swimmer.angle) * 8.5;

      if (bossState.x >= 560) {
        bossState.hearts--;
        bossState.x = 420;
        bossState.y = 240;
        bossState.isStunned = false;
        playSplashSound(350, 0.3);

        if (bossState.hearts <= 0) {
          gameState.raceOutcome = "boss_win";
          setTimeout(() => openCreditsMenu("🏆 KRAKEN BOSS DEFEATED! YOU WIN!"), 1000);
        }
      }
    }
  }

  // Movement & Steering
  if (!gameState.debugFreezeEntities) {
    const boostMult = gameState.isRecordingActive ? 2.5 : 1.0;

    if (keys["a"] || keys["arrowleft"]) swimmer.angle -= 0.055 * (gameState.isRecordingActive ? 1.4 : 1.0);
    if (keys["d"] || keys["arrowright"]) swimmer.angle += 0.055 * (gameState.isRecordingActive ? 1.4 : 1.0);
    if (keys["w"]) {
      swimmer.vx += Math.cos(swimmer.angle) * 0.2 * boostMult;
      swimmer.vy += Math.sin(swimmer.angle) * 0.2 * boostMult;
    }
    if (keys["s"]) {
      swimmer.vx -= Math.cos(swimmer.angle) * 0.1 * boostMult;
      swimmer.vy -= Math.sin(swimmer.angle) * 0.1 * boostMult;
    }

    // Stage Progression (Stages 1 -> 4 finish line triggers next stage)
    if (swimmer.stage < 5 && swimmer.x >= 640) {
      swimmer.stage++;
      swimmer.x = 60;
      swimmer.y = 240;
      swimmer.vx = 0;
      swimmer.vy = 0;
      playChimeSound(600);
    }

    // AI Catch-Up in Challenge Mode
    if (gameState.isChallengeMode) {
      aiSwimmer.x += aiSwimmer.speed;
      if (aiSwimmer.stage < 5 && aiSwimmer.x >= 640) {
        aiSwimmer.stage++;
        aiSwimmer.x = 60;
      }
    }

    swimmer.vx *= swimmer.drag;
    swimmer.vy *= swimmer.drag;
    swimmer.x += swimmer.vx;
    swimmer.y += swimmer.vy;
  }

  // Bounds
  swimmer.x = Math.max(30, Math.min(canvas.width - 30, swimmer.x));
  swimmer.y = Math.max(40, Math.min(canvas.height - 30, swimmer.y));

  // Sync P2P Packets Across 3-Player Group
  if (gameState.isOnlineMode) {
    broadcastPacket({
      type: 'sync',
      x: swimmer.x,
      y: swimmer.y,
      angle: swimmer.angle,
      leftArmAngle: swimmer.leftArmAngle,
      rightArmAngle: swimmer.rightArmAngle,
      kickCycle: swimmer.kickCycle,
      stage: swimmer.stage,
      hearts: swimmer.hearts,
      hasMushroomPower: swimmer.hasMushroomPower,
      isKicking: swimmer.isKicking,
      config: avatarConfig
    });
  }

  // Particle Updates
  for (let i = particles.bubbles.length - 1; i >= 0; i--) {
    const b = particles.bubbles[i];
    b.x += b.vx;
    b.y += b.vy;
    b.alpha -= 0.015;
    if (b.alpha <= 0) particles.bubbles.splice(i, 1);
  }

  for (let i = particles.ripples.length - 1; i >= 0; i--) {
    const r = particles.ripples[i];
    r.radius += 0.8;
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