import mongoose from "mongoose";
import Leaderboard from "../models/Leaderboard.js";

const fetchPlayers = async (tournamentId) => {
  try {
    const fetchedPlayers = await Leaderboard.find({ leaderboardId: tournamentId });
    return fetchedPlayers;
  } catch (error) {
    console.error(error);
    return [];
  }
};

export default fetchPlayers;
