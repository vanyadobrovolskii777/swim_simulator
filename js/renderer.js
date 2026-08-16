import { gameState, particles, swimmer, aiSwimmer, remoteSwimmers, avatarConfig, localSpeechBubble, remoteSpeechBubble, bossState, stageData } from './state.js';
import { isConnectedToLeastRecentRival } from './network.js';

export function createBubbleCluster(x, y, count) {
    for (let i = 0; i < count; i++) {
        particles.bubbles.push({
            x: x + (Math.random() - 0.5) * 16,
            y: y + (Math.random() - 0.5) * 16,
            radius: 2 + Math.random() * 3,
            alpha: 0.8,
            vx: (Math.random() - 0.5) * 0.8,
            vy: (Math.random() - 0.5) * 0.8
        });
    }
}

export function createRipple(x, y) {
    particles.ripples.push({
        x: x,
        y: y,
        radius: 8,
        maxRadius: gameState.isRecordingActive ? 55 : 36,
        alpha: 0.6
    });
}

export function spawnOceanCreatures(canvas) {
    particles.oceanCreatures = [];
    for (let i = 0; i < 9; i++) {
        particles.oceanCreatures.push({
            type: "fish",
            x: Math.random() * canvas.width,
            y: 80 + Math.random() * (canvas.height - 140),
            vx: (Math.random() > 0.5 ? 1 : -1) * (1.2 + Math.random() * 1.5),
            vy: (Math.random() - 0.5) * 0.4,
            size: 6 + Math.random() * 4,
            color: Math.random() > 0.5 ? "#f59e0b" : "#38bdf8"
        });
    }
}

