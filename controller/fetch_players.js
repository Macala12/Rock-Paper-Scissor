import Leaderboard from "../models/Leaderboard.js";

const fetchPlayers = async (tournamentId) => {
  try {
    const fetchedPlayers = await Leaderboard.find({ leaderboardId: tournamentId });

    if (!fetchedPlayers || fetchedPlayers.length === 0) {
      return { success: false, message: "No players found", players: [] };
    }

    return { success: true, players: fetchedPlayers };
  } catch (error) {
    console.error("Error fetching players:", error);
    return { success: false, message: "Error fetching players", players: [] };
  }
};

export default fetchPlayers;
