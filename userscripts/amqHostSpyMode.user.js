// ==UserScript==
// @name            AMQ Spy Host
// @namespace       https://github.com/ayyu/
// @version         0.6
// @description     Host Spy Vs. Spy game mode. See commands with /spy
// @author          ayyu
// @match           https://animemusicquiz.com/*
// @grant           none
// @require         https://raw.githubusercontent.com/joske2865/AMQ-Scripts/master/common/amqScriptInfo.js
// @downloadURL     https://raw.githubusercontent.com/ayyu/amq-userscripts/master/userscripts/amqHostSpyMode.user.js
// @updateURL       https://raw.githubusercontent.com/ayyu/amq-userscripts/master/userscripts/amqHostSpyMode.user.js
// ==/UserScript==

/*
Commands:
/spy            see all /spy commands
/spy start      start game
/spy stop       stop  game
/spy settings   change room settings for spy game mode
/spy rules      send pastebin for rules
/spy resend     ask the host to resend your target
*/

"use strict";
if (typeof Listener === "undefined") return;
let loadInterval = setInterval(() => {
    if ($("#loadingScreen").hasClass("hidden")) {
        clearInterval(loadInterval);
        setup();
    }
}, 500);

const version = "0.6";
const pastebin = "https://pastebin.com/Q1Z35czX";
let minPlayers = 4;
let startCountdown = 30;
let ongoingCountdown = 15;
let delay = 300;
let active = false;
let ongoing = false;
let readyDelayed = false;
let spies = [];
let countdown;
let lobbyInterval;

class Spy {
    constructor(player, target = null) {
        this.player = player;
        this.target = target;
        this.score = 0;
        this.alive = true;
        this.rig = false;
    }
}

function messageTargets() {
    spies.forEach((spy, i) => setTimeout(messageTarget, delay*i, spy.player, spy.target));
}

function messageTarget(assassin, target) {
    socket.sendCommand({
        type: "social",
        command: "chat message",
        data: { target: assassin.name, message: `Your target is ${target.name}.` }
    });
}

// "Game Starting" callback
// assign and message targets
function gameStarting(data) {
    if (!active || !isHost()) return;
    clearInterval(lobbyInterval);
    ongoing = true;
    spies.length = 0;
    for (let player of Object.values(data.players)) {
        spies.push(new Spy(player));
    }
    shuffleArray(spies);
    for (let i = 0; i < spies.length; i++) {
        spies[i].target = spies[(i + 1) % spies.length].player;
    }
    messageTargets();
}

function lobbyTick() {
    if (!active || !lobby.isHost || (!quiz.inQuiz && !lobby.inLobby)) return;
    if (lobby.numberOfPlayersReady >= minPlayers) {
        if (countdown < 1) {
            if (readyDelayed || lobby.numberOfPlayersReady === Object.keys(lobby.players).length) {
                readyDelayed = false;
                clearInterval(lobbyInterval);
                socket.sendCommand({ type: "lobby", command: "start game" });
            } else {
                readyDelayed = true;
                countdown = 5;
                for (let player of Object.values(lobby.players).filter(p => !p.ready)) {
                    sendChatMessage(`@${player.name} ready up. There will be ${countdown} more seconds before the game begins.`);
                }
            }
        } else {
            if (countdown % 10 === 0 || countdown <= 5) {
                sendChatMessage(`The next game will start in ${countdown} seconds.`);
            }
            countdown--;
        }
    } else {
        countdown = ongoing ? ongoingCountdown : startCountdown;
    }
}

// "answer results" callback
function answerResults(results) {
    if (!active || !quiz.isHost) return;
    let pickerIds = results.players.filter(p => p.looted).map(p => p.gamePlayerId);
    let correctIds = results.players.filter(p => p.correct).map(p => p.gamePlayerId);
    let killCount = 0;

    for (let pickerId of pickerIds) {
        let assassin = spies.find(spy => spy.player.gamePlayerId === pickerId);
        assassin.rig = true;
        let target = spies.find(spy => spy.player.gamePlayerId === assassin.target.gamePlayerId);
        if (correctIds.includes(target.player.gamePlayerId)) {
            target.alive = false;
            killCount++;
            sendChatMessage(`${target.player.name} :gun: ${assassin.player.name}`);
        }
    }

    if (killCount === 0) sendChatMessage(`Nobody died.`);
    let deadSpies = spies.filter(spy => !spy.alive);
    sendChatMessage(formatDeadSpies(deadSpies));
}

