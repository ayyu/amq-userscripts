// ==UserScript==
// @name          AMQ Spy Host
// @namespace     https://github.com/ayyu/
// @version       0.5
// @description   Hosts spies mode. Use /host_spies to start it and /end_spies to stop it.
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
const minPlayers = 4;
// Can specify a minimum number of players before starting a fresh game.
let minPlayersToStart = minPlayers;
const spies = [];

const newGameInitCountdown = 30;
const continuingGameInitCountdown = 15;

let lobbyCountdown;
let readyDelayed;

// ID for timer used for lobby tick
let lobbyInterval;

// milliseconds to delay between each chat message sent to the players to avoid rate limiting
const messageDelay = 500;

const pastebin = 'https://pastebin.com/Q1Z35czX';

class Spy {
  constructor(player, target = null) {
    this.player = player;
    this.target = target;
    this.alive = true;
    this.rig = false;
  }
}

// Fisher-Yates
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

function assignTargets() {
  shuffleArray(spies);
  spies.forEach((spy, i, spies) => {
    spy.target = spies[(i + 1) % spies.length].player;
  });
}

function messageTargets() {
  spies.forEach((spy, i) => setTimeout(sendTargetPrivateMessage, messageDelay*i, spy.player, spy.target));
}

function sendTargetPrivateMessage(assassin, target) {
  socket.sendCommand({
    type: "social",
    command: "chat message",
    data: { target: assassin.name, message: `Your target is ${target.name}.` }
  });
}

function gameStarting(data) {
  if (!hosting) return;
  continuing = true;
  for (const key in data.players) spies.push(new Spy(data.players[key]));
  assignTargets();
  messageTargets();
}

function lobbyTick() {
  if (!hosting || !lobby.isHost ||  (!quiz.inQuiz && !lobby.inLobby)) return;
  // reset countdown to maximum if there aren't enough players in the lobby
  if (lobby.numberOfPlayersReady < minPlayersToStart) lobbyCountdown = (continuing) ? continuingGameInitCountdown : newGameInitCountdown;
  if (lobbyCountdown == 0) {
    socket.sendCommand({
      type: 'lobby',
      command: 'start game'
    });
    return;
  }
  if (lobbyCountdown % 10 == 0 || lobbyCountdown <= 5) sendLobbyChatMessage(`The next game will start in ${lobbyCountdown} seconds.`);
  if (lobbyCountdown % 5 == 0) Object.keys(lobby.players)
    .map((key) => lobby.players[key])
    .filter((player) => !player.ready)
    .forEach((player) => sendLobbyChatMessage(`@${player.name} ready up. There will be ${lobbyCountdown} more seconds before the game begins.`));
  lobbyCountdown--;
}

function answerResults(results) {
  if (!hosting) return;
  
  const pickerIds = results.players
    .filter(player => player.looted)
    .map(player => player.gamePlayerId);
  const correctIds = results.players
    .filter(player => player.correct)
    .map(player => player.gamePlayerId);
  
  let killCount = 0;
  for (const pickerId of pickerIds) {
    let assassin = spies.find(spy => spy.player.gamePlayerId == pickerId);
    assassin.rig = true;
    let target = spies.find(spy => spy.player.gamePlayerId == assassin.target.gamePlayerId);
    if (correctIds.includes(target.player.gamePlayerId)) {
      target.alive = false;
      killCount++;
      sendLobbyChatMessage(`${target.player.name} :gun: ${assassin.player.name}`);
    }
  }

  if (killCount === 0) sendLobbyChatMessage(`Nobody died.`);
  const deadSpies = spies.filter(spy => !spy.alive);
  sendLobbyChatMessage(formatDeadSpies(deadSpies));
}

function quizEndResult(results) {
  if (!hosting) return;
  spies.forEach(spy => {
    if (!spy.rig) {
      spy.alive = false;
      sendLobbyChatMessage(`${spy.player.name} has died for not looting a show.`);
    }
  });
  let aliveSpies = spies.filter(spy => spy.alive);
  if (checkWinners(aliveSpies, results)) return;

  const losers = getEndPosition(aliveSpies, results, false);
  losers.forEach(loser => {
    loser.alive = false;
    sendLobbyChatMessage(`${loser.player.name} has died for being in last place.`);
  });

  aliveSpies = spies.filter(spy => spy.alive);
  if (checkWinners(aliveSpies, results)) return;
}

