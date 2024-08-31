// ==UserScript==
// @name          AMQ Spy Host
// @namespace     https://github.com/ayyu/
// @version       0.6
// @description   Hosts Spy vs. Spy game mode. Use /spy start to start it and /spy stop to stop it.
// @author        ayyu
// @match         https://animemusicquiz.com/*
// @grant         none
// @require       https://raw.githubusercontent.com/TheJoseph98/AMQ-Scripts/master/common/amqScriptInfo.js
// @downloadURL   https://raw.githubusercontent.com/ayyu/amq-userscripts/master/userscripts/amqHostSpyMode.user.js
// @updateURL     https://raw.githubusercontent.com/ayyu/amq-userscripts/master/userscripts/amqHostSpyMode.user.js
// ==/UserScript==

if (document.getElementById('startPage')) return;
let loadInterval = setInterval(() => {
  if (document.getElementById("loadingScreen").classList.contains("hidden")) {
    setup();
    clearInterval(loadInterval);
  }
}, 500);

// Booleans for whether the script is active and whether there is an ongoing multi-round game
let hosting = false;
let continuing = false;

// The minimum number of players for a game to continue is 4. With 3 players the rules become degenerate.
// The game concludes as soon as there are fewer than this number of players left at the end of a round.
const minPlayers = 4;
// Can specify a minimum number of players before starting a fresh game.
let minPlayersToStart = minPlayers;
const spies = [];

const newGameInitCountdown = 30;
const continuingGameInitCountdown = 15;
let lobbyCountdown;

// timer used for lobby tick
let lobbyInterval;

// milliseconds to delay between each chat message sent to the players to avoid rate limiting
const hostActionDelay = 500;

const pastebin = 'https://pastebin.com/Q1Z35czX';

const commandPrefix = '/';
const baseCommand = 'spy';
const subCommands = {
  'start': startSpiesSession,
  'stop': endSpiesSession,
  'rules': sendRulesInRoomChat,
  'resend': resendTargets,
  'settings': changeSpyLobbySettings,
};

const baseSettings = {
  showSelection: quiz.SHOW_SELECTION_IDS.LOOTING,
  inventorySize: {
    randomOn: false,
    standardValue: 1,
  },
  lootingTime: {
    randomOn: false,
    standardValue: 60,
  },
  numberOfSongs: 100,
  songSelection: {
    standardValue: 3,
  },
  songType: {
    standardValue: {
      openings: true,
      endings: true,
      inserts: true,
    },
  },
  scoreType: 1,
  modifiers: {
    duplicates: false,
  }
};

class Spy {
  constructor(player, target = null) {
    this.player = player;
    this.target = target;
    this.alive = true;
    this.looted = false;
  }
}

// Fisher-Yates
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

function assignTargets(spies) {
  shuffleArray(spies);
  spies.forEach((spy, i, spies) => {
    spy.target = spies[(i + 1) % spies.length];
  });
}

function messageTargets(spies) {
  if (!isGameHost()) return;
  spies.forEach((spy, i) => setTimeout(sendTargetPrivateMessage, hostActionDelay*i, spy.player, spy.target));
}

function sendTargetPrivateMessage(assassin, target) {
  socket.sendCommand({
    type: "social",
    command: "chat message",
    data: { target: assassin.name, message: `Your target is ${target.player.name}.` }
  });
}

function gameStarting(data) {
  if (!isGameHost()) return;
  continuing = true;
  for (const key in data.players) spies.push(new Spy(data.players[key]));
  assignTargets(spies);
  messageTargets(spies);
}

function lobbyTick() {
  if (!isGameHost() || !lobby.inLobby) return;

  // reset countdown to maximum if there aren't enough players in the lobby
  if (lobby.numberOfPlayersReady < minPlayersToStart) {
    lobbyCountdown = (continuing) ? continuingGameInitCountdown : newGameInitCountdown;
    return;
  }

  if (lobbyCountdown == 0) {
    socket.sendCommand({
      type: 'lobby',
      command: 'start game'
    });
    return;
  }

  if (lobbyCountdown % 10 == 0 || lobbyCountdown <= 5) {
    sendHostingMessage(`The next game will start in ${lobbyCountdown} seconds.`);
  }
  if (lobbyCountdown % 5 == 0) {
    Object.keys(lobby.players)
      .map((key) => lobby.players[key])
      .filter((player) => !player.ready)
      .forEach((player) => sendHostingMessage(`@${player.name} ready up before the game starts.`));
  }

  lobbyCountdown--;
}