// "quiz end result" callback
function quizEndResult(results) {
    if (!active || !quiz.isHost) return;
    spies.forEach(spy => {
        if (!spy.rig) {
            spy.alive = false;
            sendChatMessage(`${spy.player.name} has died for not looting a show.`);
        }
    });
    let aliveSpies = spies.filter(spy => spy.alive);
    if (checkWinners(aliveSpies, results)) return;

    let losers = getEndPosition(aliveSpies, results, false);
    losers.forEach(loser => {
        loser.alive = false;
        sendChatMessage(`${loser.player.name} has died for being in last place.`);
    });

    aliveSpies = spies.filter(spy => spy.alive);
    if (checkWinners(aliveSpies, results)) return;
}

function checkWinners(aliveSpies, quizResults) {
    if (aliveSpies.length < minPlayers) {
        let winners = getEndPosition(aliveSpies, quizResults, true);
        sendChatMessage(formatWinners(winners));
        ongoing = false;
        return true;
    }
    return false;
}

function getEndPosition(aliveSpies, quizResults, first = true) {
    if (aliveSpies.length === 0) return [];
    let aliveResults = filterSortAliveResults(aliveSpies, quizResults);
    let endPosition = aliveResults[first ? 0 : aliveResults.length - 1].endPosition;
    let matchingIds = aliveResults.filter(r => r.endPosition === endPosition).map(r => r.gamePlayerId);
    return aliveSpies.filter(spy => matchingIds.includes(spy.player.gamePlayerId));
}

function filterSortAliveResults(aliveSpies, quizResults) {
    let aliveIds = aliveSpies.map(spy => spy.player.gamePlayerId);
    let aliveResults = quizResults.resultStates.filter(player => aliveIds.includes(player.gamePlayerId));
    aliveResults.sort((a, b) => a.endPosition - b.endPosition);
    return aliveResults;
}

// "quiz over" callback
function quizOver() {
    if (!active || !isHost()) return;
    if (ongoing) {
        sendChatMessage(`The game will continue with the remaining players.`);
        countdown = ongoingCountdown;
        let deadSpies = spies.filter(spy => !spy.alive);
        deadSpies.forEach((spy, i) => {
            setTimeout(movePlayerToSpec, delay*i, spy.player.name);
        });
        spies.length = 0;
    } else {
        sendChatMessage(`A new Spy vs. Spy game is starting. Players may now join.`);
        countdown = startCountdown;
        spies.length = 0;
    }
    lobbyInterval = setInterval(lobbyTick, 1000);
}

function processChatCommand(payload) {
    if (!payload.message.startsWith("/") || isRankedMode()) return;
    let content = payload.message.toLowerCase();
    if (content === "/spy resend" || content === "/resend_target") {
        let assassin = spies.find(spy => spy.player.name === payload.sender);
        if (assassin) messageTarget(assassin.player, assassin.target);
    }
    if (payload.sender === selfName) {
        if (content === "/spy" || content === "/spies" || content === "/spy help") {
            sendChatMessage("/spy start, stop, settings, rules, resend");
        }
        else if (content === "/spy start" || content === "/spy host" || content === "/host_spies") {
            if (!lobby.inLobby) {
                sendChatMessage("Must be in lobby to start Spy vs. Spy.");
                return;
            }
            if (!lobby.isHost) {
                sendChatMessage("Must be host to start Spy vs. Spy.");
                return;
            }
            if (active) {
                sendChatMessage("Spy vs. Spy already active.");
                return;
            }
            if (Object.keys(lobby.players).length < minPlayers) {
                sendChatMessage(`You need at least ${minPlayers} players to start.`);
                return;
            }
            if (hostModal.$showSelection.slider("getValue") !== quiz.SHOW_SELECTION_IDS.LOOTING) {
                sendChatMessage("Game mode must be: looting");
                return;
            }
            else {
                active = true;
                ongoing = false;
                countdown = startCountdown;
                lobbyInterval = setInterval(lobbyTick, 1000);
                sendChatMessage(`Spy vs. Spy: ${pastebin}`);
            }
        }
        else if (content === "/spy stop" || content === "/spy end" || content === "/end_spies") {
            if (active) {
                spies.length = 0;
                active = false;
                ongoing = false;
                sendChatMessage("Spy vs. Spy host stopped.");
                clearInterval(lobbyInterval);
            }
            else {
                sendChatMessage("Spy vs. Spy host is not active.");
            }
        }
        else if (content === "/spy settings") {
            if (lobby.isHost) {
                let settings = JSON.parse(JSON.stringify(hostModal.DEFUALT_SETTINGS));
                delete settings.roomName;
                delete settings.privateRoom;
                delete settings.password;
                delete settings.roomSize;
                settings.showSelection = quiz.SHOW_SELECTION_IDS.LOOTING;
                settings.inventorySize.standardValue = 1;
                settings.lootingTime.standardValue = 60;
                settings.numberOfSongs = 100;
                settings.songSelection.advancedValue = {random: 0, unwatched: 0, watched: 100};
                settings.songType.standardValue = {openings: true, endings: true, inserts: true};
                settings.songType.advancedValue = {openings: 0, endings: 0, inserts: 0, random: 100};
                settings.songDifficulity.advancedOn = true;
                settings.modifiers.duplicates = false;
                changeGameSettings(settings);
            }
        }
        else if (content === "/spy rules") {
            sendChatMessage(pastebin);
        }
        else if (content.startsWith("/spy startcountdown")) {
            let option = parseInt(content.split(" ")[2]);
            if (isNaN(option)) return;
            startCountdown = option;
            sendChatMessage(`startCountdown set to ${startCountdown}`);
        }
        else if (content.startsWith("/spy ongoingcountdown")) {
            let option = parseInt(content.split(" ")[2]);
            if (isNaN(option)) return;
            minPlayers = option;
            sendChatMessage(`ongoingCountdown set to ${ongoingCountdown}`);
        }
        /*else if (content.startsWith("/spy minplayers")) {
            let option = parseInt(content.split(" ")[2]);
            if (isNaN(option)) return;
            minPlayers = option;
            sendChatMessage(`minPlayers set to ${minPlayers}`);
        }
        else if (content.startsWith("/spy debug")) {
            let option = content.split(" ")[2];
            let result = eval(option);
            console.log(result);
            try { sendChatMessage(JSON.stringify(result)) }
            catch { sendChatMessage("ERROR") }
        }*/
    }
}

