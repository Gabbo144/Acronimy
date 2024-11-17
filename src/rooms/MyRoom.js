const colyseus = require('colyseus');
const { MyRoomState, PlayerSchema } = require('./schema/MyRoomState');

const acronimi = [
    "AIDS", "HIV", "USA", "USSR", "ONU", "NASA",
    "FBI", "UNICEF", "NATO", "URL", "PDF",
    "HTML", "VIP", "ASAP", "LOL"
];

var acronimi_mandati = [];

exports.MyRoom = class extends colyseus.Room {
    maxClients = 4;

    onCreate(options) {
        this.setState(new MyRoomState());
        console.log(`Room created with ID: ${this.roomId}`);

        // Gestione del messaggio "end_round"
        this.onMessage("end_round", (client) => {
            console.log("Broadcasting end_round message from client:", client.sessionId);
            this.broadcast("end_round");
        });

        // Gestione del messaggio "manda_acronimo"
        this.onMessage("manda_acronimo", (client, message) => {
            this.state.acronimiMandati.push(message.acronimo);
            console.log("Acronimo ricevuto:", message.acronimo);
        });

        // Genera una lettera casuale all'inizio del round
        this.state.currentLetter = acronimi[Math.floor(Math.random() * acronimi.length)];
        console.log(`Generated letter: ${this.state.currentLetter}`);

        // Impostazioni aggiuntive
        this.autoDispose = false;
        this.setSeatReservationTime(120);
        this.originalClients = new Map();
    }

    onJoin(client, options) {
        console.log(`${client.sessionId} joined room ${this.roomId}`);
        
        let player = this.state.players[client.sessionId];
        if (!player) {
            player = new PlayerSchema();
            player.nickname = options.nickname;
            this.originalClients.set(options.nickname, client.sessionId);
        }
        player.connected = true;
        this.state.players[client.sessionId] = player;
    }

    async onLeave(client, consented) {
        console.log(`${client.sessionId} left room ${this.roomId}`);
        
        try {
            if (!consented) {
                await this.allowReconnection(client, 120);
                this.state.players[client.sessionId].connected = true;
            }
        } catch (e) {
            this.state.players[client.sessionId].connected = false;
        }
    }

    onDispose() {
        console.log(`Room ${this.roomId} disposing...`);
    }
}