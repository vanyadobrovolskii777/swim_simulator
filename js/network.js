import { gameState, remoteSwimmer, avatarConfig, particles } from './state.js';
import { createBubbleCluster } from './renderer.js';
import { triggerBackgroundAlert, receiveChatMessage, updateRoomHistoryIndicator, startOnlineRace } from './ui.js';

let peer = null;
export let peerConnection = null;
export let myRoomCode = "";

// Cross-platform ICE & STUN configuration (macOS/Safari + Windows compatible)
export const peerConfig = {
    debug: 2, // PeerJS log level (2 = warnings & errors)
    config: {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            { urls: 'stun:stun3.l.google.com:19302' },
            { urls: 'stun:stun4.l.google.com:19302' },
            { urls: 'stun:stun.cloudflare.com:3478' }
        ],
        sdpSemantics: 'unified-plan',
        iceCandidatePoolSize: 10
    }
};

// Cross-tab broadcast channel for local multi-tab events
export const bugHotlineChannel = (typeof BroadcastChannel !== "undefined")
    ? new BroadcastChannel("creator_bug_hotline")
    : null;

if (bugHotlineChannel) {
    bugHotlineChannel.onmessage = (event) => {
        if (event.data?.type === "CALL_CREATOR_HELP") {
            console.log("%c[Network] BroadcastChannel received bug hotline alert.", "color: #f43f5e; font-weight: bold;");
            triggerBackgroundAlert();
        }
    };
}

export function initOnlinePeer() {
    if (peer && !peer.destroyed) {
        console.log("[Network] Peer instance already active with ID:", peer.id);
        return;
    }

    myRoomCode = Math.random().toString(36).substring(2, 6).toUpperCase();
    const peerId = `swim26-${myRoomCode.toLowerCase()}`;

    console.log(`%c[Network] Initializing Peer with ID: ${peerId}`, "color: #38bdf8; font-weight: bold;");

    const roomDisplay = document.getElementById("myRoomCodeDisplay");
    const statusDisplay = document.getElementById("onlineStatusText");

    if (roomDisplay) roomDisplay.innerText = myRoomCode;
    if (statusDisplay) statusDisplay.innerText = "Connecting to PeerJS signaling server...";

    peer = new Peer(peerId, peerConfig);

    peer.on('open', (id) => {
        console.log(`%c[Network] Registered on PeerJS cloud with ID: ${id}`, "color: #10b981; font-weight: bold;");
        if (roomDisplay) roomDisplay.innerText = myRoomCode;
        if (statusDisplay) statusDisplay.innerText = `Ready! Room [${myRoomCode}] open for connections.`;
        recordRoomVisit(myRoomCode);
    });

    peer.on('connection', (conn) => {
        console.log(`%c[Network] Incoming connection from: ${conn.peer}`, "color: #fbbf24; font-weight: bold;");
        peerConnection = conn;
        gameState.isHost = true;
        setupPeerHandlers();
    });

    peer.on('disconnected', () => {
        console.warn("[Network] Peer disconnected from signaling server. Reconnecting...");
        if (statusDisplay) statusDisplay.innerText = "⚠️ Disconnected from signaling. Reconnecting...";
        peer.reconnect();
    });

    peer.on('close', () => {
        console.warn("[Network] Peer instance closed completely.");
    });

    peer.on('error', (err) => {
        console.error("%c[Network] PeerJS Root Error:", "color: #ef4444; font-weight: bold;", err);
        if (err.type === 'unavailable-id') {
            console.warn(`[Network] ID ${peerId} taken, generating a new one...`);
            myRoomCode = Math.random().toString(36).substring(2, 6).toUpperCase();
            peer = new Peer(`swim26-${myRoomCode.toLowerCase()}`, peerConfig);
        } else if (err.type === 'peer-unavailable') {
            if (statusDisplay) statusDisplay.innerText = "❌ Room not found! Make sure Host is open in lobby.";
        } else {
            if (statusDisplay) statusDisplay.innerText = `⚠️ Error: ${err.type || err.message}`;
        }
    });
}

export function joinOnlineRoomByCode(code) {
    const targetPeerId = `swim26-${code.toLowerCase()}`;
    console.log(`%c[Network] Connecting to host: ${targetPeerId}`, "color: #38bdf8; font-weight: bold;");

    recordRoomVisit(code);
    const statusDisplay = document.getElementById("onlineStatusText");
    if (statusDisplay) statusDisplay.innerText = `Connecting to Host [${code}]...`;

    if (!peer || peer.destroyed) {
        console.log("[Network] Local peer not ready, creating before connecting...");
        initOnlinePeer();
    }

    gameState.isHost = false;
    peerConnection = peer.connect(targetPeerId, {
        reliable: true,
        serialization: 'json'
    });

    setupPeerHandlers();
}

function setupPeerHandlers() {
    if (!peerConnection) {
        console.error("[Network] setupPeerHandlers called with null connection");
        return;
    }

    const statusDisplay = document.getElementById("onlineStatusText");
    console.log(`[Network] Setting up event listeners for peer: ${peerConnection.peer}`);

    peerConnection.on('open', () => {
        console.log(`%c[Network] WebRTC DataChannel successfully OPEN with ${peerConnection.peer}!`, "color: #10b981; font-weight: bold;");
        if (statusDisplay) statusDisplay.innerText = "🎉 Connected! Launching pool...";
        remoteSwimmer.connected = true;

        const chatFeed = document.getElementById("liveChatFeed");
        if (chatFeed) chatFeed.style.display = "flex";

        // Send mutual handshake
        console.log("[Network] Sending ready_handshake to peer...");
        peerConnection.send({ type: 'ready_handshake' });

        startOnlineRace();
    });

    peerConnection.on('data', (data) => {
        if (data.type === 'ready_handshake') {
            console.log("%c[Network] Received ready_handshake from peer!", "color: #10b981;");
            remoteSwimmer.connected = true;
            if (!gameState.isOnlineMode) {
                startOnlineRace();
            }
        } else if (data.type === 'sync') {
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
            console.log("[Network] Received remote creator call signal.");
            triggerBackgroundAlert();
        } else if (data.type === 'chat_msg') {
            console.log(`[Network] Received chat message: "${data.text}"`);
            receiveChatMessage(data.text);
        }
    });

    peerConnection.on('close', () => {
        console.warn(`%c[Network] WebRTC connection closed with ${peerConnection.peer}`, "color: #f59e0b;");
        remoteSwimmer.connected = false;
        if (statusDisplay) statusDisplay.innerText = "❌ Peer disconnected.";
    });

    peerConnection.on('error', (err) => {
        console.error("%c[Network] DataConnection error:", "color: #ef4444; font-weight: bold;", err);
        if (statusDisplay) statusDisplay.innerText = "⚠️ WebRTC connection error.";
    });
}

export function recordRoomVisit(roomCode) {
    gameState.currentConnectedRoom = roomCode.toUpperCase();
    gameState.roomHistory = gameState.roomHistory.filter(c => c !== gameState.currentConnectedRoom);
    gameState.roomHistory.push(gameState.currentConnectedRoom);
    try {
        localStorage.setItem("swim_sim_room_history", JSON.stringify(gameState.roomHistory));
    } catch (e) {}
    updateRoomHistoryIndicator();
}

export function isConnectedToLeastRecentRival() {
    if (gameState.roomHistory.length < 2) return false;
    return gameState.currentConnectedRoom === gameState.roomHistory[0];
}