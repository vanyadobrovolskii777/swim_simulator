const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const hud = document.getElementById("hud");
const heartsDisplay = document.getElementById("heartsDisplay");
const supaFill = document.getElementById("supaFill");
const scoreDisplay = document.getElementById("scoreDisplay");
const currentLevelBadge = document.getElementById("currentLevelBadge");

const levelSelectScreen = document.getElementById("levelSelectScreen");
const comicStripOverlay = document.getElementById("comicStripOverlay");
const comicStripTitle = document.getElementById("comicStripTitle");
const panel1Bubble = document.getElementById("panel1Bubble");
const panel2Bubble = document.getElementById("panel2Bubble");
const panel3Bubble = document.getElementById("panel3Bubble");
const panel1Art = document.getElementById("panel1Art");
const panel2Art = document.getElementById("panel2Art");
const panel3Art = document.getElementById("panel3Art");

const flipOverlay = document.getElementById("flipOverlay");
const endOverlay = document.getElementById("endOverlay");
const endTitle = document.getElementById("endTitle");
const endSubtitle = document.getElementById("endSubtitle");
const nextLevelBtn = document.getElementById("nextLevelBtn");

// --- AUDIO SYNTHESIZER ---
let audioCtx = null;
function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
}

function playSound(type) {
    if (!audioCtx) return;
    try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        if (type === "bark") {
            osc.type = "sawtooth";
            osc.frequency.setValueAtTime(340, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(120, audioCtx.currentTime + 0.12);
            gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.12);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.12);
        } else if (type === "jump") {
            osc.type = "sine";
            osc.frequency.setValueAtTime(240, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(520, audioCtx.currentTime + 0.14);
            gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.14);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.14);
        } else if (type === "hit") {
            osc.type = "square";
            osc.frequency.setValueAtTime(140, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.15);
            gain.gain.setValueAtTime(0.35, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.15);
        } else if (type === "beam") {
            osc.type = "sawtooth";
            osc.frequency.setValueAtTime(550, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.45);
            gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.45);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.45);
        } else if (type === "powerup") {
            osc.type = "triangle";
            osc.frequency.setValueAtTime(400, audioCtx.currentTime);
            osc.frequency.setValueAtTime(800, audioCtx.currentTime + 0.15);
            gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.3);
        } else if (type === "win") {
            osc.type = "sine";
            osc.frequency.setValueAtTime(440, audioCtx.currentTime);
            osc.frequency.setValueAtTime(587, audioCtx.currentTime + 0.1);
            osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.2);
            gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.5);
        }
    } catch (e) {}
}

// --- GAME STATE ---
const GRAVITY = 0.55;
const GROUND_Y = 400;

let currentLevel = 1;
let score = 0;
let levelEnemiesDefeated = 0;
let levelTargetKills = 5;
let isPlaying = false;
let flipActive = false;

const dogMan = {
    x: 80,
    y: GROUND_Y - 56,
    width: 48,
    height: 56,
    vx: 0,
    vy: 0,
    speed: 5.2,
    jumpPower: -13.0,
    isGrounded: false,
    facingRight: true,
    hearts: 3,
    supaPower: 0,
    maxSupaPower: 100,
    isAttacking: false,
    attackTimer: 0,
    invulnerableTimer: 0
};

// Li'l Petey Companion State
const lilPetey = {
    x: 40,
    y: GROUND_Y - 30,
    targetX: 40,
    targetY: GROUND_Y - 30,
    facingRight: true,
    hopCycle: 0,
    dropCooldown: 300,
    speechTimer: 0,
    speechText: ""
};

const peteyBoss = {
    active: false,
    x: 600,
    y: GROUND_Y - 120,
    width: 100,
    height: 120,
    vx: -1.8,
    hearts: 10,
    maxHearts: 10,
    attackCooldown: 120
};

const bones = [];
const comicPows = [];
const enemies = [];
const beams = [];
const pickups = [];

