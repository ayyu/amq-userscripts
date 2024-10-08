// ==UserScript==
// @name          AMQ Spy Host
// @namespace     https://github.com/ayyu/
// @version       0.9.0
// @description   Hosts Spy vs. Spy game mode. Use /spy start to start it and /spy stop to stop it.
// @author        ayyu
// @match         https://animemusicquiz.com/*
// @grant         none
// @require       https://raw.githubusercontent.com/joske2865/AMQ-Scripts/master/common/amqScriptInfo.js
// @downloadURL   https://raw.githubusercontent.com/ayyu/amq-userscripts/master/userscripts/amqHostSpyMode.user.js
// @updateURL     https://raw.githubusercontent.com/ayyu/amq-userscripts/master/userscripts/amqHostSpyMode.user.js
// ==/UserScript==

// Wait for page to load
"use strict";
if (typeof Listener === "undefined") return;
let loadInterval = setInterval(() => {
  if ($("#loadingScreen").hasClass("hidden")) {
    clearInterval(loadInterval);
    setup();
  }
}, 500);

const version = "0.9";

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
const hostActionDelay = 750;

const pastebin = 'https://pastebin.com/Q1Z35czX';

const commandPrefix = '/';
const baseCommand = 'spy';
const subCommands = {
  'start': {
    'callback': startSpiesSession,
    'description': 'starts hosting a Spy vs. Spy game session',
  },
  'stop': {
    'callback': endSpiesSession,
    'description': 'stops hosting a Spy vs. Spy game session',
  },
  'rules': {
    'callback': sendRulesInRoomChat,
    'description': 'sends a link to the pastebin containing the rules',
  },
  'resend': {
    'callback': resendTargets,
    'description': 'resends private messages to each player for their target in case they didn`t receive it',
  },
  'settings': {
    'callback': changeSpyLobbySettings,
    'description': 'changes necessary settings for battle royale mode',
  },
  'help': {
    'callback': helpMessage,
    'description': 'prints this help message',
  },
};

class Spy {
  constructor(player, target = null, assassin = null) {
    this.player = player;
    this.target = target;
    this.assassin = assassin;
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
  data.players.forEach(player => spies.push(new Spy(player)));
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
  const correctPlayerIds = correctPlayers.map(player => player.gamePlayerId);
  
  const successfulAssassins = [];
  looters.forEach(looter => {
    const assassin = spies.find(spy => spy.player.gamePlayerId == looter.gamePlayerId);
    assassin.looted = true;
    if (correctPlayerIds.includes(assassin.target.player.gamePlayerId))
      successfulAssassins.push(assassin);
  });
  
  // nobody dies if all alive players answer correctly to discourage picking Teekyuu
  // this rule only applies outside of an endgame
  const aliveSpies = spies.filter(spy => spy.alive);
  const correctAliveSpies = aliveSpies.filter(spy => correctPlayerIds.includes(spy.player.gamePlayerId));
  if (correctAliveSpies.length >= aliveSpies.length && aliveSpies.length >= minPlayers) {
    sendHostingMessage(`Nobody died because all remaining players answered correctly. Pick something harder next time.`);
  } else if (successfulAssassins.length == 0) {
    sendHostingMessage(`Nobody died.`);
  } else {
    successfulAssassins.forEach(assassin => {
      assassin.target.alive = false;
      assassin.target.assassin = assassin;
      sendHostingMessage(`${assassin.target.player.name} :gun: ${assassin.player.name}`);
    });
  }

  // send recap message with all dead players
  const deadSpies = spies.filter(spy => !spy.alive);
  sendHostingMessage((`:skull:: ${deadSpies.length > 0 ? deadSpies.map(spy => `${spy.player.name} :gun: ${spy.assassin.player.name}`).join(', ') : ":egg:"}`));
}

function quizEndResult(results) {
  if (!isGameHost()) return;

  // reveal targets
  sendHostingMessage(`Targets: ${spies[0].player.name} > ${spies.map(spy => spy.target.player.name).join(' > ')}`);
  
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
    const deadSpies = spies.filter(spy => !spy.alive);
    deadSpies.forEach((spy, i) => {
      setTimeout(movePlayerToSpec, hostActionDelay*i, spy.player.name);
    });
  } else {
    sendHostingMessage(`A new Spy vs. Spy game is starting. Players may now join.`);
    lobbyCountdown = newGameInitCountdown;
  }
  releaseSpies();
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
      subCommands[subCommand].callback(args.slice(2));
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
  releaseSpies();
  sendRulesInRoomChat();
  lobbyCountdown = newGameInitCountdown;
  lobbyInterval = setInterval(lobbyTick, 1000);
}

function endSpiesSession() {
  if (!hosting) {
    gameChat.systemMessage('You are not hosting a spies game yet.');
    return;
  }
  sendHostingMessage(`Spy vs. Spy hosting session ended.`);
  hosting = false;
  continuing = false;
  releaseSpies();
  clearInterval(lobbyInterval);
}

function releaseSpies() {
  spies.forEach(spy => {
    spy.player = null;
    spy.target = null;
    spy.assassin = null;
  })
  spies.length = 0;
}

function changeSpyLobbySettings() {
  if (!lobby.isHost) {
    gameChat.systemMessage('You must be the lobby host to change settings.');
    return;
  }
  // battle royal
  hostModal.$showSelection.slider('setValue', quiz.SHOW_SELECTION_IDS.LOOTING);
  hostModal.$scoring.slider('setValue', quiz.SCORE_TYPE_IDS.COUNT);
  // looting settings
  hostModal.inventorySizeSliderCombo.setValue(1);
  hostModal.inventorySizeRandomSwitch.setOn(false);
  hostModal.lootingTimeSliderCombo.setValue(60);
  hostModal.lootingTimeRandomSwitch.setOn(false);
  if (!hostModal.$lootDropping.is(':checked')) hostModal.$lootDropping.click();
  // only watched
  hostModal.numberOfSongsSliderCombo.setValue(100);
  hostModal.watchedSliderCombo.setValue(100);
  // disable dupes
  if (hostModal.$duplicateShows.is(':checked')) hostModal.$duplicateShows.click();
  // maximum lobby size
  hostModal.roomSizeSliderCombo.setValue(hostModal.roomSizeSliderCombo.max);
  
  lobby.changeGameSettings();
}

function resendTargets() {
  if (!isGameHost()) return;
  messageTargets(spies);
}

function helpMessage() {
  gameChat.systemMessage('usage: /spy [subcommand]');
  gameChat.systemMessage('subcommands:');
  for (const subCommand in subCommands) {
    gameChat.systemMessage(`${subCommand}: ${subCommands[subCommand].description}`);
  }
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

AMQ_addScriptData({
  name: "Spy Host",
  author: "ayyu",
  version: version,
  link: "https://raw.githubusercontent.com/ayyu/amq-userscripts/master/userscripts/amqHostSpyMode.user.js",
  description: `<p>Hosts Spy vs. Spy game mode. Use /spy start to start it and /spy stop to stop it.</p>`
});
