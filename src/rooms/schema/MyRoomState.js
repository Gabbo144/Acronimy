const schema = require('@colyseus/schema');

class PlayerSchema extends schema.Schema {
    constructor() {
        super();
        this.nickname = "";
        this.connected = true;
        this.score = 0;
    }
}

class AcronimoSchema extends schema.Schema {
    constructor() {
        super();
        this.text = "";
        this.author = "";
        this.upvotes = 0;
        this.downvotes = 0;
    }
}

class MyRoomState extends schema.Schema {
    constructor() {
        super();
        this.players = new schema.MapSchema();
        this.currentLetter = "";
        this.acronimiMandati = new schema.ArraySchema();
        this.currentAcronimoIndex = 0;
    }
}

schema.defineTypes(MyRoomState, {
    players: { map: PlayerSchema },
    currentLetter: "string",
    acronimiMandati: [ AcronimoSchema ],
    currentAcronimoIndex: "number"
});

schema.defineTypes(PlayerSchema, {
    nickname: "string",
    connected: "boolean",
    score: "number"
});

schema.defineTypes(AcronimoSchema, {
    text: "string",
    author: "string",
    upvotes: "number",
    downvotes: "number"
});

exports.MyRoomState = MyRoomState;
exports.PlayerSchema = PlayerSchema;
exports.AcronimoSchema = AcronimoSchema;