// --- CUTSCENE SCRIPTS ---
const cutscenes = {
    1: {
        title: "CHAPTER 1: THE HOT DOG ATTACK!",
        p1Text: "Petey cloned a bunch of living hot dogs!",
        p1Art: "🌭🧪",
        p2Text: "Li'l Petey: 'Don't worry Papa, Dog Man is ready!'",
        p2Art: "🐱❤️",
        p3Text: "Dog Man: 'BARK! Time for lunch!'",
        p3Art: "🐶🦷"
    },
    2: {
        title: "CHAPTER 2: ROOFTOP RUNAWAY!",
        p1Text: "The hot dogs are jumping across the roofs!",
        p1Art: "🏢🌭",
        p2Text: "Li'l Petey: 'I'll drop bones and battery treats!'",
        p2Art: "🐱⚡",
        p3Text: "Dog Man: 'Bark Knight jump activated!'",
        p3Art: "🐶🚀"
    },
    3: {
        title: "CHAPTER 3: FLIPPY'S TELEKINESIS!",
        p1Text: "Flippy the Fish drank the super-brain juice!",
        p1Art: "🐟🧠",
        p2Text: "Li'l Petey: 'Be careful of the mind waves!'",
        p2Art: "🐱🌊",
        p3Text: "Dog Man: 'Charge up 80-HD's Supa Beam!'",
        p3Art: "🤖✨"
    },
    4: {
        title: "CHAPTER 4: THE FINAL MECHA BRAWL!",
        p1Text: "Petey built a giant Robo-Cat Mech Suit!",
        p1Art: "🤖💥",
        p2Text: "Li'l Petey: 'Papa! Please don't be evil!'",
        p2Art: "🐱🥺",
        p3Text: "Dog Man: 'SUPA BUDDIES UNITE!'",
        p3Art: "🐶👊"
    }
};

const levelConfigs = {
    1: { name: "CH. 1: HOT DOG INVASION", killsNeeded: 5, skyColor: "#38bdf8", groundColor: "#64748b", hasBoss: false },
    2: { name: "CH. 2: ROOFTOP PURSUIT", killsNeeded: 8, skyColor: "#f97316", groundColor: "#334155", hasBoss: false },
    3: { name: "CH. 3: FLIPPY'S FRENZY", killsNeeded: 10, skyColor: "#0284c7", groundColor: "#0f766e", hasBoss: false },
    4: { name: "CH. 4: MECHA-PETEY LAB", killsNeeded: 0, skyColor: "#312e81", groundColor: "#1e1b4b", hasBoss: true }
};

// --- INPUTS ---
const keys = {};
window.addEventListener("keydown", (e) => {
    keys[e.key.toLowerCase()] = true;
    keys[e.code] = true;

    if (!isPlaying || flipActive) return;

    if ((e.code === "Space" || e.key === " " || e.key.toLowerCase() === "w" || e.key === "ArrowUp") && dogMan.isGrounded) {
        dogMan.vy = dogMan.jumpPower;
        dogMan.isGrounded = false;
        playSound("jump");
    }

    if (e.key.toLowerCase() === "j" || e.key.toLowerCase() === "z" || e.code === "KeyJ" || e.code === "KeyZ") triggerDogManAttack();
    if (e.key.toLowerCase() === "k" || e.key.toLowerCase() === "x" || e.code === "KeyK" || e.code === "KeyX") tossBone();
    if (e.key.toLowerCase() === "l" || e.key.toLowerCase() === "c" || e.code === "KeyL" || e.code === "KeyC") triggerSupaBeam();
});

window.addEventListener("keyup", (e) => {
    keys[e.key.toLowerCase()] = false;
    keys[e.code] = false;
});

// --- CUTSCENE & LEVEL ROUTING ---
window.openLevelSelect = function() {
    initAudio();
    isPlaying = false;
    hud.style.display = "none";
    endOverlay.style.display = "none";
    comicStripOverlay.style.display = "none";
    levelSelectScreen.style.display = "flex";
};

window.startLevel = function(levelNum) {
    initAudio();
    currentLevel = levelNum;
    levelSelectScreen.style.display = "none";
    endOverlay.style.display = "none";
    showComicCutscene(currentLevel);
};

function showComicCutscene(lvl) {
    const cs = cutscenes[lvl] || cutscenes[1];
    comicStripTitle.innerText = cs.title;
    panel1Bubble.innerText = cs.p1Text;
    panel1Art.innerText = cs.p1Art;
    panel2Bubble.innerText = cs.p2Text;
    panel2Art.innerText = cs.p2Art;
    panel3Bubble.innerText = cs.p3Text;
    panel3Art.innerText = cs.p3Art;

    comicStripOverlay.style.display = "flex";
    playSound("win");
}

