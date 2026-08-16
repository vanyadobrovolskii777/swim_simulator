import { gameState, remoteSwimmers, avatarConfig, swimmer } from './state.js';
import { createBubbleCluster } from './renderer.js';
import { triggerBackgroundAlert, receiveChatMessage, updateRoomHistoryIndicator, startOnlineRace } from './ui.js';

let peer = null;
export const activeConnections = [];
export let myRoomCode = "";

export const peerConfig = {
    debug: 2,
    config: {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            { urls: 'stun:stun3.l.google.com:19302' },
            { urls: 'stun:stun4.l.google.com:19302' },
            { urls: 'stun:stun.cloudflare.com:3478' }
        ],
        iceCandidatePoolSize: 10,
        bundlePolicy: 'max-bundle',
        sdpSemantics: 'unified-plan'
    }
};

export const bugHotlineChannel = (typeof BroadcastChannel !== "undefined")
    ? new BroadcastChannel("creator_bug_hotline")
    : null;

if (bugHotlineChannel) {
    bugHotlineChannel.onmessage = (event) => {
        if (event.data?.type === "CALL_CREATOR_HELP") {
            triggerBackgroundAlert();
        }
    };
}

export function initOnlinePeer() {
    if (peer && !peer.destroyed) return;

    myRoomCode = Math.random().toString(36).substring(2, 6).toUpperCase();
    const peerId = `swim26-${myRoomCode.toLowerCase()}`;

    const roomDisplay = document.getElementById("myRoomCodeDisplay");
    const statusDisplay = document.getElementById("onlineStatusText");

    if (roomDisplay) roomDisplay.innerText = myRoomCode;
    if (statusDisplay) statusDisplay.innerText = "Connecting to PeerJS signaling server...";

    peer = new Peer(peerId, peerConfig);

    peer.on('open', () => {
        if (roomDisplay) roomDisplay.innerText = myRoomCode;
        if (statusDisplay) statusDisplay.innerText = `Room [${myRoomCode}] Open! (Up to 3 Players)`;
        recordRoomVisit(myRoomCode);
    });

    peer.on('connection', (conn) => {
        if (activeConnections.length >= 2) {
            conn.close();
            return;
        }
        activeConnections.push(conn);
        gameState.isHost = true;
        setupPeerHandlers(conn);
    });

    peer.on('disconnected', () => peer.reconnect());

    peer.on('error', (err) => {
        if (err.type === 'unavailable-id') {
            myRoomCode = Math.random().toString(36).substring(2, 6).toUpperCase();
            peer = new Peer(`swim26-${myRoomCode.toLowerCase()}`, peerConfig);
        } else if (err.type === 'peer-unavailable') {
            if (statusDisplay) statusDisplay.innerText = "❌ Room not found! Make sure Host is in lobby.";
        }
    });
}

export function joinOnlineRoomByCode(code) {
    const targetPeerId = `swim26-${code.toLowerCase()}`;
    recordRoomVisit(code);

    const statusDisplay = document.getElementById("onlineStatusText");
    if (statusDisplay) statusDisplay.innerText = `Connecting to Room [${code}]...`;

    if (!peer || peer.destroyed) {
        initOnlinePeer();
    }

    gameState.isHost = false;
    const conn = peer.connect(targetPeerId, {
        reliable: true,
        serialization: 'json'
    });

    activeConnections.push(conn);
    setupPeerHandlers(conn);
}

function setupPeerHandlers(conn) {
    const statusDisplay = document.getElementById("onlineStatusText");

    conn.on('open', () => {
        const slotKey = remoteSwimmers.peer1.connected ? "peer2" : "peer1";
        remoteSwimmers[slotKey].connected = true;
        remoteSwimmers[slotKey].id = conn.peer;

        if (statusDisplay) {
            const count = (remoteSwimmers.peer1.connected ? 1 : 0) + (remoteSwimmers.peer2.connected ? 1 : 0) + 1;
            statusDisplay.innerText = `🎉 ${count}/3 Players Connected! Starting...`;
        }

        const chatFeed = document.getElementById("liveChatFeed");
        if (chatFeed) chatFeed.style.display = "flex";

        conn.send({ type: 'ready_handshake' });
        startOnlineRace();
    });

    conn.on('data', (data) => {
        const slot = (remoteSwimmers.peer1.id === conn.peer || !remoteSwimmers.peer1.connected) ? remoteSwimmers.peer1 : remoteSwimmers.peer2;

        if (data.type === 'ready_handshake') {
            slot.connected = true;
            slot.id = conn.peer;
            if (!gameState.isOnlineMode) {
                startOnlineRace();
            }
        } else if (data.type === 'sync') {
            slot.x = data.x;
            slot.y = data.y;
            slot.angle = data.angle;
            slot.leftArmAngle = data.leftArmAngle;
            slot.rightArmAngle = data.rightArmAngle;
            slot.kickCycle = data.kickCycle;
            slot.stage = data.stage;
            slot.hearts = data.hearts;
            slot.hasMushroomPower = data.hasMushroomPower;
            slot.config = data.config;

            if (data.isKicking) {
                createBubbleCluster(slot.x - 28, slot.y, 2);
            }
        } else if (data.type === 'call_creator') {
            triggerBackgroundAlert();
        } else if (data.type === 'chat_msg') {
            receiveChatMessage(data.text);
        }
    });

    conn.on('close', () => {
        if (remoteSwimmers.peer1.id === conn.peer) remoteSwimmers.peer1.connected = false;
        if (remoteSwimmers.peer2.id === conn.peer) remoteSwimmers.peer2.connected = false;
        const idx = activeConnections.indexOf(conn);
        if (idx !== -1) activeConnections.splice(idx, 1);
        if (statusDisplay) statusDisplay.innerText = "⚠️ A player left the race.";
    });
}

export function broadcastPacket(data) {
    activeConnections.forEach(conn => {
        if (conn.open) conn.send(data);
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