const colyseus = require('colyseus');
const { MyRoomState, PlayerSchema, AcronimoSchema } = require('./schema/MyRoomState');

const acronimi = [
    "AIDS", "HIV", "USA", "USSR", "ONU", "NASA",
    "FBI", "UNICEF", "NATO", "URL", "PDF",
    "HTML", "VIP", "ASAP", "LOL"
];

var acronimi_mandati = [];

exports.MyRoom = class extends colyseus.Room {
    maxClients = 16;

    onCreate(options) {
        this.setState(new MyRoomState());
        console.log(`Room created with ID: ${this.roomId}`);
        this.reconnectionTimeouts = new Map();
    
        // Set maximum clients and ensure room stays unlocked
        this.maxClients = 16;
        this.setMetadata({ maxClients: 16 });
        this.autoDispose = false;
        this.unlock(); // Start with an unlocked room
    
        // Message handlers
        this.onMessage("end_round", (client) => {
            console.log("Broadcasting end_round message from client:", client.sessionId);
            this.broadcast("end_round");
        });
    
        this.onMessage("next_acronimo", (client, message) => {
            console.log("Received next_acronimo message");
            this.broadcast("next_acronimo", { 
                index: message.index,
                text: this.state.acronimiMandati[message.index].text,
                upvotes: this.state.acronimiMandati[message.index].upvotes,
                downvotes: this.state.acronimiMandati[message.index].downvotes
            });
        });
    
        // Generate a random letter at the start of the round
        this.state.currentLetter = acronimi[Math.floor(Math.random() * acronimi.length)];
        console.log(`Generated letter: ${this.state.currentLetter}`);
    
        this.onMessage("manda_acronimo", (client, message) => {
            const acronimo = new AcronimoSchema();
            acronimo.text = message.acronimo;
            acronimo.author = this.state.players[client.sessionId].nickname;
            acronimo.upvotes = 0;
            acronimo.downvotes = 0;
            this.state.acronimiMandati.push(acronimo);
            console.log("Acronimo ricevuto:", message.acronimo);
        });
    
        this.onMessage("vote", (client, message) => {
            const { index, isUpvote } = message;
            // Voting logic...
        });
    
        this.reconnectionTimeouts = new Map();
    }

    onJoin(client, options) {
        console.log(`${client.sessionId} joined room ${this.roomId}`);
    
        let player = this.state.players[client.sessionId];
        if (!player) {
            player = new PlayerSchema();
            player.nickname = options.nickname;
        }
        player.connected = true;
        this.state.players[client.sessionId] = player;
    
        // Correctly count connected players
        const connectedPlayers = Object.values(this.state.players).filter(p => p.connected).length;
        console.log(`Current connected players: ${connectedPlayers}`);
    
        // Lock the room only if maxClients is reached
        if (connectedPlayers >= this.maxClients) {
            this.lock();
            console.log(`Room ${this.roomId} locked - max clients reached`);
        } else {
            this.unlock();
            console.log(`Room ${this.roomId} unlocked - space available`);
        }
    
        console.log(`Player ${player.nickname} connected: ${player.connected}`);
    }

    async onLeave(client, consented) {
        console.log(`${client.sessionId} attempting to leave room ${this.roomId} (consented: ${consented})`);
    
        try {
            // Clear any existing reconnection timeout
            if (this.reconnectionTimeouts.has(client.sessionId)) {
                clearTimeout(this.reconnectionTimeouts.get(client.sessionId));
                this.reconnectionTimeouts.delete(client.sessionId);
            }
    
            if (!consented) {
                console.log(`${client.sessionId} disconnected, waiting for reconnection...`);
                this.state.players[client.sessionId].connected = false;
    
                // Set up reconnection timeout
                const timeout = setTimeout(() => {
                    console.log(`${client.sessionId} reconnection timeout expired`);
                    this.state.players[client.sessionId].connected = false;
                }, 120000); // 120 seconds timeout
    
                this.reconnectionTimeouts.set(client.sessionId, timeout);
    
                try {
                    // Wait for reconnection
                    await this.allowReconnection(client, 120);
                    console.log(`${client.sessionId} successfully reconnected`);
                    this.state.players[client.sessionId].connected = true;
    
                    // Clear timeout after successful reconnection
                    clearTimeout(timeout);
                    this.reconnectionTimeouts.delete(client.sessionId);
                } catch (e) {
                    console.log(`${client.sessionId} failed to reconnect:`, e);
                    this.state.players[client.sessionId].connected = false;
                }
            } else {
                // Immediate disconnection, mark as disconnected
                console.log(`${client.sessionId} left consensually`);
                this.state.players[client.sessionId].connected = false;
            }
        } catch (error) {
            console.error(`Error handling leave for ${client.sessionId}:`, error);
            this.state.players[client.sessionId].connected = false;
        }
    
        // Correctly count connected players after a player leaves
        const connectedPlayers = Object.values(this.state.players).filter(p => p.connected).length;
        if (connectedPlayers < this.maxClients) {
            console.log("Unlocking room as player count is below maximum");
            this.unlock();
            console.log(`Room ${this.roomId} unlocked after player left`);
        }
    }

    onDispose() {
        // Clear all reconnection timeouts
        for (const timeout of this.reconnectionTimeouts.values()) {
            clearTimeout(timeout);
        }
        this.reconnectionTimeouts.clear();
        console.log(`Room ${this.roomId} disposing...`);
    }

}