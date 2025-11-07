import dotenv from "dotenv";
dotenv.config();

import { fileURLToPath } from "url"; 
import path from "path"; 
import { Server } from "socket.io";

import mongoose from "mongoose";
import express from "express";
import Leaderboard from "./models/Leaderboard.js";
import fetchPlayers from "./controller/fetch_players.js";
import cors from "cors";

const app = express();

app.use(cors({
  origin: ["https://octagames.ng",  "https://www.octagames.ng", "http://localhost:3000"],  // or "*" to allow all
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

const PORT = process.env.PORT || 4000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, "public")));
app.use(express.static(path.join(__dirname, "view")));
app.use(express.static(path.join(__dirname, "images")));

app.use(express.json());


app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "", "index.html"));
});

app.get("/api/create", async (req, res) => {
  
  try {
    const { tournamentId } = req.query;    
    
    if (!tournamentId) {
      return res.status(400).json({ error: "Missing tournamentId" });
    }

    const players = await fetchPlayers(tournamentId);

    if (!players.success) {
      return res.status(404).json({ error: players.message });
    }    
  
    const result = await createRound(players.players, tournamentId);

    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }

    return res.json({
      success: true,
      message: result.message,
      rooms: result.rooms // optional, useful if frontend needs to know
    });

  } catch (error) {
    console.error("Error creating tournament round:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/end", async (req, res) => {
  try {
      const { tournamentId } = req.query;

      if (!tournamentId) {
        return res.status(400).json({ error: "Missing tournamentId" });
      }

      const result = await endTournament(tournamentId);

      if (!result.success) {
        return res.status(404).json({ error: result.message });
      }

      return res.json({
        success: true,
        message: result.message
      });

  } catch (error) {
    console.error("Error ending tournament:", error);
    res.status(500).json({ error: "Server error" });
  }
});

const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

const io = new Server(server);

mongoose.connect(`mongodb+srv://${process.env.MONGODB_URL}`)
.then(() => {
  console.log("MongoDB Connected");
})
.catch(err => console.log("DB Connection Error:", err));

//Hardcoded
async function hardcoded() {
  const players = await fetchPlayers("68dd869c8c9854acf5ad1a1d");

  if (players.success) {
    const result = createRound(players.players, "68dd869c8c9854acf5ad1a1d");

    if (result.success) {
      console.log(result.rooms);
    }
  }
}

// 🔹 Tournament store
let tournaments = {};
function getTournament(tournamentId) {
  if (!tournaments[tournamentId]) {
    tournaments[tournamentId] = {
      rooms: [],
      allPlayers: new Map(),
      lastMoves: [],
      pendingRematch: new Map(), // ✅ store rematch requests
    };
  }
  return tournaments[tournamentId];
}

function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

async function createRound(players, tournamentId) {
  const tournament = getTournament(tournamentId);
  if (!tournament) {
    return { success: false, message: "Tournament not found" };
  }

  if (!players || players.length < 2) {
    return { success: false, message: "Not enough players to create a round" };
  }

  const { rooms, allPlayers } = tournament;
  const shuffledPlayers = shuffleArray(players); 

  for (let i = 0; i < shuffledPlayers.length; i += 2) {
    if (i + 1 >= shuffledPlayers.length) break; 

    const roomID = Math.random().toString(36);
    rooms.push({
      room_id: roomID,
      p1: shuffledPlayers[i].username,
      p2: shuffledPlayers[i + 1].username,
      p1Choice: undefined,
      p2Choice: undefined,
      p1Score: 0,
      p2Score: 0,
      hasUpdatedLeaderboard: false,
      endTime: null
    });
  }

  // Mark all players as occupied
  players.forEach(player => {
    allPlayers.set(player.username, "occupied");
  });  

  return { success: true, message: "Round created", rooms };
}

  // function findFreePlayerRepeatedly(allPlayers, interval = 5000) {
  //   return new Promise((resolve) => {
  //     const check = () => {
  //       const freePlayer = Array.from(allPlayers.entries()).find(([_, status]) => status === "free");
  //       const freePlayerName = freePlayer ? freePlayer[0] : null;

  //       if (freePlayerName) {
  //         resolve(freePlayerName); // ✅ Found a free player, return it
  //       } else {
  //         setTimeout(check, interval); // ⏱️ Try again in 5s
  //       }
  //     };

  //     check(); // start the first check
  //   });
  // }

io.on("connection", (socket) => {
  console.log("client connected");

  socket.on("disconnect", () => {
    // console.log("Client disconnected");
  });

  socket.on("createRoom", ({ tournamentId, roomID, player }) => {
    const { rooms, allPlayers } = getTournament(tournamentId);
    let existingRoom = rooms.find(r => r.room_id === roomID);

    if (!existingRoom) {

      let playersRoom = rooms.find(room => room.p1 === player || room.p2 === player);
      if (playersRoom) {
        const actual_match_id = playersRoom.room_id;        
        return socket.emit("wrongRoomCorrection", actual_match_id);
      } else {
        if (allPlayers.has(player)) {
          const status = allPlayers.get(player);
          // If they were previously occupied, mark them as free
          if (status === "occupied") {
            socket.emit("lateComers"); // frontend can start rematch flow
            
            //Create a default room for late comer but they will lose as punishment
            const newroomID = Math.random().toString(36);
            createRoom(tournamentId, newroomID, roomID, "oc_COMP_MIC_@#", player, socket);
            return socket.emit("wrongRoomCorrection", newroomID);
          }
        }
        return socket.emit("roomError", "Room is Invalid or This is not your Room");
      }
    }

    socket.emit("joinRoom");
    // ✅ Success path
    socket.join(roomID);
    console.log(`Player ${player} joined Room ${roomID} in Tournament ${tournamentId}`);
  });
  
  // 🔹 Join room
  socket.on("joinRoom", async ({ tournamentId, roomID, player }) => {
    const { rooms, allPlayers, lastMoves } = getTournament(tournamentId);

    let existingRoom = rooms.find(r => r.room_id === roomID);
    let opponent;

    // 🧩 1. Check if the room actually exists in socket.io
    if (!existingRoom) {
      // 🧠 Before rejecting, check if player exists in allPlayers
      if (allPlayers.has(player)) {
        const status = allPlayers.get(player);

        // If they were previously occupied, mark them as free
        if (status === "occupied") {
          allPlayers.set(player, "waiting");
          console.log(`♻️ ${player}'s old room (${roomID}) not found — marked as free.`);
          socket.emit("waitingNewPlayer"); // frontend can start rematch flow
          return;
        }
      }

      // If not found at all, send invalid
      return socket.emit("Not a ValidToken");
    }

    const roomSize = io.sockets.adapter.rooms.get(roomID).size;
    if (roomSize > 2) {
      return socket.emit("roomFull");
    }

    // ✅ 2. Proceed with normal join
    if (existingRoom && (existingRoom.p1 === player || existingRoom.p2 === player)) {
      socket.join(roomID);
      allPlayers.set(player, "occupied");

      if (!existingRoom.endTime) {
        existingRoom.endTime = Date.now() + 15 * 1000; // 15 seconds from now
      }

      opponent = existingRoom.p1 === player ? existingRoom.p2 : existingRoom.p1;

      try {
        const updateWinners = await Leaderboard.findOne({
          leaderboardId: tournamentId,
          username: player
        });

        socket.emit("playersConnected", {
          score: updateWinners?.score,
          existingRoom,
          timer: existingRoom.endTime,
          playerOne: existingRoom.p1,
          opponent
        });

        io.to(roomID).emit("updateLastMoves", { player, lastMoves });
      } catch (err) {
        console.error("Error updating winner:", err);
      }
    } else {
      // 🧩 Room doesn’t exist but player might still be in the tournament
      if (allPlayers.has(player)) {
        allPlayers.set(player, "free");
        console.log(`⚠️ ${player}'s assigned room invalid — set to free.`);
        socket.emit("waitingNewPlayer");
        return;
      }

      return socket.emit("Room is Invalid or This is not your Room");
    }
  });

  // 🔹 Player choice
  socket.on("p1Choice", ({ tournamentId, rpschoice, roomID, player }) => {
    const { rooms, lastMoves } = getTournament(tournamentId);
    const currentRoom = rooms.find((room) => room.room_id === roomID);
    if (!currentRoom) return;

    if (currentRoom.hasUpdatedLeaderboard === true || currentRoom.hasUpdatedLeaderboard === "true") {
      if (currentRoom.p1 === player) {
        currentRoom.p1Choice = currentRoom.p1Choice;
      } else if (currentRoom.p2 === player) {
        currentRoom.p2Choice = currentRoom.p2Choice;
      }
    } else {
      if (currentRoom.p1 === player) {
        currentRoom.p1Choice = rpschoice === "" ? null : rpschoice;
        console.log(`updated ${player} choice: ${currentRoom.p1Choice}`);
      } else if (currentRoom.p2 === player) {
        currentRoom.p2Choice = rpschoice === "" ? null : rpschoice;
        console.log(`updated ${player} choice: ${currentRoom.p2Choice}`);
      }
    }

    console.log(currentRoom);

    if (rpschoice !== undefined) {
      addMove(rpschoice, tournamentId, player);
    }

    const p1HasPlayed = currentRoom.p1Choice !== undefined;
    const p2HasPlayed = currentRoom.p2Choice !== undefined;

    if (p1HasPlayed && p2HasPlayed) {
      // Both players have played — proceed immediately
      return declareWinner(tournamentId, roomID, player, socket);
    } else {
      // If one player hasn't played, wait for 3 seconds
      setTimeout(() => {
        const p1StillPlayed = currentRoom.p1Choice !== undefined;
        const p2StillPlayed = currentRoom.p2Choice !== undefined;

        // If after 3 seconds one player still hasn't played, force declareWinner
        if (p1StillPlayed && p2StillPlayed) {
          // both played in the meantime
          return;
        } else {
          console.log("⏳ One player didn't respond in time. Declaring winner by default...");
          declareWinner(tournamentId, roomID, player, socket);
        }
      }, 2000);
    }

  });

  socket.on("p2Choice", ({ tournamentId, roomID, player, rpschoice }) => {
   const { rooms, lastMoves } = getTournament(tournamentId);
    const currentRoom = rooms.find((room) => room.room_id === roomID);
    if (!currentRoom) return;

    if (currentRoom.hasUpdatedLeaderboard === true || currentRoom.hasUpdatedLeaderboard === "true") {
      if (currentRoom.p1 === player) {
        currentRoom.p1Choice = currentRoom.p1Choice;
      } else if (currentRoom.p2 === player) {
        currentRoom.p2Choice = currentRoom.p2Choice;
      }
    } else {
      if (currentRoom.p1 === player) {
        currentRoom.p1Choice = rpschoice === "" ? null : rpschoice;
        console.log(`updated ${player} choice: ${currentRoom.p1Choice}`);
      } else if (currentRoom.p2 === player) {
        currentRoom.p2Choice = rpschoice === "" ? null : rpschoice;
        console.log(`updated ${player} choice: ${currentRoom.p2Choice}`);
      }
    }

    console.log(currentRoom);

    if (rpschoice !== undefined) {
      addMove(rpschoice, tournamentId, player);
    }

    const p1HasPlayed = currentRoom.p1Choice !== undefined;
    const p2HasPlayed = currentRoom.p2Choice !== undefined;

    if (p1HasPlayed && p2HasPlayed) {
      // Both players have played — proceed immediately
      return declareWinner(tournamentId, roomID, player, socket);
    } else {
      // If one player hasn't played, wait for 3 seconds
      setTimeout(() => {
        const p1StillPlayed = currentRoom.p1Choice !== undefined;
        const p2StillPlayed = currentRoom.p2Choice !== undefined;

        // If after 3 seconds one player still hasn't played, force declareWinner
        if (p1StillPlayed && p2StillPlayed) {
          // both played in the meantime
          return;
        } else {
          console.log("⏳ One player didn't respond in time. Declaring winner by default...");
          declareWinner(tournamentId, roomID, player, socket);
        }
      }, 2000);
    }

  });

  // 🔹 Player clicked rematch (fixed)
  socket.on("playerClicked", ({ tournamentId, roomID, player1 }) => {
    const { allPlayers, pendingRematch } = getTournament(tournamentId);
    const tournament = getTournament(tournamentId);

    if (!allPlayers || !pendingRematch || !tournament) {
      console.warn("Invalid tournament data:", tournamentId);
      return;
    }

    // Avoid duplicate waiting state
    if (pendingRematch.has(player1)) return;

    // Convert waiting players into an array
    const waitingPlayers = Array.from(pendingRematch.keys()).filter(p => p !== player1);

    if (waitingPlayers.length === 0) {
      // No one waiting → mark current player as waiting
      pendingRematch.set(player1, { socketId: socket.id, roomID });
      allPlayers.set(player1, "waiting");
      socket.emit("waitingNewPlayer");
      console.log(`${player1} is waiting for a rematch...`);
      return;
    }

    // Pick a random waiting player
    const randomIndex = Math.floor(Math.random() * waitingPlayers.length);
    const opponent = waitingPlayers[randomIndex];
    const opponentData = pendingRematch.get(opponent);

    // Remove opponent from waiting
    pendingRematch.delete(opponent);

    // Both players are now occupied
    allPlayers.set(opponent, "occupied");
    allPlayers.set(player1, "occupied");

    const newroomID = Math.random().toString(36);

    try {
      createRoom(tournamentId, newroomID, roomID, opponent, player1, socket);

      // 🧹 Clean up old room
      if (Array.isArray(tournament.rooms)) {
        tournament.rooms = tournament.rooms.filter(r => r.room_id !== roomID);
      }

      console.log(`🧹 Removed old room ${roomID} from tournament ${tournamentId}`);

      // Notify only the two players
      io.to(opponentData.socketId).emit("playAgain", { roomID: newroomID, players: [opponent, player1] });
      io.to(socket.id).emit("playAgain", { roomID: newroomID, players: [opponent, player1] });

      console.log(`🔁 Rematch created between ${opponent} and ${player1} in room ${newroomID}`);
    } catch (err) {
      console.error("Error during rematch creation:", err);
    }
  });

  // 🔹 Exit game
  socket.on("exitGame", ({ tournamentId, roomID, player }) => {
    if (player) {
      socket.to(roomID).emit("player1Left");
    } else {
      socket.to(roomID).emit("player2Left");
    }
    return socket.leave(roomID);
  });

  // End Tournament
  socket.on("endTournamentRoom", ({ tournamentId, roomId }) => {
    const tournament = getTournament(tournamentId);
    if (!tournament) return;

    // 1. Find the room
    const roomIndex = tournament.rooms.findIndex(r => r.room_id === roomId);
    if (roomIndex === -1) return;

    const room = tournament.rooms[roomIndex];

    console.log("room to be removed: ", room);
    
    // 2. Notify all players in that room
    room.players.forEach(player => {
      io.to(player.socketId).emit("tournamentHasEnded", {
        roomId,
        tournamentId,
        message: "The tournament has ended."
      });

      // 3. Remove each socket from the room
      const playerSocket = io.sockets.sockets.get(player.socketId);
      if (playerSocket) {
        playerSocket.leave(roomId);
      }
    });

    // 4. Delete the room from tournament
    tournament.rooms.splice(roomIndex, 1);

    console.log(`Tournament room ${roomId} ended.`);
  });
});

// 🔹 Helpers
function waitForFreeUser(allPlayers, socket, callback) {
  const interval = setInterval(() => {
    let freeuser = getRandomFreeUser(allPlayers);

    if (freeuser) {
      clearInterval(interval); // stop checking
      callback(freeuser); // hand freeuser back to logic
    } else {
      socket.emit("waitingNewPlayer");
    }
  }, 5000); // check every 5s
}

function addMove(choice, tournamentId, player) {
  const { lastMoves } = getTournament(tournamentId);

  // ✅ Correct way to use a dynamic key
  lastMoves.push({ [player]: choice });

  // ✅ Keep only the last 5 moves
  if (lastMoves.length > 5) {
    lastMoves.shift();
  }
}

const declareWinner = async (tournamentId, roomID, player, socket) => {
  const { rooms, allPlayers, pendingRematch } = getTournament(tournamentId);
  let winner;
  const currentRoom = rooms.find((room) => room.room_id === roomID);
  if (!currentRoom) return;

  if (currentRoom.p1Choice === undefined && currentRoom.p2Choice === undefined) {
    winner = null; // no winner
  } else if (!currentRoom.p1Choice || currentRoom.p1Choice === "null") {
    winner = currentRoom.p2; // p2 wins if p1 didn't choose
  } else if (!currentRoom.p2Choice || currentRoom.p2Choice === "null") {
    winner = currentRoom.p1; // p1 wins if p2 didn't choose
  } else if (currentRoom.p1Choice === currentRoom.p2Choice) {
    winner = "draw";
  } else if (currentRoom.p1Choice === "rock") {
    winner = currentRoom.p2Choice === "scissor" ? currentRoom.p1 : currentRoom.p2;
  } else if (currentRoom.p1Choice === "paper") {
    winner = currentRoom.p2Choice === "scissor" ? currentRoom.p2 : currentRoom.p1;
  } else if (currentRoom.p1Choice === "scissor") {
    winner = currentRoom.p2Choice === "rock" ? currentRoom.p2 : currentRoom.p1;
  }

  if (winner && winner !== "draw" && !currentRoom.hasUpdatedLeaderboard) {
    const updatescore = await Leaderboard.findOneAndUpdate(
      { leaderboardId: tournamentId, username: winner },
      { $inc: { score: 3 } },
      { new: true }
    );
    if (updatescore) console.log(`Updated Score for ${winner}`);
    currentRoom.hasUpdatedLeaderboard = true;
  }

  io.sockets.to(roomID).emit("winner", { winner, currentRoom });

  // Identify loser
  const loser = winner === currentRoom.p1 ? currentRoom.p2 : currentRoom.p1;

  // Mark loser as waiting for rematch
  if (loser) {
    allPlayers.set(loser, "waiting");
    pendingRematch.set(loser, { socketId: socket.id, roomID });
  }

  // Winner stays occupied or can be freed based on your tournament flow
  if (winner) {
    allPlayers.set(winner, "free"); // or "free" if round is over
  }
};

function getRandomFreeUser(players) {
  let freeUsers = [...players.entries()]
    .filter(([_, status]) => status === "free")
    .map(([username]) => username);

  if (freeUsers.length === 0) return null;
  return freeUsers[Math.floor(Math.random() * freeUsers.length)];
}

function createRoom(tournamentId, newroomID, oldroomID, player1, player2, socket) {
  const { rooms } = getTournament(tournamentId);
  rooms.splice(rooms.findIndex(r => r.room_id === oldroomID), 1);

  let players = [player1, player2];
  let defaultChioce;
  players.sort(() => Math.random() - 0.5);

  let newRoom = {
    room_id: newroomID,
    p1: players[0],
    p2: players[1],
    p1Choice: undefined,
    p2Choice: undefined,
    p1Score: 0,
    p2Score: 0
  };

  rooms.push(newRoom);
  socket.join(newroomID);
}

function endTournament(tournamentId) {
  const tournament = getTournament(tournamentId);
  if (!tournament) {
    return { success: false, message: "Tournament not found" };
  }
  
  // Loop through all rooms in this tournament
  tournament.rooms.forEach(room => {

    const players = [
      { username: room.p1, socketId: room.p1SocketId, room_id: room.room_id },
      { username: room.p2, socketId: room.p2SocketId, room_id: room.room_id }
    ];

    players.forEach(async player => {
      io.to(player.room_id).emit("tournamentHasEnded", {
        roomId: player.room_id,
        tournamentId,
        message: "The tournament has ended."
      });

      const socketsInRoom = await io.in(room.room_id).fetchSockets();
      for (const socket of socketsInRoom) {
        socket.leave(room.room_id);
      }
    });

  });

  // Clear all rooms from the tournament
  tournament.rooms = [];

  // Optionally, delete the tournament entirely
  deleteTournament(tournamentId); // <-- implement this function to remove from memory/DB

  console.log(`Tournament ${tournamentId} has ended and all rooms removed.`);
  return { success: true, message: "Tournament ended successfully" };
}

function deleteTournament(tournamentId) {
  if (tournaments[tournamentId]) {
    delete tournaments[tournamentId];
    console.log(`Tournament ${tournamentId} deleted from memory.`);
  } else {
    console.log(`Tournament ${tournamentId} not found.`);
  }
}
