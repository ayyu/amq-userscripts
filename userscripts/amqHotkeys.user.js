// ==UserScript==
// @name         AMQ Hotkey Functions
// @namespace    https://github.com/ayyu/amq-scripts
// @version      0.2
// @description  Streamlined version of nyamu's hotkey script that conflicts less with normal usage.
// @description  Customize hotkeys by editing the keyBinds object.
// @description  Escape: remove zombie tooltips
// @description  `: move cursor focus to answer box
// @description  Ctrl + `: move cursor focus to chat box
// @description  Ctrl + Enter: skip
// @description  Ctrl + 1: start game if all players are ready
// @description  Ctrl + 2: start vote for returning to lobby
// @author       ayyu
// @match        https://animemusicquiz.com/*
// @grant        none
// @require      https://raw.githubusercontent.com/TheJoseph98/AMQ-Scripts/master/common/amqScriptInfo.js
// @downloadURL  https://raw.githubusercontent.com/ayyu/amq-scripts/master/userscripts/amqHotkeys.user.js

// ==/UserScript==

if (document.getElementById('startPage')) {
    return;
}

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
		"mod": ["ctrl"],
		"key": "`"
	}
};

function onKeyDown(event) {
	for (const command in keyBinds) {
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
    event.preventDefault();
    event.stopPropagation();
		keyBinds[command].callback();
	}
}

keyBinds.clearTooltips.callback = function() {
	$("[id^=tooltip]").remove(); $("[id^=popover]").remove();
}

keyBinds.startLobby.callback = function() {
	if (lobby.isHost &&
		lobby.numberOfPlayers > 0 &&
		lobby.numberOfPlayers == lobby.numberOfPlayersReady) {
		lobby.fireMainButtonEvent();
	}
}

keyBinds.returnLobby.callback = function() {
	if (lobby.isHost &&
		quiz.inQuiz &&
		hostModal.gameMode !== 'Ranked') {
		quiz.startReturnLobbyVote();
	}
}

keyBinds.voteSkip.callback = function() {
	if (!quiz.isSpectator) {
		quiz.skipClicked()
	}
}

keyBinds.focusAnswer.callback = function() {
	$("#gcInput").blur();
	quiz.setInputInFocus(true);
	$("#qpAnswerInput").focus();
}

keyBinds.focusChat.callback = function() {
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
			<li><kbd>Escape</kbd>: remove zombie tooltips</li>
			<li><kbd>\`</kbd>: move cursor focus to answer box</li>
			<li><kbd>Ctrl</kbd> + <kbd>\`</kbd>: move cursor focus to chat box</li>
			<li><kbd>Ctrl</kbd> + <kbd>Enter</kbd>: vote skip</li>
			<li><kbd>Ctrl</kbd> + <kbd>1</kbd>: start game if all players are ready</li>
			<li><kbd>Ctrl</kbd> + <kbd>2</kbd>: start vote for returning to lobby</li>
		</ul>
	`
});