window.closeCutsceneAndStart = function() {
    initAudio();
    comicStripOverlay.style.display = "none";

    levelEnemiesDefeated = 0;
    levelTargetKills = levelConfigs[currentLevel].killsNeeded;

    dogMan.hearts = 3;
    dogMan.supaPower = 0;
    dogMan.x = 80;
    dogMan.y = GROUND_Y - dogMan.height;
    dogMan.vx = 0;
    dogMan.vy = 0;

    lilPetey.x = 40;
    lilPetey.y = GROUND_Y - 30;
    lilPetey.dropCooldown = 220;

    bones.length = 0;
    enemies.length = 0;
    beams.length = 0;
    pickups.length = 0;
    comicPows.length = 0;

    peteyBoss.active = levelConfigs[currentLevel].hasBoss;
    peteyBoss.hearts = 10;
    peteyBoss.x = 600;

    heartsDisplay.innerText = "❤️❤️❤️";
    supaFill.style.width = "0%";
    currentLevelBadge.innerText = `LVL ${currentLevel}`;
    scoreDisplay.innerText = score;

    hud.style.display = "flex";
    isPlaying = true;
    window.focus();
};

window.nextLevelAction = function() {
    if (currentLevel < 4) {
        window.startLevel(currentLevel + 1);
    } else {
        window.openLevelSelect();
    }
};

// --- ATTACK & ABILITIES ---
function triggerDogManAttack() {
    if (dogMan.isAttacking) return;
    dogMan.isAttacking = true;
    dogMan.attackTimer = 15;
    playSound("bark");

    const attackBox = {
        x: dogMan.facingRight ? dogMan.x + dogMan.width : dogMan.x - 34,
        y: dogMan.y + 8,
        width: 36,
        height: 40
    };

    spawnComicPow(attackBox.x + 8, attackBox.y, "BARK! 🐶");

    enemies.forEach(e => {
        if (checkOverlap(attackBox, e)) {
            e.hearts -= 2;
            e.vx = dogMan.facingRight ? 5 : -5;
            spawnComicPow(e.x, e.y, "POW! 💥");
            playSound("hit");
            addSupaPower(15);
            triggerLilPeteyCheer("Good job Dog Man! 👏");
        }
    });

    if (peteyBoss.active && checkOverlap(attackBox, peteyBoss)) {
        peteyBoss.hearts -= 1;
        peteyBoss.vx = dogMan.facingRight ? 4 : -4;
        spawnComicPow(peteyBoss.x, peteyBoss.y, "CHOMP! 🦷");
        playSound("hit");
        addSupaPower(20);
    }
}

function tossBone() {
    bones.push({
        x: dogMan.facingRight ? dogMan.x + dogMan.width : dogMan.x - 10,
        y: dogMan.y + 18,
        vx: dogMan.facingRight ? 8 : -8,
        vy: -2.4,
        angle: 0
    });
    playSound("bark");
}

function triggerSupaBeam() {
    if (dogMan.supaPower < dogMan.maxSupaPower) return;
    dogMan.supaPower = 0;
    supaFill.style.width = "0%";

    triggerFlipORama();

    beams.push({
        x: dogMan.facingRight ? dogMan.x + dogMan.width : dogMan.x - 780,
        y: dogMan.y - 50,
        width: 780,
        height: 140,
        duration: 35
    });

    playSound("beam");
}

function triggerFlipORama() {
    flipActive = true;
    flipOverlay.style.display = "flex";
    const animText = document.getElementById("flipAnimationText");
    let toggle = false;

    const flipInterval = setInterval(() => {
        animText.innerText = toggle ? "🐶 👊 🤖" : "🐶 💥 🐱";
        toggle = !toggle;
    }, 100);

    setTimeout(() => {
        clearInterval(flipInterval);
        flipOverlay.style.display = "none";
        flipActive = false;

        enemies.forEach(e => (e.hearts -= 4));
        if (peteyBoss.active) peteyBoss.hearts -= 3;
        triggerLilPeteyCheer("FLIP-O-RAMA POWER! ✨");
    }, 1050);
}

function triggerLilPeteyCheer(text) {
    lilPetey.speechText = text;
    lilPetey.speechTimer = 110;
}

