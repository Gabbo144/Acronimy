const colyseus = require('colyseus');
const { MyRoomState, PlayerSchema } = require('./schema/MyRoomState');

exports.MyRoom = class extends colyseus.Room {
    maxClients = 4;

    onCreate(options) {
        this.setState(new MyRoomState());
        console.log(`Room created with ID: ${this.roomId}`);
        
        // Generate random letter
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        this.state.currentLetter = alphabet[Math.floor(Math.random() * alphabet.length)];
        console.log(`Generated letter: ${this.state.currentLetter}`);
        
        // Prevent room from being disposed
        this.autoDispose = false;
        
        // Enable seat reservation for longer time to handle redirects
        this.setSeatReservationTime(120);

        // Store original client IDs for reconnection
        this.originalClients = new Map();
    }

    onJoin(client, options) {
        console.log(`${client.sessionId} joined room ${this.roomId}`);
        
        // Create a new PlayerSchema instance or reuse existing one
        let player = this.state.players[client.sessionId];
        if (!player) {
            player = new PlayerSchema();
            player.nickname = options.nickname;
            // Store the original client ID
            this.originalClients.set(options.nickname, client.sessionId);
        }
        player.connected = true;
        this.state.players[client.sessionId] = player;
    }

    async onLeave(client, consented) {
        console.log(`${client.sessionId} left room ${this.roomId}`);
        
        try {
            if (!consented) {
                // Only allow reconnection for unexpected disconnects
                await this.allowReconnection(client, 120);
                this.state.players[client.sessionId].connected = true;
            }
        } catch (e) {
            // If reconnection fails, mark as disconnected
            this.state.players[client.sessionId].connected = false;
        }
    }

    onDispose() {
        console.log(`Room ${this.roomId} disposing...`);
    }
}