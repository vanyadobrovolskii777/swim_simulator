import { gameState, remoteSwimmer, avatarConfig, particles } from './state.js';
import { createBubbleCluster } from './renderer.js';
import { triggerBackgroundAlert, receiveChatMessage, updateRoomHistoryIndicator, startOnlineRace } from './ui.js';

let peer = null;
export let peerConnection = null;
export let myRoomCode = "";

export const peerConfig = {
    config: {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            { urls: 'stun:stun3.l.google.com:19302' },
            { urls: 'stun:stun4.l.google.com:19302' }
        ]
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
    document.getElementById("myRoomCodeDisplay").innerText = myRoomCode;

    peer = new Peer(`swim26-${myRoomCode.toLowerCase()}`, peerConfig);

    peer.on('open', () => {
        document.getElementById("myRoomCodeDisplay").innerText = myRoomCode;
        recordRoomVisit(myRoomCode);
        document.getElementById("onlineStatusText").innerText = "Ready! Share your code with family/friend.";
    });

    peer.on('connection', (conn) => {
        peerConnection = conn;
        gameState.isHost = true;
        setupPeerHandlers();
    });

    peer.on('error', (err) => {
        console.error("PeerJS Error:", err);
        if (err.type === 'unavailable-id') {
            myRoomCode = Math.random().toString(36).substring(2, 6).toUpperCase();
            peer = new Peer(`swim26-${myRoomCode.toLowerCase()}`, peerConfig);
        } else if (err.type === 'peer-unavailable') {
            document.getElementById("onlineStatusText").innerText = "❌ Room not found! Make sure Host is in lobby.";
        } else {
            document.getElementById("onlineStatusText").innerText = `⚠️ Connection error: ${err.type}`;
        }
    });
}

export function joinOnlineRoomByCode(code) {
    recordRoomVisit(code);
    document.getElementById("onlineStatusText").innerText = `Connecting to Room ${code}...`;

    if (!peer || peer.destroyed) {
        initOnlinePeer();
    }

    gameState.isHost = false;
    peerConnection = peer.connect(`swim26-${code.toLowerCase()}`, {
        reliable: true,
        config: peerConfig.config
    });

    setupPeerHandlers();
}

function setupPeerHandlers() {
    if (!peerConnection) return;

    peerConnection.on('open', () => {
        document.getElementById("onlineStatusText").innerText = "🎉 Connected! Starting race...";
        remoteSwimmer.connected = true;
        document.getElementById("liveChatFeed").style.display = "flex";

        peerConnection.send({ type: 'ready_handshake' });
        startOnlineRace();
    });

    peerConnection.on('data', (data) => {
        if (data.type === 'ready_handshake') {
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
            triggerBackgroundAlert();
        } else if (data.type === 'chat_msg') {
            receiveChatMessage(data.text);
        }
    });

    peerConnection.on('close', () => {
        remoteSwimmer.connected = false;
        document.getElementById("onlineStatusText").innerText = "❌ Disconnected.";
    });

    peerConnection.on('error', () => {
        document.getElementById("onlineStatusText").innerText = "⚠️ Peer connection failed.";
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