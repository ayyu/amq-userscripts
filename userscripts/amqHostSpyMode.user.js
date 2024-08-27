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
let startCountdown = 10;
let ongoingCountdown = 10;
let delay = 300;
let active = false;
let ongoing = false;
let spies = [];
let countdown;
let lobbyInterval;
let readyDelayed;

class Spy {
    constructor(player, target = null) {
        this.player = player;
        this.target = target;
        this.score = 0;
        this.alive = true;
        this.rig = false;
    }
}

function gameStarting(data) {
    if (!active) return;
    clearInterval(lobbyInterval);
    ongoing = true;
    spies = Object.values(data.players).map(player => new Spy(player));
    shuffleArray(spies);
    for (let i = 0; i < spies.length; i++) {
        spies[i].target = spies[(i + 1) % spies.length].player;
    }
    spies.forEach((spy, i) => {
        setTimeout(() => {
            sendDM(spy.player.name, `Your target is ${spy.target.name}`);
        }, delay * i)
    });
}

function lobbyTick() {
    if (!active || !lobby.isHost || (!quiz.inQuiz && !lobby.inLobby)) return;
    if (lobby.numberOfPlayersReady >= minPlayers) {
        if (countdown < 1) {
            if (!readyDelayed) {
                readyDelayed = true;
                countdown = 5;
                for (let player of Object.values(lobby.players).filter(p => !p.ready)) {
                    sendChatMessage(`@${player.name} ready up. There will be ${countdown} more seconds before the game begins.`);
                }
            }
            readyDelayed = false;
            clearInterval(lobbyInterval);
            socket.sendCommand({
                type: "lobby",
                command: "start game"
            });
        } else {
            if (countdown % 10 === 0 || countdown <= 3) {
                sendChatMessage(`The next game will start in ${countdown} seconds.`);
            }
            countdown--;
        }
    } else {
        countdown = ongoing ? ongoingCountdown : startCountdown;
    }
}

