const colyseus = require('colyseus');
const { MyRoomState, PlayerSchema, AcronimoSchema } = require('./schema/MyRoomState');

exports.MyRoom = class extends colyseus.Room {
    maxClients = 4;

    onCreate(options) {
        this.setState(new MyRoomState());
        console.log(`Room created with ID: ${this.roomId}`);

        this.onMessage("end_round", (client) => {
            console.log("Broadcasting end_round message from client:", client.sessionId);
            this.broadcast("end_round");
        });

            // Add this handler
    this.onMessage("next_acronimo", (client) => {
        console.log("Received next_acronimo message");
        this.broadcast("next_acronimo");
    });


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

            if (!this.state.players[client.sessionId] || !this.state.players[client.sessionId].connected) {
                console.log("Player not found or disconnected:", client.sessionId);
                return;
            }

            const acronimo = this.state.acronimiMandati[index];
            if (!acronimo) {
                console.log("Acronimo not found at index:", index);
                return;
            }

            try {
                if (isUpvote) {
                    acronimo.upvotes++;
                } else {
                    acronimo.downvotes++;
                }

                const authorId = Array.from(this.state.players.entries())
                    .find(([_, player]) => player.nickname === acronimo.author)?.[0];

                if (authorId) {
                    this.state.players[authorId].score += isUpvote ? 1 : -1;
                }

                console.log(`Vote registered from ${client.sessionId} for acronimo at index ${index}`);
                this.broadcast("vote_update", {
                    index,
                    upvotes: acronimo.upvotes,
                    downvotes: acronimo.downvotes
                });
            } catch (error) {
                console.error("Error processing vote:", error);
            }
        });

        this.onMessage("show_scores", (client) => {
            this.broadcast("show_scores");
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