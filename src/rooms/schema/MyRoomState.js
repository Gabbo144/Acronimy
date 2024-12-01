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
        this.currentRound = 0;  // Add this
        this.totalRounds = 3;   // Add this
    }
}

class MyRoomState extends schema.Schema {
    constructor() {
        super();
        this.players = new schema.MapSchema();
        this.currentLetter = "";
        this.acronimiMandati = new schema.ArraySchema();
        this.currentAcronimoIndex = 0;
        this.wordsSubmittedCount = 0; // Add this to track submissions
    }
}

schema.defineTypes(MyRoomState, {
    players: { map: PlayerSchema },
    currentLetter: "string",
    acronimiMandati: [ AcronimoSchema ],
    currentAcronimoIndex: "number",
    currentRound: "number",     // Add this
    totalRounds: "number",       // Add this
    wordsSubmittedCount: "number" // Define the new property
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