function checkWinners(aliveSpies, quizResults) {
  if (aliveSpies.length < minPlayers) {
    const winners = getEndPosition(aliveSpies, quizResults, true);
    sendLobbyChatMessage(formatWinners(winners));
    continuing = false;
    return true;
  }
  return false;
}

function quizOver() {
  if (!hosting) return;
  if (continuing) {
    sendLobbyChatMessage(`The game will continue with the remaining players.`);
    lobbyCountdown = continuingGameInitCountdown;
    const deadSpies = spies.filter(spy => !spy.alive);
    deadSpies.forEach((spy, i) => {
      setTimeout(movePlayerToSpec, messageDelay*i, spy.player.name);
    });
    spies.length = 0;
  } else {
    sendLobbyChatMessage(`A new Spy vs. Spy game is starting. Players may now join.`);
    lobbyCountdown = newGameInitCountdown;
    spies.length = 0;
  }
  lobbyInterval = setInterval(lobbyTick, 1000);
}

function getEndPosition(aliveSpies, quizResults, first = true) {
  if (aliveSpies.length == 0) return [];
  const aliveResults = filterSortAliveResults(aliveSpies, quizResults);
  const endPosition = aliveResults[first ? 0 : aliveResults.length - 1].endPosition;
  const matchingIds = aliveResults
    .filter((result) => result.endPosition == endPosition)
    .map((result) => result.gamePlayerId);
    return aliveSpies.filter(spy => matchingIds.includes(spy.player.gamePlayerId));
}

function filterSortAliveResults(aliveSpies, quizResults) {
  const aliveIds = aliveSpies.map(spy => spy.player.gamePlayerId);
  const aliveResults = quizResults.resultStates.filter(player => aliveIds.includes(player.gamePlayerId));
  aliveResults.sort((a, b) => a.endPosition - b.endPosition);
  return aliveResults;
}

function processChatCommand(payload) {
  if (hosting && payload.message.startsWith('/resend_target')) {
    assassin = spies.find(spy => spy.player.name == payload.sender);
    if (assassin) sendTargetPrivateMessage(assassin.player, assassin.target);
  }

  if (payload.sender !== selfName
      || !lobby.isHost
      || quiz.gameMode == 'Ranked'
      || (!quiz.inQuiz && !lobby.inLobby)) return;
      
  if (payload.message.startsWith('/host_spies')) {
    hosting = true;
    continuing = false;
    spies.length = 0;
    sendLobbyChatMessage(`Spy vs. Spy: ${pastebin}`);
    lobbyCountdown = newGameInitCountdown;
    lobbyInterval = setInterval(lobbyTick, 1000);
  }

  if (payload.message.startsWith('/end_spies')) {
    hosting = false;
    continuing = false;
    spies.length = 0;
    sendLobbyChatMessage(`Spy vs. Spy hosting ended.`);
    clearInterval(lobbyInterval);
  }
}

function formatWinners(winners) {
  let msg = `The game has ended. `;
  msg += winners.length ? ':trophy: ' + winners.map(spy => spy.player.name).join(', ') : 'Everyone died.';
  return msg;
}

function formatDeadSpies(deadSpies) {
  let msg = ":skull:: ";
  msg += deadSpies.length ? deadSpies.map(spy => spy.player.name).join(', ') : ":egg:";
  return msg;
}

function playerJoined(player) {
  if (hosting && continuing) blockPlayerJoin(player);
  joinMessage(player);
}

function specToPlayer(player) {
  if (hosting && continuing) blockPlayerJoin(player);
}

function blockPlayerJoin(player) {
  sendLobbyChatMessage(`@${player.name} There is still a game of spies ongoing. Wait for it to finish before joining.`);
  movePlayerToSpec(player.name);
}

function specJoined(player) {
  joinMessage(player);
}

function joinMessage(player) {
  sendLobbyChatMessage(`@${player.name} Spy vs. Spy: ${pastebin}`);
}

function sendLobbyChatMessage(message) {
  if (!hosting || !lobby.isHost) return;
  socket.sendCommand({
    type: 'lobby',
    command: 'game chat message',
    data: { msg: message, teamMessage: false }
  });
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
