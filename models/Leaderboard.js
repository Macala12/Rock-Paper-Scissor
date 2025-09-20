import mongoose from "mongoose";

const leaderboardSchema = new mongoose.Schema({
    leaderboardId: String,
    userId: String,
    username: String,
    userImg: String,
    played: Number,
    score: Number,
    status: String
}, {versionKey: false});

const Leaderboard = mongoose.model('leaderboard', leaderboardSchema, 'leaderboard');

export default Leaderboard;