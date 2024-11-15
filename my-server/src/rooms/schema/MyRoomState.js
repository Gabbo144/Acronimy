const schema = require('@colyseus/schema');

class PlayerSchema extends schema.Schema {
    constructor() {
        super();
        this.nickname = "";
        this.connected = false;
        this.players = new schema.MapSchema();
        this.currentLetter = "";
    }
}

class MyRoomState extends schema.Schema {
    constructor() {
        super();
        this.players = new schema.MapSchema();
    }
}

// Define types for PlayerSchema
schema.defineTypes(PlayerSchema, {
    nickname: "string",
    connected: "boolean"
});

// Define types for MyRoomState
schema.defineTypes(MyRoomState, {
    players: { map: PlayerSchema },
    currentLetter: "string"
});

exports.MyRoomState = MyRoomState;
exports.PlayerSchema = PlayerSchema;