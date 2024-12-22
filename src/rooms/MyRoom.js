const colyseus = require('colyseus');
const { MyRoomState, PlayerSchema, AcronimoSchema } = require('./schema/MyRoomState');



const parolegiocatori =[]

const acronimi = [
    "AIDS", "HIV", "USA", "USSR", "ONU", "NASA",
    "FBI", "UNICEF", "NATO", "URL", "PDF",
    "HTML", "VIP", "ASAP", "LOL", "CEO", "CTO", "HTTP",
    "GPS", "XML", "IP", "USB", "LAN", "RAM", "ROM", 
    "Wi-Fi", "ATM", "NFC", "GPS", "AI", "GPU", "CPU",
    "TLC", "MRI", "COVID", "SARS", "DNA", "RNA", "CEO", 
    "ICT", "EUA", "HTML5", "CSS", "JS", "SEO", "VPN",
    "SMS", "MMS", "TV", "DVD", "MP3", "MP4", "JPEG",
    "PNG", "GIF", "API", "SDK", "IP", "LAN", "WAN", "SQL", "LMAO", "IDK"
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
        this.state.wordsSubmittedCount = 0;
        this.state.currentRound = 0;
        this.state.acronimiMandati = [];

        // Set maximum clients and ensure room stays unlocked
        this.maxClients = 16;
        this.setMetadata({ maxClients: 16 });
        this.autoDispose = false;
        this.unlock(); // Start with an unlocked room

        this.onMessage("start_game", (client, message) => {
            this.gameStarted = true;
            this.state.currentRound = 0; 
            this.hostSessionId = client.sessionId;
            this.state.totalRounds = message.totalRounds || 3;
            this.state.timerDuration = message.timerDuration || 60;
            
            // Clear any existing custom words
            parolegiocatori.length = 0;
            
            if (message.useCustomWords) {
                this.useCustomWords = true;
                this.broadcast("custom_words_phase");
            } else {
                // Start game immediately with default words
                const randomAcronimo = acronimi[Math.floor(Math.random() * acronimi.length)];
                this.state.currentLetter = randomAcronimo;
                this.broadcast("round_started", {
                    roundNumber: this.state.currentRound,
                    totalRounds: this.state.totalRounds,
                    letter: this.state.currentLetter,
                    timerDuration: this.state.timerDuration
                });
            }
        });

        this.onMessage("return_all_to_lobby", (client) => {
            // Reset game state
            this.state.currentRound = 0;
            this.state.currentLetter = "";
            this.state.acronimiMandati = [];
            this.state.currentAcronimoIndex = 0;
            this.state.wordsSubmittedCount = 0;
            this.gameStarted = false;
        
            // Reset player scores and states
            this.state.players.forEach(player => {
                player.score = 0;
                player.hasSubmittedWords = false;
            });
        
            // Clear any active timers
            if (this.roundTimer) {
                clearTimeout(this.roundTimer);
                this.roundTimer = null;
            }
        
            // Reset host tracking
            this.hostSessionId = null;
        
            // Broadcast force return to ensure all clients reset
            this.broadcast("force_return_to_lobby");
        });

        this.onMessage("start_custom_words_phase", (client) => {
            this.broadcast("custom_words_phase");
        });

        this.onMessage("submit_custom_word", (client, message) => {
            const player = this.state.players.get(client.sessionId);
            
            if (!player || player.hasSubmittedWords) {
                return;
            }
            
            // Verifica e aggiungi la parola
            if (message.word && !parolegiocatori.includes(message.word)) {
                parolegiocatori.push(message.word);
                // console.log("Word added:", message.word);
            }
        
            player.hasSubmittedWords = true;
            this.state.wordsSubmittedCount++;
        
            this.broadcast("words_submission_update", {
                submittedCount: this.state.wordsSubmittedCount,
                totalPlayers: this.clients.length-1
            });
        
            if (this.state.wordsSubmittedCount >= this.clients.length-1) {
                this.state.wordsSubmittedCount = 0;
                this.state.players.forEach((p) => {
                    if (p instanceof PlayerSchema) {
                        p.hasSubmittedWords = false;
                    }
                });
        
                // console.log("Parole raccolte:", parolegiocatori); // Debug log
                this.state.currentRound = 1;
                
                // Copia le parole in un nuovo array per mantenerle
                this.customWords = [...parolegiocatori];
                
                const randomWord = parolegiocatori[Math.floor(Math.random() * parolegiocatori.length)];
                this.state.currentLetter = randomWord;
                
                this.broadcast("all_words_submitted");
                this.broadcast("round_started", {
                    roundNumber: this.state.currentRound,
                    totalRounds: this.state.totalRounds,
                    letter: this.state.currentLetter,
                    timerDuration: this.state.timerDuration
                });
            }
        });

// src/rooms/MyRoom.js

this.onMessage("start_new_round", (client, message) => {
    if (!this.gameStarted) return;

    this.state.currentRound++;
    this.state.timerDuration = message.timerDuration || 60;

    this.state.players.forEach(player => {
        player.submittedWordsCount = 0; // Resetta il contatore
        player.hasSubmittedWords = false;
    });

    this.state.wordsSubmittedCount = 0; // Resetta il contatore globale se necessario


    if (this.state.currentRound > this.state.totalRounds) {
        this.gameStarted = false;
        this.state.currentRound = 0;
        this.state.players.forEach(player => {
            player.score = 0;
        });
        this.broadcast("return_to_lobby");
        return;
    }

    // Reset dello stato del gioco per il nuovo round
    this.state.acronimiMandati = [];
    
    // Imposta la lettera corrente
    if (parolegiocatori.length > 0) {
        const randomWord = parolegiocatori[Math.floor(Math.random() * parolegiocatori.length)];
        this.state.currentLetter = randomWord;
    } else {
        const randomAcronimo = acronimi[Math.floor(Math.random() * acronimi.length)];
        this.state.currentLetter = randomAcronimo.charAt(0);
    }

    if (this.useCustomWords && parolegiocatori.length > 0) {
        // Remove the used word from the array after selecting it
        const randomIndex = Math.floor(Math.random() * parolegiocatori.length);
        const randomWord = parolegiocatori.splice(randomIndex, 1)[0];
        this.state.currentLetter = randomWord;
    } else {
        const randomAcronimo = acronimi[Math.floor(Math.random() * acronimi.length)];
        this.state.currentLetter = randomAcronimo;
    }
    
    // Invia il messaggio round_started con timerDuration
    this.broadcast("round_started", {
        roundNumber: this.state.currentRound,
        totalRounds: this.state.totalRounds,
        letter: this.state.currentLetter,
        timerDuration: this.state.timerDuration
    });
});

// src/rooms/MyRoom.js

this.onMessage("start_round", (client, message) => {
    if (!this.gameStarted) return;

    this.state.currentRound++;
    this.state.timerDuration = message.timerDuration || 60;

    if (this.state.currentRound > this.state.totalRounds) {
        this.gameStarted = false;
        this.state.currentRound = 0;
        this.state.players.forEach(player => {
            player.score = 0;
        });
        this.broadcast("return_to_lobby");
        return;
    }

    // Reset dello stato del gioco per il nuovo round
    this.state.acronimiMandati = [];

    // Imposta la lettera corrente
    if (parolegiocatori.length > 0) {
        const randomWord = parolegiocatori[Math.floor(Math.random() * parolegiocatori.length)];
        this.state.currentLetter = randomWord;
    } else {
        const randomAcronimo = acronimi[Math.floor(Math.random() * acronimi.length)];
        this.state.currentLetter = randomAcronimo.charAt(0);
    }

    // Broadcast del nuovo round
    this.broadcast("round_started", {
        roundNumber: this.state.currentRound,
        totalRounds: this.state.totalRounds,
        letter: this.state.currentLetter,
        timerDuration: this.state.timerDuration
    });
});
    
// Add this in the onCreate method
this.onMessage("settings_update", (client, message) => {
    // Update room settings
    this.state.totalRounds = message.totalRounds;
    this.state.timerDuration = message.timerDuration;
    
    // Broadcast the update to all clients
    this.broadcast("settings_update", {
        totalRounds: this.state.totalRounds,
        timerDuration: this.state.timerDuration
    });
});

        // Message handlers
        this.onMessage("end_round", (client) => {
            // Clear any existing timer
            if (this.roundTimer) {
                clearTimeout(this.roundTimer);
                this.roundTimer = null;
            }
            
            // console.log("Broadcasting end_round message from client:", client.sessionId);
            this.broadcast("end_round");
        });

        this.onMessage("show_scores", (client) => {
            // console.log("Showing scores");
            this.broadcast("show_scores");
            Object.entries(this.state.players).forEach(([sessionId, player]) => {
                // console.log(`Player ${player.nickname}: ${player.score} points`);
            });
        });
    
        this.onMessage("next_acronimo", (client, message) => {
            // console.log("Received next_acronimo message");
            this.state.votesSubmitted = 0;
            this.broadcast("next_acronimo", { 
                index: message.index,
                text: this.state.acronimiMandati[message.index].text,
                upvotes: this.state.acronimiMandati[message.index].upvotes,
                downvotes: this.state.acronimiMandati[message.index].downvotes,
                author: this.state.acronimiMandati[message.index].author // Aggiungi l'autore
            });
            this.broadcast("vote_count_update", {
                votesSubmitted: 0,
                totalExpectedVotes: this.state.totalExpectedVotes
            });
        });
    
        this.onMessage("vote", (client, message) => {
            const { index, isUpvote } = message;
            const acronimo = this.state.acronimiMandati[index];


            if (acronimo && acronimo.author === this.playerIdentities.get(client.sessionId)) {
                // Reject the vote if voter is the author
                return;
            }
            
            if (acronimo && acronimo.author) {
                // Find the player who authored the acronimo
                const authorSessionId = this.getSessionIdByNickname(acronimo.author);
                this.state.votesSubmitted++;
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
                    // console.log(`Punto assegnato a ${authorPlayer.nickname}, nuovo punteggio: ${authorPlayer.score}`);
                } else {
                    acronimo.downvotes++;
                    authorPlayer.score--;
                    // console.log(`Punto sottratto a ${authorPlayer.nickname}, nuovo punteggio: ${authorPlayer.score}`);
                }
        
                // Broadcast vote update with author score
                this.broadcast("vote_update", { 
                    index, 
                    upvotes: acronimo.upvotes, 
                    downvotes: acronimo.downvotes,
                    author: acronimo.author,
                    authorScore: authorPlayer.score
                });
                this.broadcast("vote_count_update", {
                    votesSubmitted: this.state.votesSubmitted,
                    totalExpectedVotes: (this.clients.length - 1) * this.state.acronimiMandati.length
                });
            }
            
        });
    
