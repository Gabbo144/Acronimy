const schema = require('@colyseus/schema');

class PlayerSchema extends schema.Schema {
    constructor() {
        super();
        this.nickname = "";
        this.connected = false;
    }
}

// In MyRoomState.js
class MyRoomState extends schema.Schema {
    constructor() {
        super();
        this.players = new schema.MapSchema();
        this.currentLetter = "";
        this.acronimiMandati = new schema.ArraySchema(); // Initialize as empty array
    }
}

// Definisci i tipi per PlayerSchema
schema.defineTypes(PlayerSchema, {
    nickname: "string",
    connected: "boolean"
});

// Definisci i tipi per MyRoomState
schema.defineTypes(MyRoomState, {
    players: { map: PlayerSchema },
    currentLetter: "string",
    acronimiMandati: ["string"]  // Aggiungi questo
});

exports.MyRoomState = MyRoomState;
exports.PlayerSchema = PlayerSchema;