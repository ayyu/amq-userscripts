// ==UserScript==
// @name         AMQ Hotkey Functions
// @namespace    https://github.com/ayyu/amq-scripts
// @version      0.1
// @description  Streamlined version of nyamu's hotkey script that conflicts less with normal usage.
// @description  Customize hotkeys by editing the keyBinds object.
// @description  Escape: remove zombie tooltips
// @description  ~: move cursor focus to chat box
// @description  `: move cursor focus to answer box
// @description  Ctrl + Enter: skip
// @description  Ctrl + 1: start game if all players are ready
// @description  Ctrl + 2: start vote for returning to lobby
// @author       ayyu
// @match        https://animemusicquiz.com/*
// @grant        none
// @require      https://raw.githubusercontent.com/TheJoseph98/AMQ-Scripts/master/common/amqScriptInfo.js

// ==/UserScript==

var keyBinds = {
	"clearTooltips": {
		"mod": [],
		"key": "Escape"
	},
	"startLobby": {
		"mod": ["ctrl"],
		"key": "1"
	},
	"returnLobby": {
		"mod": ["ctrl"],
		"key": "2"
	},
	"voteSkip": {
		"mod": ["ctrl"],
		"key": "Enter"
	},
	"focusAnswer": {
		"mod": [],
		"key": "`"
	},
	"focusChat": {
		"mod": [],
		"key": "~"
	},
};


if (document.getElementById('startPage')) {
    return;
}

function onKeyDown(event) {
	for (const command in kDAeyBinds) {
		var currentCommand = keyBinds[command];
		if (event.key != currentCommand["key"]) {
			continue;
		}
		var matchesMods = true;
		for (const mod in currentCommand["mod"]) {
			modProp = currentCommand["mod"] + "Key";
			if (!(modProp in event) || !event[modProp]) {
				matchesMods = false;
				break;
			}
		}
		if (!matchesMods) {
			continue;
		}
		window[command]();
	}
}

function clearTooltips() {
	$("[id^=tooltip]").remove(); $("[id^=popover]").remove();
}

function startLobby() {
	if (lobby.isHost &&
		lobby.numberOfPlayers > 0 &&
		lobby.numberOfPlayers == lobby.numberOfPlayersReady) {
		lobby.fireMainButtonEvent();
	}
}

function returnLobby() {
	if (lobby.isHost &&
		quiz.inQuiz &&
		hostModal.gameMode !== 'Ranked') {
		quiz.startReturnLobbyVote();
	}
}

function voteSkip() {
	if (!quiz.isSpectator) {
		quiz.skipClicked()
	}
}

function focusAnswer() {
	$("#gcInput").blur();
	quiz.setInputInFocus(true);
	$("#qpAnswerInput").focus();
}

function focusChat() {
	quiz.setInputInFocus(false);
	$("#gcInput").focus();
}

document.addEventListener('keydown', onKeyDown, false);

AMQ_addScriptData({
    name: "Hotkey Functions",
    author: "ayyu",
    description: `
		<p>Streamlined version of nyamu's hotkey script that conflicts less with normal usage.
		Customize hotkeys by editing the keyBinds object.</p>
		<ul>
		<li>[Escape]: remove zombie tooltips</li>
		<li>[~]: move cursor focus to chat box</li>
		<li>[\`]: move cursor focus to answer box</li>
		<li>[Ctrl + Enter]: skip</li>
		<li>[Ctrl + 1]: start game if all players are ready</li>
		<li>[Ctrl + 2]: start vote for returning to lobby</li>
		</ul>
	`
});
