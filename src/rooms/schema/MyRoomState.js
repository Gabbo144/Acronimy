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
    currentLetter: "string"
});

exports.MyRoomState = MyRoomState;
exports.PlayerSchema = PlayerSchema;