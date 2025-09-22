const urlParams = new URLSearchParams(window.location.search);
const player = urlParams.get("player");
const roomUrlId = urlParams.get("roomId");
const tournamentID = urlParams.get("id");

const gameArea = document.querySelector(".main");
const rock = document.querySelector(".choice__rock");
const paper = document.querySelector(".choice__paper");
const scissor = document.querySelector(".choice__scissor");
const counterMain = document.querySelector(".counter");

const header = document.querySelector(".header");
const scoreNum = document.querySelector(".score__number");

const oppoTitle = document.querySelector('.opponents__result');

const exitBtn = document.querySelector('.exit__btn');
const rulesBtn = document.querySelector(".rules__button");
const rulesBoard = document.querySelector(".rules");
const showRulesBoard = document.querySelector(".show__result_board");
const closeRules = document.querySelector(".close-btn");

const gameFooter = document.querySelector('.footer');

const resultMain = document.querySelector(".result_main");
const resultBoard = document.querySelector(".result__board");
const oppoChoice = document.querySelector(".oppo__choice");
const yourChoice = document.querySelector(".your__choice");

const results = document.querySelector(".results");
const resultsHeading = document.querySelector(".results__heading");
const resultButton = document.querySelector(".results__button");

const joinPage = document.querySelector(".join");

const paperChoice = `
    <button class="choice__paper" onclick="clickChoice('paper')">
        <div class="choice">
            <img
              src="/icon-paper.jpg"
              alt="Paper"
              class="choice__img"
            />
        </div>
    </button>
`;
const rockChoice = `
    <button class="choice__rock" onclick="clickChoice('rock')">
        <div class="choice">
            <img 
                src="/icon-rock.jpg" 
                alt="Rock" 
                class="choice__img"
            />
        </div>
    </button>
`;
const scissorChoice = `
    <button class="choice__scissor" onclick="clickChoice('scissor')">
        <div class="choice">
            <img
                src="/icon-scissors.jpg"
                alt="Scissor"
                class="choice__img"
            />
        </div>
    </button>
`;

rulesBtn.addEventListener("click", () => {
  rulesBoard.classList.toggle("show__rules_board");
  closeRules.style.cursor = "pointer";
});

closeRules.addEventListener("click", () => {
  rulesBoard.classList.toggle("show__rules_board");
});

let roomID;
roomID = Math.random().toString(36);

const tournamentIDStored = sessionStorage.getItem("id");
const sessionRoom = sessionStorage.getItem("roomID");
const realPlayer = sessionStorage.getItem("player");
const connect = 'https://octagames-rock-paper-scissor.onrender.com/';

if (!tournamentIDStored) {
    sessionStorage.setItem("id", tournamentID);
} else if (tournamentIDStored !== tournamentID) {
      sessionStorage.setItem("id", tournamentID);
}

if (!sessionRoom) {
  sessionStorage.setItem("roomID", roomUrlId);
  if (!realPlayer) {
    sessionStorage.setItem("player", player);
  }
}else{
  if (sessionRoom !== roomUrlId) {
    sessionStorage.setItem("roomID", roomUrlId);
  }
  if (realPlayer !== paper) {
    sessionStorage.setItem("player", player);
  }
}

let player1 = sessionStorage.getItem("player");
let winner;
let counter;
let player1Score = 0;
let player2Score = 0;
let opponentUsername;
let previousChoice = null;
let isPreviousChoice = false;
let player1Chose, player2Chose;

///Socket
const socket = io.connect( `${connect}`, { secure: true, transports: [ "flashsocket","polling","websocket" ] } );

const createRoom = (isReload) => {
  const roomID = sessionStorage.getItem("roomID");
  const tournamentID = sessionStorage.getItem("id");

  if (roomID) {
    socket.emit("createRoom", { 
      tournamentId: tournamentID, 
      roomID: roomID,
      player: player1 
    });
    console.log(roomID); 
  }

  if (isReload) {
    joinRoom();
  }
};

socket.on("wrongRoomCorrection", ({actual_match_id}) => {
    window.location.href = `https://octagames-rock-paper-scissor.onrender.com/?player=${player}&id=${actual_match_id}`;
});

socket.on("Room is Invalid or This is not your Room", (data) => {
  console.log("Server says room is invalid:", data);
    const joinContainer = document.querySelector(".join__container");
    joinContainer.innerHTML = `
        <h5>Room is Invalid or This is not your Room</h5>
    `;
});