export function render(ctx, canvas) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Stage Backgrounds
    if (gameState.isOceanMode) {
        const oceanGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
        oceanGrad.addColorStop(0, "#0369a1");
        oceanGrad.addColorStop(1, "#082f49");
        ctx.fillStyle = oceanGrad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else if (swimmer.stage === 5) {
        // Stage 5: Boss Lava Arena
        ctx.fillStyle = "#1e1b4b";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Lava Zone on the right edge
        const lavaGrad = ctx.createLinearGradient(560, 0, canvas.width, 0);
        lavaGrad.addColorStop(0, "rgba(239, 68, 68, 0.4)");
        lavaGrad.addColorStop(0.3, "#f97316");
        lavaGrad.addColorStop(1, "#dc2626");
        ctx.fillStyle = lavaGrad;
        ctx.fillRect(560, 0, canvas.width - 560, canvas.height);

        ctx.fillStyle = "#fef08a";
        ctx.font = "bold 13px monospace";
        ctx.fillText("🔥 LAVA PIT 🔥", 580, 24);

        // Lava Bubbles
        if (Math.random() < 0.3) {
            particles.lavaBubbles.push({
                x: 570 + Math.random() * 140,
                y: Math.random() * canvas.height,
                radius: 3 + Math.random() * 5,
                alpha: 1
            });
        }
    } else {
        // Stages 1-4 Pool
        ctx.fillStyle = swimmer.stage > 1 ? "#0369a1" : "#0284c7";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Pool Divider Lines
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

    // 2. Render Wall Obstacles (Stages 2, 3, 4)
    if (swimmer.stage >= 2 && swimmer.stage <= 4) {
        stageData.walls.forEach(w => {
            ctx.fillStyle = "#f43f5e";
            ctx.shadowColor = "#f43f5e";
            ctx.shadowBlur = 12;
            ctx.fillRect(w.x, w.y, w.width, w.height);
            ctx.shadowBlur = 0;

            ctx.strokeStyle = "#ffe4e6";
            ctx.lineWidth = 2;
            ctx.strokeRect(w.x, w.y, w.width, w.height);
        });
    }

    // 3. Render Finish Line (Stages 1-4)
    if (swimmer.stage < 5) {
        ctx.strokeStyle = "#facc15";
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(640, 0);
        ctx.lineTo(640, canvas.height);
        ctx.stroke();

        ctx.fillStyle = "#fef08a";
        ctx.font = "bold 13px monospace";
        ctx.fillText(`STAGE ${swimmer.stage}/5 FINISH 🏁`, 480, 24);
    }

    // 4. Render Stage 5 Boss Target Circle & Boss
    if (swimmer.stage === 5) {
        // Boss Target Circle Attack
        ctx.save();
        ctx.lineWidth = bossState.isTargetLocked ? 4 : 2;
        ctx.strokeStyle = bossState.isTargetLocked ? "#ef4444" : "rgba(239, 68, 68, 0.6)";
        ctx.fillStyle = bossState.isTargetLocked ? "rgba(239, 68, 68, 0.35)" : "rgba(239, 68, 68, 0.12)";
        ctx.beginPath();
        ctx.arc(bossState.targetX, bossState.targetY, bossState.circleRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        if (bossState.isTargetLocked) {
            ctx.fillStyle = "#fecaca";
            ctx.font = "bold 12px monospace";
            ctx.textAlign = "center";
            ctx.fillText("⚠️ DANGER! GET OUT! ⚠️", bossState.targetX, bossState.targetY - bossState.circleRadius - 6);
        }
        ctx.restore();

        // Scattered Power-Up Mushrooms
        stageData.mushrooms.forEach(m => {
            ctx.save();
            // Stem
            ctx.fillStyle = "#f1f5f9";
            ctx.fillRect(m.x - 3, m.y, 6, 8);
            // Cap
            ctx.fillStyle = "#eab308";
            ctx.beginPath();
            ctx.arc(m.x, m.y, 9, Math.PI, 0);
            ctx.fill();
            // Spots
            ctx.fillStyle = "#ffffff";
            ctx.beginPath();
            ctx.arc(m.x - 4, m.y - 4, 2, 0, Math.PI * 2);
            ctx.arc(m.x + 4, m.y - 4, 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });

        // Render Boss (Kraken)
        drawKrakenBoss(ctx);
    }

    // 5. Draw Particles & Lava Bubbles
    for (let i = particles.lavaBubbles.length - 1; i >= 0; i--) {
        const lb = particles.lavaBubbles[i];
        ctx.fillStyle = `rgba(254, 240, 138, ${lb.alpha})`;
        ctx.beginPath();
        ctx.arc(lb.x, lb.y, lb.radius, 0, Math.PI * 2);
        ctx.fill();
        lb.y -= 0.8;
        lb.alpha -= 0.02;
        if (lb.alpha <= 0) particles.lavaBubbles.splice(i, 1);
    }

    particles.ripples.forEach(r => {
        ctx.strokeStyle = `rgba(224, 242, 254, ${r.alpha})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
        ctx.stroke();
    });

    particles.bubbles.forEach(b => {
        ctx.fillStyle = `rgba(255, 255, 255, ${b.alpha})`;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx.fill();
    });

    // 6. Draw AI Swimmer (Challenge Mode)
    if (gameState.isChallengeMode) {
        const aiConfig = {
            skin: "#f59e0b",
            hairStyle: "none",
            hairColor: "#000",
            goggles: "#000",
            eyes: "focus",
            faceFeature: "none",
            suitColor: "#ef4444"
        };
        drawCustomSwimmer(ctx, aiSwimmer.x, aiSwimmer.y, aiSwimmer.angle, aiSwimmer.leftArmAngle, aiSwimmer.rightArmAngle, aiSwimmer.kickCycle, aiConfig, `AI (Stage ${aiSwimmer.stage})`);
    }

    // 7. Draw 3-Player Swimmers (Online Mode)
    if (gameState.isOnlineMode) {
        if (remoteSwimmers.peer1.connected) {
            drawCustomSwimmer(ctx, remoteSwimmers.peer1.x, remoteSwimmers.peer1.y, remoteSwimmers.peer1.angle, remoteSwimmers.peer1.leftArmAngle, remoteSwimmers.peer1.rightArmAngle, remoteSwimmers.peer1.kickCycle, remoteSwimmers.peer1.config, `P2 (Stage ${remoteSwimmers.peer1.stage})`, remoteSwimmers.peer1.hasMushroomPower);
        }
        if (remoteSwimmers.peer2.connected) {
            drawCustomSwimmer(ctx, remoteSwimmers.peer2.x, remoteSwimmers.peer2.y, remoteSwimmers.peer2.angle, remoteSwimmers.peer2.leftArmAngle, remoteSwimmers.peer2.rightArmAngle, remoteSwimmers.peer2.kickCycle, remoteSwimmers.peer2.config, `P3 (Stage ${remoteSwimmers.peer2.stage})`, remoteSwimmers.peer2.hasMushroomPower);
        }
    }

    // 8. Draw Local Swimmer
    drawCustomSwimmer(ctx, swimmer.x, swimmer.y, swimmer.angle, swimmer.leftArmAngle, swimmer.rightArmAngle, swimmer.kickCycle, avatarConfig, `YOU (Stage ${swimmer.stage})`, swimmer.hasMushroomPower);

    // 9. Speech Bubbles
    if (localSpeechBubble.timer > 0) {
        drawSpeechBubble(ctx, canvas, swimmer.x, swimmer.y - 30, localSpeechBubble.text, "#38bdf8");
    }
    if (remoteSpeechBubble.timer > 0 && remoteSwimmers.peer1.connected) {
        drawSpeechBubble(ctx, canvas, remoteSwimmers.peer1.x, remoteSwimmers.peer1.y - 30, remoteSpeechBubble.text, "#ec4899");
    }

    // 10. HUD Overlays: Hearts & Power-up Readout
    renderHeartsHUD(ctx);
}

function renderHeartsHUD(ctx) {
    // Local Player Hearts
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 13px monospace";
    ctx.textAlign = "left";
    ctx.fillText(`STAGE ${swimmer.stage} | HEARTS: ${"❤️".repeat(Math.max(0, swimmer.hearts))}`, 18, 55);

    if (swimmer.hasMushroomPower) {
        ctx.fillStyle = "#facc15";
        ctx.fillText("🍄 MUSHROOM POWER: PUSH THE BOSS!", 18, 75);
    }

    // Boss Hearts (Stage 5)
    if (swimmer.stage === 5) {
        ctx.fillStyle = "#f87171";
        ctx.textAlign = "right";
        ctx.fillText(`BOSS HEARTS: ${"🖤".repeat(3 - bossState.hearts)}${"❤️".repeat(Math.max(0, bossState.hearts))}`, 700, 55);
        ctx.textAlign = "left";
    }
}

function drawKrakenBoss(targetCtx) {
    targetCtx.save();
    targetCtx.translate(bossState.x, bossState.y);

    // Tentacles
    bossState.tentacleAngle += 0.05;
    targetCtx.strokeStyle = bossState.isStunned ? "#a855f7" : "#7c3aed";
    targetCtx.lineWidth = 7;
    targetCtx.lineCap = "round";

    for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3;
        const wave = Math.sin(bossState.tentacleAngle + i) * 12;
        targetCtx.beginPath();
        targetCtx.moveTo(0, 0);
        targetCtx.quadraticCurveTo(Math.cos(angle) * 30 + wave, Math.sin(angle) * 30 + wave, Math.cos(angle) * 55, Math.sin(angle) * 55);
        targetCtx.stroke();
    }

    // Body
    targetCtx.fillStyle = bossState.isStunned ? "#c084fc" : "#6d28d9";
    targetCtx.beginPath();
    targetCtx.arc(0, 0, 32, 0, Math.PI * 2);
    targetCtx.fill();

    targetCtx.strokeStyle = "#4c1d95";
    targetCtx.lineWidth = 3;
    targetCtx.stroke();

    // Glowing Eyes
    targetCtx.fillStyle = bossState.isStunned ? "#facc15" : "#ef4444";
    targetCtx.beginPath();
    targetCtx.arc(-10, -6, 6, 0, Math.PI * 2);
    targetCtx.arc(10, -6, 6, 0, Math.PI * 2);
    targetCtx.fill();

    if (bossState.isStunned) {
        targetCtx.fillStyle = "#fef08a";
        targetCtx.font = "bold 11px monospace";
        targetCtx.textAlign = "center";
        targetCtx.fillText("⭐ STUNNED! PUSH HIM! ⭐", 0, -42);
    }

    targetCtx.restore();
}

export function drawSpeechBubble(targetCtx, canvas, x, y, text, borderColor) {
    targetCtx.save();
    targetCtx.font = "bold 11px monospace";
    const metrics = targetCtx.measureText(text);
    const bubbleWidth = metrics.width + 16;
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

export function drawCustomSwimmer(targetCtx, x, y, angle, leftArm, rightArm, kick, config, entityTag = "", hasPower = false) {
    targetCtx.save();
    targetCtx.translate(x, y);
    targetCtx.rotate(angle);

    const scale = hasPower ? 1.35 : 1.0;
    targetCtx.scale(scale, scale);

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

    targetCtx.fillStyle = hasPower ? "#f59e0b" : config.suitColor;
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

    if (config.goggles !== "none") {
        targetCtx.fillStyle = "#0f172a";
        targetCtx.fillRect(15, -7, 2, 14);
        targetCtx.fillStyle = config.goggles;
        targetCtx.fillRect(17, -6, 4, 4);
        targetCtx.fillRect(17, 2, 4, 4);
    }

    if (entityTag) {
        targetCtx.fillStyle = "#38bdf8";
        targetCtx.font = "bold 9px monospace";
        targetCtx.textAlign = "center";
        targetCtx.fillText(entityTag, 0, -18);
    }

    targetCtx.restore();
}