function addSupaPower(amt) {
    dogMan.supaPower = Math.min(dogMan.maxSupaPower, dogMan.supaPower + amt);
    supaFill.style.width = `${(dogMan.supaPower / dogMan.maxSupaPower) * 100}%`;
}

function spawnComicPow(x, y, text) {
    comicPows.push({ x, y, text, alpha: 1.0, scale: 0.8 });
}

function checkOverlap(r1, r2) {
    return (
        r1.x < r2.x + r2.width &&
        r1.x + r1.width > r2.x &&
        r1.y < r2.y + r2.height &&
        r1.y + r1.height > r2.y
    );
}

let enemySpawnTimer = 70;
function spawnEnemies() {
    if (peteyBoss.active || levelEnemiesDefeated >= levelTargetKills) return;
    enemySpawnTimer--;
    if (enemySpawnTimer <= 0) {
        enemySpawnTimer = 100 + Math.random() * 60;
        enemies.push({
            x: 780,
            y: GROUND_Y - 44,
            width: 40,
            height: 44,
            vx: -(1.6 + currentLevel * 0.35),
            hearts: 2
        });
    }
}

// --- UPDATE ---
function update() {
    if (!isPlaying || flipActive) return;

    // 1. Dog Man Movement
    if (keys["a"] || keys["arrowleft"] || keys["KeyA"] || keys["ArrowLeft"]) {
        dogMan.vx = -dogMan.speed;
        dogMan.facingRight = false;
    } else if (keys["d"] || keys["arrowright"] || keys["KeyD"] || keys["ArrowRight"]) {
        dogMan.vx = dogMan.speed;
        dogMan.facingRight = true;
    } else {
        dogMan.vx *= 0.8;
    }

    dogMan.x += dogMan.vx;
    dogMan.x = Math.max(10, Math.min(canvas.width - dogMan.width - 10, dogMan.x));

    dogMan.vy += GRAVITY;
    dogMan.y += dogMan.vy;
    if (dogMan.y >= GROUND_Y - dogMan.height) {
        dogMan.y = GROUND_Y - dogMan.height;
        dogMan.vy = 0;
        dogMan.isGrounded = true;
    }

    if (dogMan.attackTimer > 0) dogMan.attackTimer--;
    else dogMan.isAttacking = false;

    if (dogMan.invulnerableTimer > 0) dogMan.invulnerableTimer--;

    // 2. Li'l Petey Follower & Drop Mechanic
    lilPetey.hopCycle += 0.08;
    const targetFollowX = dogMan.facingRight ? dogMan.x - 45 : dogMan.x + 55;
    lilPetey.x += (targetFollowX - lilPetey.x) * 0.06;
    lilPetey.y = (GROUND_Y - 34) + Math.sin(lilPetey.hopCycle) * 6;
    lilPetey.facingRight = dogMan.facingRight;

    if (lilPetey.speechTimer > 0) lilPetey.speechTimer--;

    // Drops
    lilPetey.dropCooldown--;
    if (lilPetey.dropCooldown <= 0) {
        lilPetey.dropCooldown = 280 + Math.random() * 120;
        const isHeart = dogMan.hearts < 3 && Math.random() < 0.5;
        pickups.push({
            x: lilPetey.x,
            y: GROUND_Y - 20,
            type: isHeart ? "heart" : "battery",
            pulse: 0
        });
        triggerLilPeteyCheer(isHeart ? "Here's a Heart treat! ❤️" : "Supa Battery power! ⚡");
    }

    // 3. Pickups Update
    for (let i = pickups.length - 1; i >= 0; i--) {
        const pk = pickups[i];
        pk.pulse += 0.08;

        if (checkOverlap(dogMan, { x: pk.x, y: pk.y, width: 22, height: 22 })) {
            if (pk.type === "heart" && dogMan.hearts < 3) {
                dogMan.hearts = Math.min(3, dogMan.hearts + 1);
                heartsDisplay.innerText = "❤️".repeat(dogMan.hearts);
                spawnComicPow(pk.x, pk.y, "+1 HEART! ❤️");
            } else {
                addSupaPower(35);
                spawnComicPow(pk.x, pk.y, "+35 SUPA CHARGE! ⚡");
            }
            playSound("powerup");
            pickups.splice(i, 1);
        }
    }

    // 4. Bones Projectiles
    for (let i = bones.length - 1; i >= 0; i--) {
        const b = bones[i];
        b.x += b.vx;
        b.y += b.vy;
        b.vy += 0.14;
        b.angle += 0.22;

        for (let j = enemies.length - 1; j >= 0; j--) {
            const e = enemies[j];
            if (checkOverlap({ x: b.x, y: b.y, width: 14, height: 14 }, e)) {
                e.hearts -= 1;
                spawnComicPow(e.x, e.y, "BONK! 🦴");
                playSound("hit");
                addSupaPower(10);
                bones.splice(i, 1);
                break;
            }
        }

        if (peteyBoss.active && checkOverlap({ x: b.x, y: b.y, width: 14, height: 14 }, peteyBoss)) {
            peteyBoss.hearts -= 1;
            spawnComicPow(peteyBoss.x, peteyBoss.y, "CLANG! 🦴");
            playSound("hit");
            addSupaPower(10);
            bones.splice(i, 1);
        }

        if (b.x < 0 || b.x > canvas.width || b.y > GROUND_Y) bones.splice(i, 1);
    }

    // 5. Minion Enemies
    spawnEnemies();
    for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        e.x += e.vx;

        if (checkOverlap(dogMan, e) && dogMan.invulnerableTimer === 0) {
            dogMan.hearts--;
            dogMan.invulnerableTimer = 60;
            dogMan.vy = -5;
            dogMan.vx = dogMan.facingRight ? -4 : 4;
            heartsDisplay.innerText = "❤️".repeat(Math.max(0, dogMan.hearts));
            playSound("hit");

            if (dogMan.hearts <= 0) triggerEndScreen(false);
        }

        if (e.hearts <= 0) {
            score += 100;
            levelEnemiesDefeated++;
            scoreDisplay.innerText = score;
            spawnComicPow(e.x, e.y, "SPLAT! 🌭");
            enemies.splice(i, 1);

            if (!peteyBoss.active && levelEnemiesDefeated >= levelTargetKills && enemies.length === 0) {
                triggerEndScreen(true);
            }
        }
    }

    // 6. Boss Logic
    if (peteyBoss.active) {
        peteyBoss.x += peteyBoss.vx;
        if (peteyBoss.x < 140 || peteyBoss.x > 630) peteyBoss.vx *= -1;

        peteyBoss.attackCooldown--;
        if (peteyBoss.attackCooldown <= 0) {
            peteyBoss.attackCooldown = 120;
            peteyBoss.vx = (dogMan.x - peteyBoss.x) * 0.045;
            spawnComicPow(peteyBoss.x, peteyBoss.y - 20, "ROBO-SLAM! ⚡");
            playSound("beam");
        }

        if (checkOverlap(dogMan, peteyBoss) && dogMan.invulnerableTimer === 0) {
            dogMan.hearts--;
            dogMan.invulnerableTimer = 60;
            heartsDisplay.innerText = "❤️".repeat(Math.max(0, dogMan.hearts));
            playSound("hit");
            if (dogMan.hearts <= 0) triggerEndScreen(false);
        }

        if (peteyBoss.hearts <= 0) {
            peteyBoss.active = false;
            score += 1000;
            scoreDisplay.innerText = score;
            triggerEndScreen(true);
        }
    }

    // 7. Beams
    for (let i = beams.length - 1; i >= 0; i--) {
        beams[i].duration--;
        if (beams[i].duration <= 0) beams.splice(i, 1);
    }

    // 8. Comic POW Fades
    for (let i = comicPows.length - 1; i >= 0; i--) {
        const cp = comicPows[i];
        cp.y -= 0.6;
        cp.alpha -= 0.03;
        cp.scale += 0.02;
        if (cp.alpha <= 0) comicPows.splice(i, 1);
    }
}

