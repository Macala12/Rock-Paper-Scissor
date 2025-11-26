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
const musicBoard = document.querySelector(".music");
const showRulesBoard = document.querySelector(".show__result_board");
const closeRules = document.querySelector(".close-btn");

const playSounds = document.querySelector('.play-sound');
const noSounds = document.querySelector('.no-sound');

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

//Sounds
const gameMusic = new Audio("../sound/game-music.mp3");
const buttonSound = new Audio("../sound/button.mp3");
const lostSound = new Audio("../sound/lost.wav");
const wonSound = new Audio("../../sound/won.wav");

// rulesBtn.addEventListener("click", () => {
//   rulesBoard.classList.toggle("show__rules_board");
//   closeRules.style.cursor = "pointer";
// });

// closeRules.addEventListener("click", () => {
//   rulesBoard.classList.toggle("show__rules_board");
// });

playSounds.addEventListener("click", () => {
  playSound(true);
});

noSounds.addEventListener("click", () => {
  playSound(false);
})

let roomID;
roomID = Math.random().toString(36);

const tournamentIDStored = sessionStorage.getItem("id");
const sessionRoom = sessionStorage.getItem("roomID");
const realPlayer = sessionStorage.getItem("player");
const sessionMusic = sessionStorage.getItem("sound");

// const connect = 'https://octagames-rock-paper-scissor.onrender.com/';

const connect = 'https://www.rps.octagames.ng/';

if (!sessionMusic) {
  musicBoard.style.display = 'flex';
  musicBoard.style.opacity = 1;
}else{
  if (sessionMusic === true || sessionMusic === "true") { 
    document.querySelector(".play-sound-true").style.display = "block";
  }
}


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

function playSound(playBoolean) {
  musicBoard.style.display = `none`;
  musicBoard.style.opacity = 0;
  
  if (playBoolean === true || playBoolean === 'true') {
    gameMusic.loop = true;
    gameMusic.play();
    sessionStorage.setItem("sound", true);
  }else{
    sessionStorage.setItem("sound", false);
  }
}

function noSound() {
  gameMusic.pause();
}

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
  }

  // if (isReload) {
  //   joinRoom();
  // }
};

socket.on("wrongRoomCorrection", (actual_match_id) => {
    window.location.href = `${connect}?player=${player}&roomId=${actual_match_id}&id=${tournamentID}`;
});

socket.on("Room is Invalid or This is not your Room", (data) => {
  ("Server says room is invalid:", data);
    const joinContainer = document.querySelector(".join__container");
    joinContainer.innerHTML = `
        <h5>Room is Invalid or This is not your Room</h5>
    `;
});

socket.on("joinRoom", () => {
  joinRoom();
});

const joinRoom = () => {
  const roomID = sessionStorage.getItem("roomID");
  const tournamentID = sessionStorage.getItem("id");
  
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
      counterMain.innerHTML = "Time's Up!!!"
      clearInterval(counterInterval);
      showAnimation(true);
      setTimeout(() => {
        sendChoice(player1Chose, opponent);
      }, 3000);

      // let counter = 3;
      // const rpsAnimation = setInterval(() => {
      //   counter--;
      //   if (counter <= 0) {
      //     clearInterval(rpsAnimation);
      //   }
      // }, 1000);

    }
  }, 1000);
};

const showAnimation = (shouldShow) => {
  const animation = document.querySelector(".animation");
  if (shouldShow) {
    animation.style.display = 'flex';
  }else{
    animation.style.display = 'none';
  }
};

socket.on("playersConnected", (data) => {
  let countdown = 3; // start from 3 seconds

  const timer = data.timer;
  const score = data.score;
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
      countdownToResult(timer, data.opponent);
    }
  }, 1000);
});

socket.on("updateLastMoves", (data) => {

  if (player) { // Change to !== player 
    const movesEl = document.querySelector(".main_opponent_last_chosen");
    movesEl.innerHTML = "";

    const moveIcons = {
      rock: "/icon-rock.jpg",
      paper: "/icon-paper.jpg",
      scissor: "/icon-scissors.jpg",
    };

    if (!data.lastMoves || data.lastMoves.length < 1) {
      movesEl.innerHTML = "<p>No last picks found</p>";
      return;
    }

    // Get moves that are NOT from this player (i.e., opponent's moves)
    const filteredMoves = data.lastMoves.filter(m => Object.keys(m)[0] !== player);

    if (!filteredMoves || filteredMoves.length === 0) {
      movesEl.innerHTML = "<p>No last picks for this player</p>";
      return;
    }

    filteredMoves.forEach(m => {
      const opponent = Object.keys(m)[0];
      const move = m[opponent]; // ✅ now we use the correct key

      const btn = document.createElement("button");
      btn.classList.add("choice__");

      btn.innerHTML = `
        <div class="choice">
          <img src="${moveIcons[move]}" alt="${move}" class="choice__img" />
        </div>
      `;

      movesEl.appendChild(btn);
    });
  }
});

socket.on("alreadyUpdate", () => {
  alert("score already updates");
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
  buttonSound.play();
  setChoice(rpschoice);
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
    displayResult(data.rpsValue);
    oppoTitle.innerText = "OPPO PICKED";
    oppoChoice.classList.remove("waiting_to_chose");
  }
});