const joinRoom = () => {
  const roomID = sessionStorage.getItem("roomID");
  const tournamentID = sessionStorage.getItem("id");
  console.log(roomID);
  
  if (!roomID) {
    alert("Room Token is Required ");
    return joinPage.classList.add('flex');
  }

  socket.on('notValidToken', () => {
    return alert('Invalid Token..');
  })
  
  socket.on('roomFull', () => {
    alert('Max player reached !');
    return joinPage.classList.add('flex');
  })

  socket.emit("joinRoom", { 
    tournamentId: tournamentID, 
    roomID: roomID, 
    player: player 
  });
};

const countdownToResult = (futureTime, opponent) => {
  let counter = Math.ceil((futureTime - Date.now()) / 1000); // convert ms diff to seconds
  const counterInterval = setInterval(() => {
    counter--;
    counterMain.innerHTML = `${counter}s`;

    if (counter <= 0) {
      clearInterval(counterInterval);
      sendChoice(player1Chose, opponent);
    }
  }, 1000);
};

socket.on("playersConnected", (data) => {
  let countdown = 3; // start from 3 seconds

  const timer = data.timer;
  const countdownEl = document.querySelector(".join__container h5");
  const opponent = document.querySelector(".opponent__");
  const user = document.querySelector(".user__");
  const oppoText = document.querySelector(".oppo__choice_text");
  
  if (data.existingRoom.p1 === player) {
    opponentUsername = data.existingRoom.p2;
  }else{
    opponentUsername = data.existingRoom.p1
  }

  oppoText.innerHTML = opponentUsername + ' Last Picks';

  // show initial countdown text
  countdownEl.innerHTML = `Joining in ${countdown}...`;

  // run a timer that updates every second
  const interval = setInterval(() => {
    countdown--;
    countdownEl.innerHTML = `Joining in ${countdown}...`;

    if (countdown <= 0) {
      clearInterval(interval);

      // after countdown ends, show game area
      scoreNum.innerHTML = data.score;
      joinPage.classList.add("none");
      header.classList.add("flex");
      gameArea.classList.add("flex");
      gameFooter.classList.add("flex");
      user.innerHTML = player;
      opponent.innerHTML = opponentUsername;
      countdownToResult(timer, data.opponent)
    }
  }, 1000);
});

socket.on("updateLastMoves", (data) => {
  console.log("Player:", data.player);
  console.log("Last Moves:", data.lastMoves);

  if (data.player !== player) { // Change to !== player 
    const movesEl = document.querySelector(".main_opponent_last_chosen");

    // Clear old moves
    movesEl.innerHTML = "";

    // Map move name to image path
    const moveIcons = {
      rock: "/icon-rock.jpg",
      paper: "/icon-paper.jpg",
      scissor: "/icon-scissors.jpg"
    };

    if (data.lastMoves.length < 1) {
      return movesEl.innerHTML = "<p>No last picks found</p>"
    }

    // Render each move as an image button
    data.lastMoves.forEach(m => {
      const btn = document.createElement("button");
      btn.classList.add("choice__");

      btn.innerHTML = `
        <div class="choice">
          <img src="${moveIcons[m.move]}" alt="${m.move}" class="choice__img" />
        </div>
      `;

      movesEl.appendChild(btn);
    });
  }
});

if (player && roomUrlId) {
  const isReload = true;
  createRoom(isReload);
}

const sendChoice = (rpschoice, opponent) => {
  const roomID = sessionStorage.getItem("roomID");
  const tournamentID = sessionStorage.getItem("id");

  let player;
  if (player1 !== opponent) {
    player = "p1Choice";
  } else{
    player = "p2Choice";
  }

  socket.emit(player, {
    tournamentId: tournamentID,
    rpschoice: rpschoice,
    roomID: roomID,
    player: player1
  });
}

const clickChoice = (rpschoice) => {
 player1Chose = rpschoice;

 setChoice(rpschoice);
  // if(!isPreviousChoice){
  //   isPreviousChoice = true;
  //   previousChoice = rpschoice;
  // }

  // if (rpschoice == "rock") {
  //   if (previousChoice === "paper") {
  //     paper.classList.remove("chosen");
  //   }else if(previousChoice === "scissor"){
  //     scissor.classList.remove("chosen");
  //   }
  //   rock.classList.add("chosen");
  // }
  // if (rpschoice == "paper") {
  //   if (previousChoice === "rock") {
  //     rock.classList.remove("chosen");
  //   }else if(previousChoice === "scissor"){
  //     scissor.classList.remove("chosen");
  //   }
  //   paper.classList.add("chosen");
  // }
  // if (rpschoice == "scissor") {
  //   if (previousChoice === "paper") {
  //     paper.classList.remove("chosen");
  //   }else if(previousChoice === "rock"){
  //     rock.classList.remove("chosen");
  //   }
  //   scissor.classList.add("chosen");
  // }
};