function triggerEndScreen(win) {
    isPlaying = false;
    endOverlay.style.display = "flex";

    if (win) {
        playSound("win");
        endTitle.innerText = currentLevel === 4 ? "🏆 VICTORY! PETEY DEFEATED! 🏆" : `⭐ ${levelConfigs[currentLevel].name} COMPLETE!`;
        endTitle.style.color = "#16a34a";
        endSubtitle.innerText = currentLevel === 4 ? "You beat the game and saved the entire city!" : "Great job Supa Buddy! Onto the next chapter!";
        nextLevelBtn.style.display = currentLevel === 4 ? "none" : "inline-block";
    } else {
        endTitle.innerText = "💥 DOG MAN FELL! 💥";
        endTitle.style.color = "#ef4444";
        endSubtitle.innerText = "Take a quick nap and try this chapter again!";
        nextLevelBtn.style.display = "none";
    }
}

// --- RENDER ---
function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const cfg = levelConfigs[currentLevel] || levelConfigs[1];

    // 1. Sky & Buildings
    ctx.fillStyle = cfg.skyColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "rgba(15, 23, 42, 0.45)";
    ctx.fillRect(25, 150, 80, 250);
    ctx.fillRect(125, 100, 100, 300);
    ctx.fillRect(245, 170, 85, 230);
    ctx.fillRect(355, 120, 120, 280);
    ctx.fillRect(500, 160, 85, 240);
    ctx.fillRect(610, 90, 105, 310);

    ctx.fillStyle = "#fef08a";
    for (let x = 45; x < 710; x += 60) {
        for (let y = 170; y < 360; y += 45) {
            if ((x + y) % 2 === 0) ctx.fillRect(x, y, 16, 20);
        }
    }

    // 2. Ground
    ctx.fillStyle = cfg.groundColor;
    ctx.fillRect(0, GROUND_Y, canvas.width, canvas.height - GROUND_Y);
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, GROUND_Y, canvas.width, 6);

    // 3. Beams
    beams.forEach(bm => {
        ctx.fillStyle = "rgba(250, 204, 21, 0.85)";
        ctx.fillRect(bm.x, bm.y, bm.width, bm.height);
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 4;
        ctx.strokeRect(bm.x, bm.y, bm.width, bm.height);
    });

    // 4. Bones
    bones.forEach(b => {
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(b.angle);
        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "#0f172a";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(-10, -4, 20, 8, 4);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    });

    // 5. Pickups
    pickups.forEach(pk => {
        ctx.save();
        ctx.translate(pk.x, pk.y + Math.sin(pk.pulse) * 3);
        if (pk.type === "heart") {
            ctx.fillStyle = "#ef4444";
            ctx.font = "20px sans-serif";
            ctx.fillText("❤️", -10, 10);
        } else {
            ctx.fillStyle = "#facc15";
            ctx.font = "20px sans-serif";
            ctx.fillText("⚡", -10, 10);
        }
        ctx.restore();
    });

    // 6. Enemies
    enemies.forEach(e => drawHotDogMonster(ctx, e.x, e.y));

    // 7. Boss
    if (peteyBoss.active) drawPeteyBoss(ctx, peteyBoss.x, peteyBoss.y, peteyBoss.hearts);

    // 8. Li'l Petey
    drawLilPetey(ctx, lilPetey.x, lilPetey.y, lilPetey.facingRight);

    // 9. Dog Man
    drawDogMan(ctx, dogMan.x, dogMan.y, dogMan.facingRight, dogMan.isAttacking, dogMan.invulnerableTimer > 0);

    // 10. Li'l Petey Speech
    if (lilPetey.speechTimer > 0) {
        drawLilPeteySpeech(ctx, lilPetey.x, lilPetey.y - 25, lilPetey.speechText);
    }

    // 11. Comic POWs
    comicPows.forEach(cp => {
        ctx.save();
        ctx.globalAlpha = cp.alpha;
        ctx.translate(cp.x, cp.y);
        ctx.scale(cp.scale, cp.scale);

        ctx.fillStyle = "#fef08a";
        ctx.strokeStyle = "#0f172a";
        ctx.lineWidth = 3;
        ctx.font = "900 16px 'Comic Sans MS', cursive";
        ctx.strokeText(cp.text, 0, 0);
        ctx.fillText(cp.text, 0, 0);
        ctx.restore();
    });
}

