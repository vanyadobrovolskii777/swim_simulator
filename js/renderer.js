import { gameState, particles, swimmer, aiSwimmer, remoteSwimmer, avatarConfig, localSpeechBubble, remoteSpeechBubble } from './state.js';
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
    for (let i = 0; i < 2; i++) {
        particles.oceanCreatures.push({
            type: "turtle",
            x: Math.random() * canvas.width,
            y: 120 + Math.random() * (canvas.height - 200),
            vx: (Math.random() > 0.5 ? 1 : -1) * 0.7,
            vy: (Math.random() - 0.5) * 0.2,
            size: 18,
            paddleAngle: 0
        });
    }
    for (let i = 0; i < 3; i++) {
        particles.oceanCreatures.push({
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

export function render(ctx, canvas) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (gameState.isOceanMode) {
        const oceanGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
        oceanGrad.addColorStop(0, "#0369a1");
        oceanGrad.addColorStop(0.5, "#075985");
        oceanGrad.addColorStop(1, "#082f49");
        ctx.fillStyle = oceanGrad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = "rgba(255, 255, 255, 0.06)";
        for (let i = 0; i < 5; i++) {
            ctx.beginPath();
            ctx.moveTo(80 + i * 140, 0);
            ctx.lineTo(130 + i * 140, 0);
            ctx.lineTo(220 + i * 140, canvas.height);
            ctx.lineTo(170 + i * 140, canvas.height);
            ctx.fill();
        }

        particles.oceanCreatures.forEach(c => {
            ctx.save();
            if (c.type === "fish") {
                ctx.fillStyle = c.color;
                ctx.beginPath();
                ctx.ellipse(c.x, c.y, c.size * 1.5, c.size * 0.7, c.vx > 0 ? 0 : Math.PI, 0, Math.PI * 2);
                ctx.fill();
            } else if (c.type === "turtle") {
                ctx.fillStyle = "#15803d";
                ctx.beginPath();
                ctx.ellipse(c.x, c.y, c.size, c.size * 0.75, c.vx > 0 ? 0 : Math.PI, 0, Math.PI * 2);
                ctx.fill();
            } else if (c.type === "jellyfish") {
                ctx.fillStyle = "rgba(192, 132, 252, 0.4)";
                ctx.beginPath();
                ctx.arc(c.x, c.y, c.size, Math.PI, 0);
                ctx.fill();
            }
            ctx.restore();
        });
    } else if (gameState.isChallengeMode || gameState.isOnlineMode || gameState.isSwimTestMode) {
        if (gameState.isChallengeMode || gameState.isOnlineMode) {
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

        if (gameState.isSwimTestMode) {
            ctx.fillStyle = gameState.testSecondsRemaining <= 3 ? "#ef4444" : (gameState.testSecondsRemaining <= 6 ? "#f59e0b" : "#fef08a");
            ctx.font = "bold 20px monospace";
            ctx.fillText(`⏱️ STAGE ${gameState.currentTestStage + 1}/5 | TIME: ${gameState.testSecondsRemaining}s`, 30, 45);
        } else if (gameState.isOnlineMode) {
            const rivalTag = isConnectedToLeastRecentRival() ? "OLD RIVAL" : "FAMILY/FRIEND";
            ctx.fillText(gameState.isHost ? `LANE 1: ${rivalTag}` : `LANE 1: YOU (GUEST)`, 30, 40);
            ctx.fillText(gameState.isHost ? `LANE 2: YOU (HOST)` : `LANE 2: ${rivalTag} (HOST)`, 30, 280);
        } else {
            ctx.fillText("LANE 1: AI", 30, 40);
            ctx.fillText("LANE 2: PLAYER", 30, 280);
        }
        ctx.fillText("FINISH 🏁", 610, 30);
    } else {
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

    particles.flameParticles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
    });

    particles.ripples.forEach((r) => {
        ctx.strokeStyle = gameState.isRecordingActive ? `rgba(250, 204, 21, ${r.alpha})` : `rgba(224, 242, 254, ${r.alpha})`;
        ctx.lineWidth = gameState.isRecordingActive ? 3 : 2;
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
        ctx.stroke();
    });

    particles.bubbles.forEach((b) => {
        ctx.fillStyle = `rgba(255, 255, 255, ${b.alpha})`;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx.fill();
    });

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
        drawCustomSwimmer(ctx, aiSwimmer.x, aiSwimmer.y, aiSwimmer.angle, aiSwimmer.leftArmAngle, aiSwimmer.rightArmAngle, aiSwimmer.kickCycle, aiConfig, "AI_OPPONENT");
    }

    if (gameState.isOnlineMode && remoteSwimmer.connected) {
        drawCustomSwimmer(ctx, remoteSwimmer.x, remoteSwimmer.y, remoteSwimmer.angle, remoteSwimmer.leftArmAngle, remoteSwimmer.rightArmAngle, remoteSwimmer.kickCycle, remoteSwimmer.config, "ONLINE_PLAYER");
        if (remoteSpeechBubble.timer > 0) {
            drawSpeechBubble(ctx, canvas, remoteSwimmer.x, remoteSwimmer.y - 30, remoteSpeechBubble.text, isConnectedToLeastRecentRival() ? "#ef4444" : "#ec4899");
        }
    }

    drawCustomSwimmer(ctx, swimmer.x, swimmer.y, swimmer.angle, swimmer.leftArmAngle, swimmer.rightArmAngle, swimmer.kickCycle, avatarConfig, "LOCAL_PLAYER");
    if (localSpeechBubble.timer > 0) {
        drawSpeechBubble(ctx, canvas, swimmer.x, swimmer.y - 30, localSpeechBubble.text, "#38bdf8");
    }
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

export function drawCustomSwimmer(targetCtx, x, y, angle, leftArm, rightArm, kick, config, entityTag = "") {
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

    if (gameState.debugShowHitboxes && entityTag) {
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