function formatWinners(winners) {
    let msg = `The game has ended. `;
    msg += winners.length ? ":trophy: " + winners.map(spy => spy.player.name).join(", ") : "Everyone died.";
    return msg;
}

function formatDeadSpies(deadSpies) {
    let msg = ":skull:: ";
    msg += deadSpies.length ? deadSpies.map(spy => spy.player.name).join(", ") : ":egg:";
    return msg;
}

// tell the rules to new player
function joinMessage(player) {
    sendChatMessage(`@${player.name} Spy vs. Spy: ${pastebin}`);
}

// "New Spectator" callback
function specJoined(player) {
    if (active && isHost()) joinMessage(player);
}

// "New Player" callback
function playerJoined(player) {
    if (active && lobby.isHost) {
        if (ongoing) blockPlayerJoin(player);
        joinMessage(player);
    }
}

// "Spectator Change To Player" callback
function specToPlayer(player) {
    if (active && ongoing && lobby.isHost) {
        blockPlayerJoin(player);
    }
}

// stop player from joining during ongoing game
function blockPlayerJoin(player) {
    sendChatMessage(`@${player.name} There is still a game of spies ongoing. Wait for it to finish before joining.`);
    movePlayerToSpec(player.name);
}

function movePlayerToSpec(playerName) {
    if (lobby.isHost && lobby.inLobby) {
        socket.sendCommand({
            type: "lobby",
            command: "change player to spectator",
            data: { playerName: playerName }
        });
    }
}

// return true if you are host
function isHost() {
    return (lobby.inLobby && lobby.isHost) || (quiz.inQuiz && quiz.isHost);
}

// return true if you are in a ranked lobby or quiz
function isRankedMode() {
    return (lobby.inLobby && lobby.settings.gameMode === "Ranked") || (quiz.inQuiz && quiz.gameMode === "Ranked");
}

// send normal chat message
function sendChatMessage(message) {
    socket.sendCommand({
        type: "lobby",
        command: "game chat message",
        data: { msg: message, teamMessage: false }
    });
}

// change game settings
function changeGameSettings(settings) {
    let settingChanges = {};
    for (let key of Object.keys(settings)) {
        if (JSON.stringify(lobby.settings[key]) !== JSON.stringify(settings[key])) {
            settingChanges[key] = settings[key];
        }
    }
    if (Object.keys(settingChanges).length > 0) {
        hostModal.changeSettings(settingChanges);
        setTimeout(() => { lobby.changeGameSettings() }, 1);
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
    description: `<p>Host spy mode. See commands with /spy</p>`
});