function answerResults(results) {
    if (!active) return;
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

function quizEndResult(results) {
    if (!active) return;
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
    let matchingIds = aliveResults.filter(result => result.endPosition === endPosition).map(result => result.gamePlayerId);
    return aliveSpies.filter(spy => matchingIds.includes(spy.player.gamePlayerId));
}

function filterSortAliveResults(aliveSpies, quizResults) {
    let aliveIds = aliveSpies.map(spy => spy.player.gamePlayerId);
    let aliveResults = quizResults.resultStates.filter(player => aliveIds.includes(player.gamePlayerId));
    aliveResults.sort((a, b) => a.endPosition - b.endPosition);
    return aliveResults;
}

function quizOver() {
    if (!active) return;
    if (ongoing) {
        sendChatMessage(`The game will continue with the remaining players.`);
        countdown = ongoingCountdown;
        let deadSpies = spies.filter(spy => !spy.alive);
        deadSpies.forEach((spy, i) => {
            setTimeout(movePlayerToSpec, delay * i, spy.player.name);
        });
    } else {
        sendChatMessage(`A new Spy vs. Spy game is starting. Players may now join.`);
        countdown = startCountdown;
    }
    lobbyInterval = setInterval(lobbyTick, 1000);
}

function processChatCommand(payload) {
    let content = payload.message;
    if (!content.startsWith("/")) return;
    if (/^\/(spy resend|resend_target)$/i.test(content) && active && spies.length) {
        let assassin = spies.find(spy => spy.player.name === payload.sender);
        sendDM(payload.sender, assassin?.target?.name || "no target");
    }
    if (payload.sender === selfName) {
        if (/^\/(spy|spies|spy help)$/i.test(content)) {
            sendChatMessage("/spy start, stop, settings, rules, resend");
        }
        else if (/^\/(spy start|spy host|host_spies)$/i.test(content)) {
            if (!lobby.isHost) {
                sendChatMessage("Must be host to start Spy vs. Spy");
                return;
            }
            if (active) {
                sendChatMessage("Spy vs. Spy already active");
                return;
            }
            if (Object.keys(lobby.players).length < minPlayers) {
                sendChatMessage(`You need at least ${minPlayers} players to start`);
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
        else if (/^\/(spy stop|spy end|end_spies)$/i.test(content)) {
            if (active) {
                spies = [];
                active = false;
                ongoing = false;
                sendChatMessage("Spy vs. Spy host stopped");
                clearInterval(lobbyInterval);
            }
            else {
                sendChatMessage("Spy vs. Spy host is not active");
            }
        }
        else if (/^\/spy settings$/i.test(content)) {
            if (lobby.isHost) {
                let settings = hostModal.getSettings();
                settings.teamSize = 1;
                settings.scoreType = quiz.SCORE_TYPE_IDS.COUNT;
                settings.showSelection = quiz.SHOW_SELECTION_IDS.LOOTING;
                settings.inventorySize.randomOn = false;
                settings.inventorySize.standardValue = 1;
                settings.lootingTime.randomOn = false;
                settings.lootingTime.standardValue = 60;
                settings.songSelection.standardValue = 3;
                settings.songSelection.advancedValue = {random: 0, unwatched: 0, watched: 100};
                settings.songType.standardValue = {openings: true, endings: true, inserts: true};
                settings.songType.advancedValue = {openings: 0, endings: 0, inserts: 0, random: 100};
                settings.modifiers.duplicates = false;
                changeGameSettings(settings);
            }
        }
        else if (/^\/spy rules$/i.test(content)) {
            sendChatMessage(pastebin);
        }
        else if (/^\/spy minplayers [0-9]+$/i.test(content)) {
            let option = parseInt(/^\/\S+ \S+ ([0-9]+)$/i.exec(content)[1]);
            minPlayers = option;
            sendChatMessage(`minPlayers set to ${minPlayers}`);
        }
        else if (/^\/spy startcountdown [0-9]+$/i.test(content)) {
            let option = parseInt(/^\/\S+ \S+ ([0-9]+)$/i.exec(content)[1]);
            startCountdown = option;
            sendChatMessage(`startCountdown set to ${startCountdown}`);
        }
        else if (/^\/spy ongoingcountdown [0-9]+$/i.test(content)) {
            let option = parseInt(/^\/\S+ \S+ ([0-9]+)$/i.exec(content)[1]);
            minPlayers = option;
            sendChatMessage(`ongoingCountdown set to ${ongoingCountdown}`);
        }
        /*else if (/^\/spy debug .+$/i.test(content)) {
            let option = /^\S+ debug (.+)/.exec(content)[1];
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

function playerJoined(player) {
    if (active && ongoing) blockPlayerJoin(player);
    joinMessage(player);
}

function specToPlayer(player) {
    if (active && ongoing) blockPlayerJoin(player);
}

function blockPlayerJoin(player) {
    sendChatMessage(`@${player.name} There is still a game of spies ongoing. Wait for it to finish before joining.`);
    movePlayerToSpec(player.name);
}

function specJoined(player) {
    joinMessage(player);
}

function joinMessage(player) {
    if (active && lobby.isHost) {
        sendChatMessage(`@${player.name} Spy vs. Spy: ${pastebin}`);
    }
}

function movePlayerToSpec(playerName) {
    if (lobby.isHost && !quiz.inQuiz && lobby.inLobby) {
        socket.sendCommand({
            type: "lobby",
            command: "change player to spectator",
            data: { playerName: playerName }
        });
    }
}

// send normal chat message
function sendChatMessage(message) {
    socket.sendCommand({
        type: "lobby",
        command: "game chat message",
        data: { msg: message, teamMessage: false }
    });
}

// send private message to player
function sendDM(name, message) {
    socket.sendCommand({
        type: "social",
        command: "chat message",
        data: {target: name, message: message}
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
    new Listener("game chat update", (payload) => { payload.messages.forEach(message => processChatCommand(message)) }).bindListener();
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