function answerResults(results) {
  if (!isGameHost()) return;
  
  // need to find all players that looted this entry in case multiple people looted the same entry
  const looters = results.players
    .filter(player => player.looted)
  const correctPlayers = results.players
    .filter(player => player.correct);
  
  const successfulAssassins = [];
  for (const looter of looters) {
    const assassin = spies.find(spy => spy.player.gamePlayerId == looter.gamePlayerId);
    assassin.looted = true;
    if (correctPlayers.map(player => player.gamePlayerId).includes(assassin.target.player.gamePlayerId))
      successfulAssassins.push(assassin);
  }

  // nobody dies if all players answer correctly to discourage picking Teekyuu
  if (correctPlayers.length == results.players.length) {
    sendHostingMessage(`Nobody died because all players answered correctly. Pick something harder next time.`);
  } else if (successfulAssassins.length == 0) {
    sendHostingMessage(`Nobody died.`);
  } else {
    successfulAssassins.forEach(assassin => {
      assassin.target.alive = false;
      sendHostingMessage(`${assassin.target.player.name} :gun: ${assassin.player.name}`);
    });
  }

  // send recap message with all dead players
  const deadSpies = spies.filter(spy => !spy.alive);
  sendHostingMessage((`:skull:: ${deadSpies.length > 0 ? deadSpies.map(spy => spy.player.name).join(', ') : ":egg:"}`));
}

function quizEndResult(results) {
  if (!isGameHost()) return;

  // reveal targets
  sendHostingMessage(`Targets:`);
  spies.forEach(spy => {sendHostingMessage(`${spy.player.name} > ${spy.target.player.name}`)});

  let aliveSpies = spies.filter(spy => spy.alive);

  // kill all players who failed to loot a show
  aliveSpies.filter(spy => !spy.looted).forEach(spy => {
    spy.alive = false;
    sendHostingMessage(`${spy.player.name} has died for not looting a show.`);
  });

  // check for a winner before killing any further players
  aliveSpies = spies.filter(spy => spy.alive);
  let winners = findWinners(aliveSpies, results);
  if (winners !== false) {
    endGame(winners);
    return
  }

  // kill last place
  const aliveResultStates = filterQuizResultStatesBySpies(aliveSpies, results.resultStates);
  const lastPlaceEndPosition = Math.max(...aliveResultStates.map(state => state.endPosition));
  const lastPlaceGamePlayerIds = aliveResultStates.filter(state => state.endPosition === lastPlaceEndPosition).map(state => state.gamePlayerId);
  aliveSpies.filter(spy => lastPlaceGamePlayerIds.includes(spy.player.gamePlayerId)).forEach(loser => {
    loser.alive = false;
    sendHostingMessage(`${loser.player.name} has died for being in last place.`);
  });

  // check for winners again
  aliveSpies = spies.filter(spy => spy.alive);
  winners = findWinners(aliveSpies, results);
  if (winners !== false) {
    endGame(winners);
    return;
  }
}

function findWinners(aliveSpies, results) {
  const aliveResultStates = filterQuizResultStatesBySpies(aliveSpies, results.resultStates);
  if (aliveSpies.length < minPlayers) {
    const firstPlaceEndPosition = Math.min(...aliveResultStates.map(state => state.endPosition));
    const firstPlaceGamePlayerIds = aliveResultStates.filter(state => state.endPosition === firstPlaceEndPosition).map(state => state.gamePlayerId);
    return aliveSpies.filter(spy => firstPlaceGamePlayerIds.includes(spy.player.gamePlayerId));
  }
  return false;
}

function endGame(winners) {
  sendHostingMessage(`The game has ended. ${winners.length ? ':trophy: ' + winners.map(spy => spy.player.name).join(', ') : 'Everyone died.'}`);
  continuing = false;
}

function filterQuizResultStatesBySpies(spies, resultStates) {
  const spyIds = spies.map(spy => spy.player.gamePlayerId);
  return resultStates.filter(state => spyIds.includes(state.gamePlayerId));
}

function quizOver() {
  if (!isGameHost()) return;
  if (continuing) {
    sendHostingMessage(`The game will continue with the remaining players.`);
    lobbyCountdown = continuingGameInitCountdown;
    spies.filter(spy => !spy.alive).forEach((spy, i) => {
      setTimeout(movePlayerToSpec, hostActionDelay*i, spy.player.name);
    });
    spies.length = 0;
  } else {
    sendHostingMessage(`A new Spy vs. Spy game is starting. Players may now join.`);
    lobbyCountdown = newGameInitCountdown;
    spies.length = 0;
  }
}