function setChoice(rpschoice) {
  // Map choice names to DOM elements
  const choices = {
    rock: rock,
    paper: paper,
    scissor: scissor
  };

  // remove highlight from previous choice
  if (previousChoice) {
    choices[previousChoice].classList.remove("chosen");
  }

  // add highlight to current choice
  choices[rpschoice].classList.add("chosen");

  // save current choice as previous
  previousChoice = rpschoice;
};

const displayResult = (choice) => {
  results.classList.remove("none");
  results.classList.add("grid");
 
  if (choice == "rock") {
    oppoChoice.innerHTML = rockChoice;
    oppoChoice.classList.toggle("increase-size");
  }
  if (choice == "paper") {
    oppoChoice.innerHTML = paperChoice;
    oppoChoice.classList.toggle("increase-size");
  }
  if (choice == "scissor") {
    oppoChoice.innerHTML = scissorChoice;
    oppoChoice.classList.toggle("increase-size");
  }
};

socket.on("p1Choice", (data) => {
  if (!player1) {
    console.log('p1Choice');
    displayResult(data.rpsValue);
    oppoTitle.innerText = "OPPO PICKED";
    oppoChoice.classList.remove("waiting_to_chose");
  }
});

socket.on("p2Choice", (data) => {
  if (player1) {
    console.log('p2Choice');
    displayResult(data.rpsValue);
    oppoTitle.innerText = "OPPO PICKED";
    oppoChoice.classList.remove("waiting_to_chose");
  }
});

const updateScore = (p1Score, p2Score) => {
  // if(player1){
  //   scoreNum.innerText = p1Score;
  // }

  // if(!player1){
  //   scoreNum.innerText = p2Score;
  // }
};