// src/rooms/MyRoom.js

this.onMessage("manda_acronimo", (client, message) => {
    const acronimo = new AcronimoSchema();
    acronimo.text = message.acronimo;

    const player = this.state.players.get(client.sessionId);
    if (player) {
        acronimo.author = player.nickname;
        acronimo.upvotes = 0;
        acronimo.downvotes = 0;
        this.state.acronimiMandati.push(acronimo);

        // Incrementa il contatore delle parole sottomesse
        player.submittedWordsCount++;
        this.state.acronimiSubmittedCount++;

        // Controlla se il giocatore ha sottomesso tutte le parole richieste
        if (player.submittedWordsCount >= 3) { // Supponendo 3 parole per giocatore
            player.hasSubmittedWords = true;
        }

        // Controlla se tutti i giocatori hanno sottomesso le parole richieste
        const allSubmitted = Array.from(this.state.players.values()).every(p => p.submittedWordsCount >= this.clients.length-1);
        // console.log(allSubmitted);

        this.broadcast("acronimi_submission_update", {
            submittedCountz: this.state.acronimiSubmittedCount,
            totalPlayer: this.clients.length-1
        });

        if (this.state.acronimiSubmittedCount >= this.clients.length - 1) {
            // Ferma il timer
            if (this.roundTimer) {
                clearTimeout(this.roundTimer);
                this.roundTimer = null;
            }

            // Avanza alla fase di votazione
            this.broadcast("end_round");

            // Reimposta i contatori e i flag di invio
            this.state.acronimiSubmittedCount = 0;
            this.state.players.forEach(p => {
                p.hasSubmittedWords = false;
                p.submittedWordsCount = 0; // Aggiungi se necessario

            });

            // Aggiungi un flag per la fase corrente, se necessario
            this.state.isVotingPhase = true;
        }
    }
});
    
        // Generate a random letter at the start of the round
        this.state.currentLetter = acronimi[Math.floor(Math.random() * acronimi.length)];
        // console.log(`Generated letter: ${this.state.currentLetter}`);
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
        player.hasSubmittedWords = false;
        this.state.players.set(client.sessionId, player);

        console.log(`Player ${player.nickname} added to players state.`);

        // Update connected players count
        const connectedPlayers = Object.values(this.state.players)
            .filter(p => p.connected).length;

        // console.log(`Connected players count: ${connectedPlayers}`);

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