function drawDogMan(targetCtx, x, y, facingRight, attacking, flashing) {
    if (flashing && Math.floor(Date.now() / 80) % 2 === 0) return;

    targetCtx.save();
    targetCtx.translate(x + 24, y + 28);
    if (!facingRight) targetCtx.scale(-1, 1);

    // Blue Shirt
    targetCtx.fillStyle = "#0284c7";
    targetCtx.strokeStyle = "#0f172a";
    targetCtx.lineWidth = 3;
    targetCtx.beginPath();
    targetCtx.roundRect(-15, -6, 30, 34, 6);
    targetCtx.fill();
    targetCtx.stroke();

    // Star Badge
    targetCtx.fillStyle = "#facc15";
    targetCtx.beginPath();
    targetCtx.arc(-2, 5, 5, 0, Math.PI * 2);
    targetCtx.fill();
    targetCtx.strokeStyle = "#0f172a";
    targetCtx.lineWidth = 1.5;
    targetCtx.stroke();

    // Head
    targetCtx.fillStyle = "#d97706";
    targetCtx.beginPath();
    targetCtx.arc(3, -19, 17, 0, Math.PI * 2);
    targetCtx.fill();
    targetCtx.stroke();

    // Eye Patch
    targetCtx.fillStyle = "#b45309";
    targetCtx.beginPath();
    targetCtx.ellipse(10, -21, 8, 10, 0.3, 0, Math.PI * 2);
    targetCtx.fill();

    // Snout
    targetCtx.fillStyle = "#fbbf24";
    targetCtx.beginPath();
    targetCtx.ellipse(15, -15, 12, 8, 0, 0, Math.PI * 2);
    targetCtx.fill();
    targetCtx.stroke();

    targetCtx.fillStyle = "#0f172a";
    targetCtx.beginPath();
    targetCtx.arc(23, -16, 4.5, 0, Math.PI * 2);
    targetCtx.fill();

    targetCtx.fillRect(4, -23, 3, 6);
    targetCtx.fillRect(11, -23, 3, 6);

    // Ears
    targetCtx.fillStyle = "#b45309";
    targetCtx.beginPath();
    targetCtx.ellipse(-11, -18, 6.5, 13, -0.35, 0, Math.PI * 2);
    targetCtx.fill();
    targetCtx.stroke();

    // Cap
    targetCtx.fillStyle = "#0369a1";
    targetCtx.beginPath();
    targetCtx.roundRect(-9, -36, 20, 11, 4);
    targetCtx.fill();
    targetCtx.stroke();

    targetCtx.fillStyle = "#0f172a";
    targetCtx.fillRect(3, -27, 15, 3.5);

    // Fist
    if (attacking) {
        targetCtx.fillStyle = "#d97706";
        targetCtx.strokeStyle = "#0f172a";
        targetCtx.lineWidth = 3;
        targetCtx.beginPath();
        targetCtx.roundRect(12, -2, 26, 12, 4);
        targetCtx.fill();
        targetCtx.stroke();
    }

    targetCtx.restore();
}