socket.on("winner", data => {
  winner = data.winner;
  console.log(data);
  
  if (winner == "draw") {
    oppoTitle.innerHTML = opponentUsername + " Picked";
    resultMain.classList.add("block");
    resultBoard.classList.add("grid");

    resultsHeading.innerText = "DRAW";

    if (data.currentRoom.p1 === player1) {
      if (data.currentRoom.p1Choice == "paper") {
        yourChoice.innerHTML = paperChoice;       
      } else if (data.currentRoom.p1Choice == "rock") {
        yourChoice.innerHTML = rockChoice;
      } else if (data.currentRoom.p1Choice == "scissor") {
        yourChoice.innerHTML = scissorChoice;
      }

      if (data.currentRoom.p2Choice == "paper") {
        oppoChoice.innerHTML = paperChoice;       
      } else if (data.currentRoom.p2Choice == "rock") {
        oppoChoice.innerHTML = rockChoice;
      } else if (data.currentRoom.p2Choice == "scissor") {
        oppoChoice.innerHTML = scissorChoice;
      }
    }else{
      if (data.currentRoom.p2Choice == "paper") {
        yourChoice.innerHTML = paperChoice;       
      } else if (data.currentRoom.p2Choice == "rock") {
        yourChoice.innerHTML = rockChoice;
      } else if (data.currentRoom.p2Choice == "scissor") {
        yourChoice.innerHTML = scissorChoice;
      }   
      
      if (data.currentRoom.p1Choice == "paper") {
        oppoChoice.innerHTML = paperChoice;       
      } else if (data.currentRoom.p1Choice == "rock") {
        oppoChoice.innerHTML = rockChoice;
      } else if (data.currentRoom.p1Choice == "scissor") {
        oppoChoice.innerHTML = scissorChoice;
      }   
    }

  } else if (!winner) {
    oppoTitle.innerHTML = opponentUsername + " Picked";
    resultMain.classList.add("block");
    resultBoard.classList.add("grid");

    resultsHeading.innerText = "DRAW";

    if (data.currentRoom.p1 === player1) {
      if (data.currentRoom.p1Choice == "paper") {
        yourChoice.innerHTML = paperChoice;       
      } else if (data.currentRoom.p1Choice == "rock") {
        yourChoice.innerHTML = rockChoice;
      } else if (data.currentRoom.p1Choice == "scissor") {
        yourChoice.innerHTML = scissorChoice;
      }

      if (data.currentRoom.p2Choice == "paper") {
        oppoChoice.innerHTML = paperChoice;       
      } else if (data.currentRoom.p2Choice == "rock") {
        oppoChoice.innerHTML = rockChoice;
      } else if (data.currentRoom.p2Choice == "scissor") {
        oppoChoice.innerHTML = scissorChoice;
      }
    }else{
      if (data.currentRoom.p2Choice == "paper") {
        yourChoice.innerHTML = paperChoice;       
      } else if (data.currentRoom.p2Choice == "rock") {
        yourChoice.innerHTML = rockChoice;
      } else if (data.currentRoom.p2Choice == "scissor") {
        yourChoice.innerHTML = scissorChoice;
      }   
      
      if (data.currentRoom.p1Choice == "paper") {
        oppoChoice.innerHTML = paperChoice;       
      } else if (data.currentRoom.p1Choice == "rock") {
        oppoChoice.innerHTML = rockChoice;
      } else if (data.currentRoom.p1Choice == "scissor") {
        oppoChoice.innerHTML = scissorChoice;
      }   
    }
  } else if (player1) {
    if (winner === player1) {
      oppoTitle.innerHTML = opponentUsername;
      resultMain.classList.add("block");
      resultBoard.classList.add("grid");

      resultsHeading.innerText = "YOU WIN";
      resultButton.style.color = "#0D9276";

      if (data.currentRoom.p1 === player1) {
        if (data.currentRoom.p1Choice == "paper") {
          yourChoice.innerHTML = paperChoice;       
        } else if (data.currentRoom.p1Choice == "rock") {
          yourChoice.innerHTML = rockChoice;
        } else if (data.currentRoom.p1Choice == "scissor") {
          yourChoice.innerHTML = scissorChoice;
        } else if (data.currentRoom.p1Choice === "undefined") {
          yourChoice.innerHTML = "No Choice"
        }

        if (data.currentRoom.p2Choice == "paper") {
          oppoChoice.innerHTML = paperChoice;       
        } else if (data.currentRoom.p2Choice == "rock") {
          oppoChoice.innerHTML = rockChoice;
        } else if (data.currentRoom.p2Choice == "scissor") {
          oppoChoice.innerHTML = scissorChoice;
        } else if (data.currentRoom.p2Choice === "undefined") {
          oppoChoice.innerHTML = "No Choice"
        }
      }else{
        if (data.currentRoom.p2Choice == "paper") {
          yourChoice.innerHTML = paperChoice;       
        } else if (data.currentRoom.p2Choice == "rock") {
          yourChoice.innerHTML = rockChoice;
        } else if (data.currentRoom.p2Choice == "scissor") {
          yourChoice.innerHTML = scissorChoice;
        } else if (data.currentRoom.p2Choice === "undefined") {
          yourChoice.innerHTML = "No Choice"
        }
        
        if (data.currentRoom.p1Choice == "paper") {
          oppoChoice.innerHTML = paperChoice;       
        } else if (data.currentRoom.p1Choice == "rock") {
          oppoChoice.innerHTML = rockChoice;
        } else if (data.currentRoom.p1Choice == "scissor") {
          oppoChoice.innerHTML = scissorChoice;
        } else if (data.currentRoom.p1Choice === "undefined") {
          oppoChoice.innerHTML = "No Choice"
        }
      }

    } else {
      oppoTitle.innerHTML = opponentUsername;
      resultMain.classList.add("block");
      resultBoard.classList.add("grid")

      resultsHeading.innerText = "YOU LOSE";
      resultButton.style.color = "#FF004D";
    
      if (data.currentRoom.p1 === player1) {
        if (data.currentRoom.p1Choice == "paper") {
          yourChoice.innerHTML = paperChoice;       
        } else if (data.currentRoom.p1Choice == "rock") {
          yourChoice.innerHTML = rockChoice;
        } else if (data.currentRoom.p1Choice == "scissor") {
          yourChoice.innerHTML = scissorChoice;
        } else if (!data.currentRoom.hasOwnProperty("p1Choice")) {
          yourChoice.innerHTML = "No Choice"
        }

        if (data.currentRoom.p2Choice == "paper") {
          oppoChoice.innerHTML = paperChoice;       
        } else if (data.currentRoom.p2Choice == "rock") {
          oppoChoice.innerHTML = rockChoice;
        } else if (data.currentRoom.p2Choice == "scissor") {
          oppoChoice.innerHTML = scissorChoice;
        } else if (!data.currentRoom.hasOwnProperty("p2Choice")) {
          oppoChoice.innerHTML = "No Choice"
        }
      }else{
        if (data.currentRoom.p2Choice == "paper") {
          yourChoice.innerHTML = paperChoice;       
        } else if (data.currentRoom.p2Choice == "rock") {
          yourChoice.innerHTML = rockChoice;
        } else if (data.currentRoom.p2Choice == "scissor") {
          yourChoice.innerHTML = scissorChoice;
        } else if (!data.currentRoom.hasOwnProperty("p2Choice")) {
          yourChoice.innerHTML = "No Choice"
        }
        
        if (data.currentRoom.p1Choice == "paper") {
          oppoChoice.innerHTML = paperChoice;       
        } else if (data.currentRoom.p1Choice == "rock") {
          oppoChoice.innerHTML = rockChoice;
        } else if (data.currentRoom.p1Choice == "scissor") {
          oppoChoice.innerHTML = scissorChoice;
        } else if (!data.currentRoom.hasOwnProperty("p2Choice")) {
          oppoChoice.innerHTML = "No Choice"
        }
      }
    }
  } 
  // else if (data == "p2") {
  //   if (!player1) {
  //     resultsHeading.innerText = "YOU WIN";
  //     resultButton.style.color = "#0D9276";
  //     yourChoice.classList.add("winner");
  //     player2Score = player2Score + 1;
  //     updateScore(player1Score, player2Score); 
  //   } else {
  //     resultsHeading.innerText = "YOU LOSE";
  //     resultButton.style.color = "#FF004D";
  //     oppoChoice.classList.add("winner");
  //   }
  // }
  
  resultBoard.classList.add("after-choosing");
  results.classList.remove("none");
  results.classList.add("grid");
});

