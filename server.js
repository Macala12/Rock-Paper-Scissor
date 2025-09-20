import { fileURLToPath } from "url"; 
import path from "path"; 
import { Server } from "socket.io"; 
import mongoose from "mongoose";
import express from "express";
import Leaderboard from "./models/Leaderboard.js";
import fetchPlayers from "./controller/fetch_players.js";

const app = express();
const PORT = process.env.PORT || 4000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, "public")));
app.use(express.static(path.join(__dirname, "view")));
app.use(express.static(path.join(__dirname, "images")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "", "index.html"));
});

const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

const io = new Server(server);

let playersDbs;

mongoose.connect("mongodb+srv://michael-user-1:Modubass1212@assetron.tdmvued.mongodb.net/octagames")
.then(() => {
    console.log("MongoDB Connected");
    return fetchPlayers("68a64d526223e4d5e74daaea");
})
.then(playersDb => {
    playersDbs = playersDb;
    const round = createRound(playersDb, "68a64d526223e4d5e74daaea");
    console.log(round);
})
.catch(err => console.log("DB Connection Error:", err));

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

function createRound(players, tournamentId) {
  const { rooms, allPlayers } = getTournament(tournamentId);
  const shuffledPlayers = shuffleArray(players); 

  for (let i = 0; i < shuffledPlayers.length; i += 2) {
    if (i + 1 >= shuffledPlayers.length) break; 

    const roomID = Math.random().toString(36);
    rooms.push({
      room_id: roomID,
      p1: shuffledPlayers[i].username,
      p2: shuffledPlayers[i + 1].username,
      p1Choice: null,
      p2Choice: null,
      p1Score: 0,
      p2Score: 0,
      endTime: null
    });
  }

  playersDbs.forEach(player => {
    allPlayers.set(player.username, "occupied");
  });  

  return rooms;
}