function drawLilPetey(targetCtx, x, y, facingRight) {
    targetCtx.save();
    targetCtx.translate(x + 14, y + 14);
    if (!facingRight) targetCtx.scale(-1, 1);

    // Body
    targetCtx.fillStyle = "#f97316";
    targetCtx.strokeStyle = "#0f172a";
    targetCtx.lineWidth = 2.5;
    targetCtx.beginPath();
    targetCtx.roundRect(-8, 2, 16, 14, 5);
    targetCtx.fill();
    targetCtx.stroke();

    // Head
    targetCtx.beginPath();
    targetCtx.arc(0, -6, 11, 0, Math.PI * 2);
    targetCtx.fill();
    targetCtx.stroke();

    // Ears
    targetCtx.beginPath();
    targetCtx.moveTo(-8, -12);
    targetCtx.lineTo(-12, -20);
    targetCtx.lineTo(-4, -15);
    targetCtx.moveTo(4, -15);
    targetCtx.lineTo(12, -20);
    targetCtx.lineTo(8, -12);
    targetCtx.fill();
    targetCtx.stroke();

    // Eyes & Smile
    targetCtx.fillStyle = "#0f172a";
    targetCtx.beginPath();
    targetCtx.arc(-4, -6, 2.5, 0, Math.PI * 2);
    targetCtx.arc(4, -6, 2.5, 0, Math.PI * 2);
    targetCtx.fill();

    targetCtx.beginPath();
    targetCtx.arc(0, -2, 4, 0, Math.PI);
    targetCtx.stroke();

    targetCtx.restore();
}