const returnToGame = () => {
  player1Score = 0;
  player2Score = 0;

  resultMain.classList.remove("block");
  resultMain.classList.add("none");
  resultBoard.classList.remove("grid");
  resultBoard.classList.add("none");
  resultBoard.classList.remove("after-choosing");
  //results
  results.classList.remove("grid");
  results.classList.add("none");
  //choice
  yourChoice.innerHTML = "";
  yourChoice.classList.toggle("increase-size");
  oppoChoice.innerHTML = "";
  oppoChoice.classList.toggle("increase-size");
  //main game area
  gameArea.classList.remove("none");
  gameArea.classList.add("flex");
  //OPPO choice
  oppoTitle.innerText = 'Choosing...';
};

const removeWinner = () => {

  if(oppoChoice.classList.contains('winner') || yourChoice.classList.contains('winner')){
    oppoChoice.classList.remove("winner");
    yourChoice.classList.remove("winner");
  }

};

const playAgain = () => {
  const roomID = sessionStorage.getItem("roomID");
  const tournamentID = sessionStorage.getItem("id");

  socket.emit("playerClicked", {
    tournamentId: tournamentID,
    roomID: roomID,
    player1: player1,
  });

  document.querySelector(".searchingText").innerHTML = "<span></span>";
  document.querySelector(".searchingText").classList.add('loading');

  removeWinner();
  // returnToGame();
};

socket.on("waitingNewPlayer", (data) => {
  document.querySelector(".searchingText").innerHTML = "Searching for next player... <span></span>";
  document.querySelector(".searchingText").classList.add('loading');
});

socket.on("endOldRoom", (data) => {
    const roomID = sessionStorage.getItem("roomID");
    const tournamentID = sessionStorage.getItem("id");
    socket.emit("endTournamentRoom", { tournamentId: tournamentID, roomId: roomID});
});

socket.on("playAgain", (data) => {
  roomID = data.roomID;
  console.log(data);
  sessionStorage.setItem("roomID", roomID);

  window.location.href = `https://octagames-rock-paper-scissor.onrender.com/?player=${player}&id=${roomID}`;

  removeWinner();
  returnToGame();
});

socket.on("tournamentHasEnded", (data) => {
  console.log("ended");
  sessionStorage.removeItem("player");
  sessionStorage.removeItem("roomID");
  sessionStorage.removeItem("id");
  window.location.href = `https://octagames-rock-paper-scissor.onrender.com/end.html`;
});

const returnToLogin = () => {
  joinPage.classList.remove("none");
  joinPage.classList.add('flex');
  header.classList.remove("flex");
  header.classList.add("none");
  gameArea.classList.remove("flex");
  gameArea.classList.add("none");
  gameFooter.classList.remove("flex");
  gameFooter.classList.add("none");
  resultMain.classList.remove("block");
  resultMain.classList.add("none");
  resultBoard.classList.remove("grid");
  resultBoard.classList.add("none");
}

const exitGame =  () => {
  socket.emit('exitGame', {roomID : roomID, player : player1});
  returnToLogin();
};

socket.on('player1Left', () => {
  if(!player1){
    alert('player 1 left')
    returnToLogin();
  }
})

socket.on('player2Left', () => {
  if(player1){
    alert('player 2 left')
    returnToLogin();
  }
})


