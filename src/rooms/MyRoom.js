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
        this.reconnectionTimeouts = new Map();
        this.playerIdentities = new Map();
        this.usedNicknames = new Set();
        this.state.currentRound = 0;
        this.gameStarted = false;  // Add this flag

        // Set maximum clients and ensure room stays unlocked
        this.maxClients = 16;
        this.setMetadata({ maxClients: 16 });
        this.autoDispose = false;
        this.unlock(); // Start with an unlocked room

        this.onMessage("start_game", (client, message) => {
            this.gameStarted = true;
            this.state.currentRound = 1; // Imposta a 1 quando il gioco inizia
            
            if (message && message.totalRounds) {
                this.state.totalRounds = message.totalRounds;
            } else {
                this.state.totalRounds = 3; // Default a 3 se non specificato
            }
        
            // Reset dello stato del gioco
            this.state.acronimiMandati = [];
            this.state.currentLetter = acronimi[Math.floor(Math.random() * acronimi.length)];
            
            this.broadcast("round_started", {
                roundNumber: this.state.currentRound,
                totalRounds: this.state.totalRounds,
                letter: this.state.currentLetter
            });
            
            this.broadcast("start_game");
        });

        this.onMessage("start_new_round", (client, message) => {
            if (!this.gameStarted) return;
        
            this.state.currentRound++;
        
            if (this.state.currentRound > this.state.totalRounds) {
                // Reset game state
                this.gameStarted = false;
                this.state.currentRound = 0;
                
                // Reset all player scores
                this.state.players.forEach(player => {
                    player.score = 0;
                });
                
                // Return to lobby
                this.broadcast("return_to_lobby");
                return;
            }
        
            // Reset dello stato del gioco per il nuovo round
            this.state.acronimiMandati = [];
            this.state.currentLetter = acronimi[Math.floor(Math.random() * acronimi.length)];
            
            // Invia il messaggio round_started a tutti i client
            this.broadcast("round_started", {
                roundNumber: this.state.currentRound,
                totalRounds: this.state.totalRounds,
                letter: this.state.currentLetter
            });
        });
    

        // Message handlers
        this.onMessage("end_round", (client) => {
            console.log("Broadcasting end_round message from client:", client.sessionId);
            this.broadcast("end_round");
        });

        this.onMessage("show_scores", (client) => {
            console.log("Showing scores");
            this.broadcast("show_scores");
            Object.entries(this.state.players).forEach(([sessionId, player]) => {
                console.log(`Player ${player.nickname}: ${player.score} points`);
            });
        });
    
        this.onMessage("next_acronimo", (client, message) => {
            console.log("Received next_acronimo message");
            this.broadcast("next_acronimo", { 
                index: message.index,
                text: this.state.acronimiMandati[message.index].text,
                upvotes: this.state.acronimiMandati[message.index].upvotes,
                downvotes: this.state.acronimiMandati[message.index].downvotes,
                author: this.state.acronimiMandati[message.index].author // Aggiungi l'autore
            });
        });
    
        this.onMessage("vote", (client, message) => {
            const { index, isUpvote } = message;
            const acronimo = this.state.acronimiMandati[index];
            if (acronimo && acronimo.author) {
                // Find the player who authored the acronimo
                const authorSessionId = this.getSessionIdByNickname(acronimo.author);
                if (authorSessionId && this.state.players[authorSessionId]) {
                    if (isUpvote) {
                        acronimo.upvotes++;
                        this.state.players[authorSessionId].score++;
                    } else {
                        acronimo.downvotes++;
                        this.state.players[authorSessionId].score--;
                    }
                }

                const authorPlayer = Array.from(this.state.players.entries())
                    .find(([_, player]) => player.nickname === acronimo.author)?.[1];
                    
                if (!authorPlayer) {
                    console.error(`Could not find player with nickname ${acronimo.author}`);
                    return;
                }
        
                if (isUpvote) {
                    acronimo.upvotes++;
                    authorPlayer.score++;
                    console.log(`Punto assegnato a ${authorPlayer.nickname}, nuovo punteggio: ${authorPlayer.score}`);
                } else {
                    acronimo.downvotes++;
                    authorPlayer.score--;
                    console.log(`Punto sottratto a ${authorPlayer.nickname}, nuovo punteggio: ${authorPlayer.score}`);
                }
        
                // Broadcast vote update with author score
                this.broadcast("vote_update", { 
                    index, 
                    upvotes: acronimo.upvotes, 
                    downvotes: acronimo.downvotes,
                    author: acronimo.author,
                    authorScore: authorPlayer.score
                });
            }
        });
    
        this.onMessage("manda_acronimo", (client, message) => {
            const acronimo = new AcronimoSchema();
            acronimo.text = message.acronimo;
            acronimo.author = this.state.players[client.sessionId].nickname; // Assicurati che questo sia impostato
            acronimo.upvotes = 0;
            acronimo.downvotes = 0;
            this.state.acronimiMandati.push(acronimo);
            console.log("Acronimo ricevuto:", message.acronimo, "da:", acronimo.author); // Log per debug
        });
    
        // Generate a random letter at the start of the round
        this.state.currentLetter = acronimi[Math.floor(Math.random() * acronimi.length)];
        console.log(`Generated letter: ${this.state.currentLetter}`);
    }

    onJoin(client, options) {
        console.log(`${client.sessionId} joined room ${this.roomId}`);
        console.log(`Received nickname: ${options.nickname}`);

        // First check if nickname is provided
        if (!options.nickname) {
            throw new Error("Nickname is required");
        }

        // Check for existing nickname
        if (this.usedNicknames.has(options.nickname)) {
            console.log(`Nickname ${options.nickname} is already in use. Reconnecting...`);
            // If nickname exists, handle reconnection
            const existingSessionId = this.getSessionIdByNickname(options.nickname);
            if (existingSessionId) {
                // Remove old player entry
                delete this.state.players[existingSessionId];
                this.usedNicknames.delete(options.nickname);
                this.playerIdentities.delete(existingSessionId);
                console.log(`Removed previous sessionId ${existingSessionId} for nickname ${options.nickname}`);
            }
        }

        // Store player identity and nickname
        this.playerIdentities.set(client.sessionId, options.nickname);
        this.usedNicknames.add(options.nickname);
        console.log(`Added nickname ${options.nickname} for sessionId ${client.sessionId}`);

        // Create new player
        const player = new PlayerSchema();
        player.nickname = options.nickname;
        player.score = 0;
        player.connected = true;
        this.state.players[client.sessionId] = player;
        console.log(`Player ${player.nickname} added to players state.`);

        // Update connected players count
        const connectedPlayers = Object.values(this.state.players)
            .filter(p => p.connected).length;

        console.log(`Connected players count: ${connectedPlayers}`);

        // Update room lock status
        if (connectedPlayers >= this.maxClients) {
            this.lock();
            console.log(`Room ${this.roomId} locked.`);
        } else {
            this.unlock();
            console.log(`Room ${this.roomId} unlocked.`);
        }
    }

    getSessionIdByNickname(nickname) {
        for (const [sessionId, playerNickname] of this.playerIdentities) {
            if (playerNickname === nickname) {
                return sessionId;
            }
        }
        return null;
    }


    async onLeave(client, consented) {
        console.log(`${client.sessionId} attempting to leave room ${this.roomId} (consented: ${consented})`);

        if (consented) {
            // If leaving consensually, clean up completely
            const nickname = this.playerIdentities.get(client.sessionId);
            this.usedNicknames.delete(nickname);
            this.playerIdentities.delete(client.sessionId);
            delete this.state.players[client.sessionId];
            console.log(`Player ${nickname} left the room.`);
        } else {
            // If disconnected, just mark as offline
            if (this.state.players[client.sessionId]) {
                this.state.players[client.sessionId].connected = false;
                console.log(`Player ${this.state.players[client.sessionId].nickname} marked as offline.`);
            } else {
                console.log(`Player with sessionId ${client.sessionId} not found in players state.`);
            }
        }

        try {
            // Clear any existing reconnection timeout
            if (this.reconnectionTimeouts.has(client.sessionId)) {
                clearTimeout(this.reconnectionTimeouts.get(client.sessionId));
                this.reconnectionTimeouts.delete(client.sessionId);
                console.log(`Cleared reconnection timeout for sessionId ${client.sessionId}`);
            }

            if (!consented) {
                console.log(`${client.sessionId} disconnected, waiting for reconnection...`);
                if (this.state.players[client.sessionId]) {
                    this.state.players[client.sessionId].connected = false;

                    // Set up reconnection timeout
                    const timeout = setTimeout(() => {
                        console.log(`${client.sessionId} reconnection timeout expired`);
                        if (this.state.players[client.sessionId]) {
                            this.state.players[client.sessionId].connected = false;
                        }
                    }, 120000); // 120 seconds timeout

                    this.reconnectionTimeouts.set(client.sessionId, timeout);
                }
            }

            // Correctly count connected players after a player leaves
            const connectedPlayers = Object.values(this.state.players)
                .filter(p => p.connected).length;
            if (connectedPlayers < this.maxClients) {
                this.unlock();
                console.log(`Room ${this.roomId} unlocked after player left. Connected players: ${connectedPlayers}`);
            }
        } catch (error) {
            console.error(`Error handling leave for ${client.sessionId}:`, error);
            if (this.state.players[client.sessionId]) {
                this.state.players[client.sessionId].connected = false;
            }
        }
    }

    onDispose() {
        console.log(`Room ${this.roomId} disposed.`);
    }
}