function drawLilPeteySpeech(targetCtx, x, y, text) {
    targetCtx.save();
    targetCtx.font = "bold 11px 'Comic Sans MS', cursive";
    const textWidth = targetCtx.measureText(text).width;
    const bubbleWidth = textWidth + 14;

    targetCtx.fillStyle = "#ffffff";
    targetCtx.strokeStyle = "#0f172a";
    targetCtx.lineWidth = 2;
    targetCtx.beginPath();
    targetCtx.roundRect(x - bubbleWidth / 2, y - 12, bubbleWidth, 20, 6);
    targetCtx.fill();
    targetCtx.stroke();

    targetCtx.fillStyle = "#0f172a";
    targetCtx.textAlign = "center";
    targetCtx.fillText(text, x, y + 2);
    targetCtx.restore();
}

function drawHotDogMonster(targetCtx, x, y) {
    targetCtx.save();
    targetCtx.translate(x, y);

    targetCtx.fillStyle = "#f59e0b";
    targetCtx.strokeStyle = "#0f172a";
    targetCtx.lineWidth = 3;
    targetCtx.beginPath();
    targetCtx.roundRect(0, 0, 40, 44, 12);
    targetCtx.fill();
    targetCtx.stroke();

    targetCtx.fillStyle = "#ef4444";
    targetCtx.fillRect(9, 5, 22, 34);

    targetCtx.strokeStyle = "#facc15";
    targetCtx.lineWidth = 3;
    targetCtx.beginPath();
    targetCtx.moveTo(12, 10);
    targetCtx.lineTo(17, 20);
    targetCtx.lineTo(22, 10);
    targetCtx.lineTo(27, 20);
    targetCtx.stroke();

    targetCtx.fillStyle = "#0f172a";
    targetCtx.fillRect(11, 24, 4, 4);
    targetCtx.fillRect(25, 24, 4, 4);

    targetCtx.restore();
}

function drawPeteyBoss(targetCtx, x, y, hp) {
    targetCtx.save();
    targetCtx.translate(x, y);

    // HP Bar
    targetCtx.fillStyle = "#e2e8f0";
    targetCtx.fillRect(0, -24, 100, 12);
    targetCtx.fillStyle = "#ef4444";
    targetCtx.fillRect(0, -24, (hp / 10) * 100, 12);
    targetCtx.strokeStyle = "#0f172a";
    targetCtx.lineWidth = 2.5;
    targetCtx.strokeRect(0, -24, 100, 12);

    // Mech
    targetCtx.fillStyle = "#64748b";
    targetCtx.strokeStyle = "#0f172a";
    targetCtx.lineWidth = 4;
    targetCtx.beginPath();
    targetCtx.roundRect(10, 30, 80, 76, 10);
    targetCtx.fill();
    targetCtx.stroke();

    // Blinking Light
    targetCtx.fillStyle = Math.floor(Date.now() / 250) % 2 === 0 ? "#ef4444" : "#facc15";
    targetCtx.beginPath();
    targetCtx.arc(50, 68, 8, 0, Math.PI * 2);
    targetCtx.fill();
    targetCtx.stroke();

    // Head
    targetCtx.fillStyle = "#f97316";
    targetCtx.strokeStyle = "#0f172a";
    targetCtx.lineWidth = 3;
    targetCtx.beginPath();
    targetCtx.arc(50, 18, 22, 0, Math.PI * 2);
    targetCtx.fill();
    targetCtx.stroke();

    // Ears
    targetCtx.beginPath();
    targetCtx.moveTo(32, 4);
    targetCtx.lineTo(39, -10);
    targetCtx.lineTo(48, 2);
    targetCtx.moveTo(52, 2);
    targetCtx.lineTo(61, -10);
    targetCtx.lineTo(68, 4);
    targetCtx.fill();
    targetCtx.stroke();

    targetCtx.fillStyle = "#0f172a";
    targetCtx.fillRect(40, 15, 4, 5);
    targetCtx.fillRect(56, 15, 4, 5);
    targetCtx.beginPath();
    targetCtx.arc(50, 24, 8, 0, Math.PI);
    targetCtx.stroke();

    targetCtx.restore();
}

function gameLoop() {
    update();
    render();
    requestAnimationFrame(gameLoop);
}

gameLoop();