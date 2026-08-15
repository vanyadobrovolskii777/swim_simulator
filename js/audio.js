import { gameState } from './state.js';

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const masterGain = audioCtx.createGain();
masterGain.gain.setValueAtTime(gameState.masterVolume, audioCtx.currentTime);
masterGain.connect(audioCtx.destination);

export function setAudioVolume(volume) {
    gameState.masterVolume = parseFloat(volume);
    masterGain.gain.setValueAtTime(gameState.masterVolume, audioCtx.currentTime);
}

export function playSplashSound(pitch = 180, duration = 0.15) {
    if (gameState.masterVolume <= 0) return;
    try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
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

export function playChimeSound(pitch = 600) {
    if (gameState.masterVolume <= 0) return;
    try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
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

export function playBleepSound() {
    if (gameState.masterVolume <= 0) return;
    try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
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

export function playTickSound(urgent = false) {
    if (gameState.masterVolume <= 0) return;
    try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
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

export function playPhoneRing() {
    if (gameState.masterVolume <= 0) return;
    try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
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

export function speakFilteredDialogue(spokenText) {
    if (typeof window.speechSynthesis === "undefined" || !spokenText) return;
    try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(spokenText);
        const voices = window.speechSynthesis.getVoices();
        utterance.voice = voices.find(v => v.lang.startsWith("en") && (v.name.includes("Male") || v.name.includes("David"))) || voices[0];
        utterance.rate = 1.05;
        utterance.pitch = 1.1;
        utterance.volume = gameState.masterVolume;
        window.speechSynthesis.speak(utterance);
    } catch (e) {}
}