io.on("connection", (socket) => {
  console.log("client connected");

  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });

  socket.on("createRoom", ({ tournamentId, roomID }) => {
    const { rooms } = getTournament(tournamentId);

    console.log("Tournament ID: ",tournamentId);
    
    let existingRoom = rooms.find(r => r.room_id === roomID);
    if (!existingRoom) {
      rooms.push({
        room_id: roomID,
        p1: "michael",
        p2: "david",
        p1Choice: null,
        p2Choice: null,
        p1Score: 0,
        p2Score: 0
      });
      console.log(`Created new room: ${roomID} in tournament ${tournamentId}`);
    } else {
      console.log(`Room ${roomID} already exists in tournament ${tournamentId}`);
    }

    socket.join(roomID);
    console.log("Rooms:", rooms);
  });
  
  // 🔹 Join room
  socket.on("joinRoom", async ({ tournamentId, roomID, player }) => {
    const { rooms, allPlayers, lastMoves } = getTournament(tournamentId);

    let existingRoom = rooms.find(r => r.room_id === roomID);
    let opponent;

    if (!io.sockets.adapter.rooms.has(roomID)) {
      return socket.emit("Not a ValidToken");
    }

    const roomSize = io.sockets.adapter.rooms.get(roomID).size;
    if (roomSize > 2) {
      return socket.emit("roomFull");
    }

    if (existingRoom && (existingRoom.p1 === player || existingRoom.p2 === player)) {
      socket.join(roomID);   
      allPlayers.set(player, "occupied");

      // ✅ Ensure we only set endTime once
      if (!existingRoom.endTime) {
        existingRoom.endTime = Date.now() + 15 * 1000; // 15 seconds from now
      }

      if (existingRoom.p1 === player) {
        opponent = existingRoom.p2;
      } else if (existingRoom.p2 === player) {
        opponent = existingRoom.p1;
      }

      try {
        const updateWinners = await Leaderboard.findOne(
          { leaderboardId: "68a64d526223e4d5e74daaea", username: player }
        );

        socket.emit("playersConnected", {
          score: updateWinners?.score || 0,
          existingRoom,
          timer: existingRoom.endTime,  // ✅ use saved endTime
          opponent: opponent
        });

        io.to(roomID).emit("updateLastMoves", {
          player,   
          lastMoves
        });

      } catch (err) {
        console.error("Error updating winner:", err);
      }
    } else {
      return socket.emit("Not your room");
    }
  });

  // 🔹 Player choice
  socket.on("p1Choice", ({ tournamentId, roomID, player, rpschoice }) => {
    console.log("Checking if it is undefined for p1Choice:", rpschoice);

    const { rooms, lastMoves } = getTournament(tournamentId);
    const currentRoom = rooms.find((room) => room.room_id === roomID);
    if (!currentRoom) return;

    if (currentRoom.p1 === player) {
      currentRoom.p1Choice = rpschoice;
    } else if (currentRoom.p2 === player) {
      currentRoom.p2Choice = rpschoice;
    }

    console.log(currentRoom);

    if (rpschoice !== undefined) {
      addMove(rpschoice, tournamentId);
    }
    return declareWinner(tournamentId, roomID, player);
  });

  socket.on("p2Choice", ({ tournamentId, roomID, player, rpschoice }) => {
    const { rooms, lastMoves } = getTournament(tournamentId);
    const currentRoom = rooms.find((room) => room.room_id === roomID);
    if (!currentRoom) return;

    if (currentRoom.p1 === player) {
      currentRoom.p1Choice = rpschoice;
    } else if (currentRoom.p2 === player) {
      currentRoom.p2Choice = rpschoice;
    }

    console.log(currentRoom);

    if (rpschoice !== undefined) {
      addMove(rpschoice, tournamentId);
    }
    return declareWinner(tournamentId, roomID, player);
  });

  // 🔹 Player clicked rematch (fixed)
  socket.on("playerClicked", ({ tournamentId, roomID, player1 }) => {
    const { allPlayers, pendingRematch } = getTournament(tournamentId);

    // Convert waiting players into an array
    const waitingPlayers = Array.from(pendingRematch.keys()).filter(p => p !== player1);

    if (waitingPlayers.length === 0) {
      // No one waiting → mark current player as waiting
      pendingRematch.set(player1, { socketId: socket.id, roomID });
      allPlayers.set(player1, "waiting");
      socket.emit("waitingNewPlayer");
      console.log(`${player1} is waiting for a rematch...`);
    } else {
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

      createRoom(tournamentId, newroomID, roomID, opponent, player1, socket);

      // ✅ Send the event to both players directly
      io.to(roomID).emit("endOldRoom"); // optional: tell old room to close
      io.emit("playAgain", { roomID: newroomID, players: [opponent, player1] });

      console.log(`Rematch created between ${opponent} and ${player1} in room ${newroomID}`);
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
      console.log("No free user yet, retrying in 5s...");
    }
  }, 5000); // check every 5s
}

function addMove(choice, tournamentId) {
  const { lastMoves } = getTournament(tournamentId);
  lastMoves.push({ "move": choice });
  if (lastMoves.length > 5) {
    lastMoves.shift();
  }
}

const declareWinner = async (tournamentId, roomID, player) => {
  const { rooms, allPlayers } = getTournament(tournamentId);
  let winner;
  const currentRoom = rooms.find((room) => room.room_id === roomID);
  if (!currentRoom) return;

  if (currentRoom.p1Choice === undefined && currentRoom.p2Choice === undefined) {
    winner = null; // no winner
  } else if (currentRoom.p1Choice === undefined) {
    winner = currentRoom.p2; // p2 wins if p1 didn't choose
  } else if (currentRoom.p2Choice === undefined) {
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

  try {
    if (winner !== "draw") {
      await Leaderboard.findOneAndUpdate(
        { leaderboardId: "68a64d526223e4d5e74daaea", username: winner },
        { $inc: { score: 3 } },
        { new: true }
      );
    }
  } catch (err) {
    console.error("Error updating winner:", err);
  }

  if (winner !== "draw" || !winner) { // Add !== player to this place
    allPlayers.set(player, "free");
  }

  return io.sockets.to(roomID).emit("winner", { winner, currentRoom });
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
  players.sort(() => Math.random() - 0.5);

  let newRoom = {
    room_id: newroomID,
    p1: players[0],
    p2: players[1],
    p1Choice: null,
    p2Choice: null,
    p1Score: 0,
    p2Score: 0
  };

  rooms.push(newRoom);
  socket.join(newroomID);
}