function processChatCommand(payload) {
  if (payload.sender !== selfName || (!quiz.inQuiz && !lobby.inLobby)) return;
  if (!payload.message.startsWith(commandPrefix + baseCommand)) return;
  if (!lobby.isHost) {
    gameChat.systemMessage('You must be the host of the lobby to use this command.');
    return;
  };
  if (quiz.gameMode == 'Ranked' || lobby.settings.gameMode =='Ranked') {
    gameChat.systemMessage('You may not use these commands in ranked.');
    return;
  }

  const args = payload.message.split(' ');
  if (args.length == 1) {
    helpMessage();
    return;
  }

  for (const subCommand in subCommands) {
    if (subCommand == args[1]) {
      subCommands[subCommand]();
      break;
    }
  }
}

function startSpiesSession() {
  if (hosting) {
    gameChat.systemMessage('You are already hosting a spies game.');
    return;
  }
  if (!lobby.inLobby || quiz.inQuiz) {
    gameChat.systemMessage('You must be in a lobby and not in the middle of a quiz to start hosting.');
    return;
  }
  if (hostModal.$showSelection.slider("getValue") !== quiz.SHOW_SELECTION_IDS.LOOTING) {
    gameChat.systemMessage("Game mode must be set to Looting.");
    return;
  }
  hosting = true;
  continuing = false;
  spies.length = 0;
  sendRulesInRoomChat();
  lobbyCountdown = newGameInitCountdown;
  lobbyInterval = setInterval(lobbyTick, 1000);
}

function endSpiesSession() {
  if (!hosting) {
    gameChat.systemMessage('You are not hosting a spies game yet.');
    return;
  }
  sendRoomMessage(`Spy vs. Spy hosting session ended.`);
  hosting = false;
  continuing = false;
  spies.length = 0;
  clearInterval(lobbyInterval);
}

function changeSpyLobbySettings() {
  if (!lobby.isHost) {
    gameChat.systemMessage('You must be the lobby host to change settings.');
    return;
  }
  hostModal.changeSettings(baseSettings);
  setTimeout(() => {lobby.changeGameSettings()}, 1);
}

function resendTargets() {
  messageTargets(spies);
}

function helpMessage() {
  const subcommandKeys = [];
  for (const subCommand in subCommands) subcommandKeys.push(subCommand);
  sendRoomMessage(`Available commands: ${subcommandKeys.join(', ')}`);
}

function sendRulesInRoomChat(mentionPlayer = null) {
  sendRoomMessage(`${mentionPlayer ? '@' + mentionPlayer.name : ''} Spy vs. Spy game mode: ${pastebin}`);
}

function playerJoined(player) {
  if (!isGameHost()) return;
  if (continuing) blockPlayerJoin(player);
  joinMessage(player);
}

function specToPlayer(player) {
  if (!isGameHost()) return;
  if (continuing) blockPlayerJoin(player);
}

function blockPlayerJoin(player) {
  sendHostingMessage(`@${player.name} There is still a game of spies ongoing. Wait for it to finish before joining.`);
  movePlayerToSpec(player.name);
}

function specJoined(player) {
  joinMessage(player);
}

function joinMessage(player) {
  if (!isGameHost()) return;
  sendRulesInRoomChat(player);
}

function sendHostingMessage(message) {
  if (!isGameHost()) return;
  sendRoomMessage(message);
}

function sendRoomMessage(message) {
  socket.sendCommand({
    type: 'lobby',
    command: 'game chat message',
    data: { msg: message, teamMessage: false }
  });
}

function isGameHost() {
  return lobby.isHost && hosting;
}

function movePlayerToSpec(playerName) {
  if (lobby.isHost && !quiz.inQuiz && lobby.inLobby) {
    socket.sendCommand({
      type: 'lobby',
      command: 'change player to spectator',
      data: { playerName: playerName }
    });
  }
}

function setup() {
  new Listener("Game Chat Message", processChatCommand).bindListener();
  new Listener("game chat update", (payload) => {
    payload.messages.forEach(message => processChatCommand(message));
  }).bindListener();
  new Listener("New Player", playerJoined).bindListener();
  new Listener("New Spectator", specJoined).bindListener();
  new Listener("Spectator Change To Player", specToPlayer).bindListener();
  new Listener("Game Starting", gameStarting).bindListener();
  new Listener("answer results", answerResults).bindListener();
  new Listener("quiz end result", quizEndResult).bindListener();
  new Listener("quiz over", quizOver).bindListener();
}
