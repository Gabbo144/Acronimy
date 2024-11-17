const schema = require('@colyseus/schema');

class PlayerSchema extends schema.Schema {
    constructor() {
        super();
        this.nickname = "";
        this.connected = false;
    }
}

class MyRoomState extends schema.Schema {
    constructor() {
        super();
        this.players = new schema.MapSchema();
        this.currentLetter = "";
        this.acronimiMandati = new schema.ArraySchema();
        this.currentAcronimoIndex = 0; // Add this line
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
    acronimiMandati: ["string"],
    currentAcronimoIndex: "number"  // Add this line
});

exports.MyRoomState = MyRoomState;
exports.PlayerSchema = PlayerSchema;