socket.on("p2Choice", (data) => {
  if (player1) {
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
  gameMusic.pause();
  showAnimation(false);

  if (winner == "draw") {
    oppoTitle.innerHTML = opponentUsername.replace(/[^\w]/g, "") + " Picked";
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
    oppoTitle.innerHTML = opponentUsername.replace(/[^\w]/g, "") + " Picked";
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
      wonSound.play();
      oppoTitle.innerHTML = opponentUsername.replace(/[^\w]/g, "");
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
        } else if (data.currentRoom.p1Choice === "undefined" || !data.currentRoom.p1Choice) {
          yourChoice.innerHTML = "No Choice"
        }

        if (data.currentRoom.p2Choice == "paper") {
          oppoChoice.innerHTML = paperChoice;       
        } else if (data.currentRoom.p2Choice == "rock") {
          oppoChoice.innerHTML = rockChoice;
        } else if (data.currentRoom.p2Choice == "scissor") {
          oppoChoice.innerHTML = scissorChoice;
        } else if (data.currentRoom.p2Choice === "undefined" || !data.currentRoom.p2Choice) {
          oppoChoice.innerHTML = "No Choice"
        }
      }else{
        if (data.currentRoom.p2Choice == "paper") {
          yourChoice.innerHTML = paperChoice;       
        } else if (data.currentRoom.p2Choice == "rock") {
          yourChoice.innerHTML = rockChoice;
        } else if (data.currentRoom.p2Choice == "scissor") {
          yourChoice.innerHTML = scissorChoice;
        } else if (data.currentRoom.p2Choice === "undefined" || !data.currentRoom.p2Choice) {
          yourChoice.innerHTML = "No Choice"
        }
        
        if (data.currentRoom.p1Choice == "paper") {
          oppoChoice.innerHTML = paperChoice;       
        } else if (data.currentRoom.p1Choice == "rock") {
          oppoChoice.innerHTML = rockChoice;
        } else if (data.currentRoom.p1Choice == "scissor") {
          oppoChoice.innerHTML = scissorChoice;
        } else if (data.currentRoom.p1Choice === "undefined" || !data.currentRoom.p1Choice) {
          oppoChoice.innerHTML = "No Choice"
        }
      }

    } else {
      lostSound.play();
      oppoTitle.innerHTML = opponentUsername.replace(/[^\w]/g, "");
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
        } else if (!data.currentRoom.hasOwnProperty("p1Choice") || !data.currentRoom.p1Choice) {
          yourChoice.innerHTML = "No Choice"
        }

        if (data.currentRoom.p2Choice == "paper") {
          oppoChoice.innerHTML = paperChoice;       
        } else if (data.currentRoom.p2Choice == "rock") {
          oppoChoice.innerHTML = rockChoice;
        } else if (data.currentRoom.p2Choice == "scissor") {
          oppoChoice.innerHTML = scissorChoice;
        } else if (!data.currentRoom.hasOwnProperty("p2Choice") || !data.currentRoom.p2Choice) {
          oppoChoice.innerHTML = "No Choice"
        }
      }else{
        if (data.currentRoom.p2Choice == "paper") {
          yourChoice.innerHTML = paperChoice;       
        } else if (data.currentRoom.p2Choice == "rock") {
          yourChoice.innerHTML = rockChoice;
        } else if (data.currentRoom.p2Choice == "scissor") {
          yourChoice.innerHTML = scissorChoice;
        } else if (!data.currentRoom.hasOwnProperty("p2Choice") || !data.currentRoom.p2Choice) {
          yourChoice.innerHTML = "No Choice"
        }
        
        if (data.currentRoom.p1Choice == "paper") {
          oppoChoice.innerHTML = paperChoice;       
        } else if (data.currentRoom.p1Choice == "rock") {
          oppoChoice.innerHTML = rockChoice;
        } else if (data.currentRoom.p1Choice == "scissor") {
          oppoChoice.innerHTML = scissorChoice;
        } else if (!data.currentRoom.hasOwnProperty("p1Choice") || !data.currentRoom.p1Choice) {
          oppoChoice.innerHTML = "No Choice"
        }
      }
    }
  } 

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
  buttonSound.play();
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
  document.querySelector(".searchingText").innerHTML = "Searching for next player <span></span>";
  document.querySelector(".searchingText").classList.add('loading');
});

socket.on("lateComers", () => {
  console.log("late comer");
});

socket.on("endOldRoom", (data) => {
    const roomID = sessionStorage.getItem("roomID");
    const tournamentID = sessionStorage.getItem("id");
    socket.emit("endTournamentRoom", { tournamentId: tournamentID, roomId: roomID});
});

socket.on("playAgain", (data) => {
  roomID = data.roomID;
  const tournamentID = sessionStorage.getItem("id");
  sessionStorage.setItem("roomID", roomID);

  window.location.href = `${connect}?player=${player}&roomId=${roomID}&id=${tournamentID}`;

  removeWinner();
  returnToGame();
});

socket.on("tournamentHasEnded", (data) => {
  sessionStorage.clear();
  window.location.href = `${connect}end.html?t_id=${tournamentID}`;
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


