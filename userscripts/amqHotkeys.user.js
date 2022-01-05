// ==UserScript==
// @name         AMQ Hotkey Functions
// @namespace    https://github.com/ayyu/amq-scripts
// @version      1.1
// @description  Streamlined version inspired by nyamu's hotkey script that conflicts less with normal browser usage.
// @description  Customize hotkeys by editing the keyBinds object.
// @description  Escape: remove ghost tooltips
// @description  Tab: move cursor focus to answer box
// @description  Shift + Tab: move cursor focus to chat box
// @description  Ctrl + Enter: skip
// @description  Alt + Up: start game if all players are ready
// @description  Alt + Down: start vote for returning to lobby, or add your vote to return
// @description  Alt + Left: switch to player
// @description  Alt + Right: switch to spectator
// @description  Alt + `: toggle team chat
// @description  Alt + 1: pause quiz
// @author       ayyu
// @match        https://animemusicquiz.com/*
// @grant        none
// @require      https://raw.githubusercontent.com/TheJoseph98/AMQ-Scripts/master/common/amqScriptInfo.js
// @downloadURL  https://raw.githubusercontent.com/ayyu/amq-scripts/master/userscripts/amqHotkeys.user.js

// ==/UserScript==

(function() {
	if (document.getElementById('startPage')) return;
	let loadInterval = setInterval(() => {
		if (document.getElementById("loadingScreen").classList.contains("hidden")) {
			setup();
			clearInterval(loadInterval);
		}
	}, 500);
	
	// set your keybinds here
	var keybinds = [
		{
			"mod": ["alt"],
			"key": "Backspace",
			"callback": pauseQuiz,
			"description": "pause quiz"
		},
		{
			"mod": [],
			"key": "Escape",
			"callback": clearTooltips,
			"description": "remove ghost tooltips"
		},
		{
			"mod": ["alt"],
			"key": "ArrowUp",
			"callback": startLobby,
			"description": "start game if all players are ready"
		},
		{
			"mod": ["alt"],
			"key": "ArrowDown",
			"callback": returnLobby,
			"description": "start vote for returning to lobby, or add your vote to return"
		},
		{
			"mod": ["alt"],
			"key": "ArrowLeft",
			"callback": joinLobby,
			"description": "switch to player"
		},
		{
			"mod": ["alt"],
			"key": "ArrowRight",
			"callback": joinSpec,
			"description": "switch to spectator"
		},
		{
			"mod": ["alt"],
			"key": "`",
			"callback": toggleTeamChat,
			"description": "toggle team chat"
		},
		{
			"mod": ["ctrl"],
			"key": "Enter",
			"callback": voteSkip,
			"description": "vote to skip current song"
		},
		{
			"mod": [],
			"key": "Tab",
			"callback": focusAnswer,
			"description": "focus cursor on answer box"
		},
		{
			"mod": ["shift"],
			"key": "Tab",
			"callback": focusChat,
			"description": "focus cursor on chat"
		},
		{
			"mod": ["alt", "shift"],
			"key": "Enter",
			"callback": copyPasta,
			"description": "copy paste latest message in chat"
		}
	];
	
	// handler for keypresses
	function onKeyDown(event) {
		keybinds.forEach(command => {
			if (event.key == command.key && command.mod.reduce((prev, curr) => {
				modProp = curr + "Key";
				return prev && (modProp in event) && event[modProp];
			}, true)) {
				event.preventDefault();
				event.stopPropagation();
				command.callback();
			}
		});
	}
	
	// BEGIN callbacks for hotkeys
	
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
		if (quiz.inQuiz &&
			hostModal.gameMode !== 'Ranked') {
				if (lobby.isHost) {
					socket.sendCommand({
						type: "quiz",
						command: "start return lobby vote",
					});
				} else {
					quiz.returnVoteController.vote(true);
				}
		}
	}
	
	function pauseQuiz() {
		if (quiz.inQuiz &&
			hostModal.gameMode !== 'Ranked') {
			quiz.pauseButton.$button.trigger('click');
		}
	}
	
	function voteSkip() {
		if (!quiz.isSpectator) {
			quiz.skipClicked();
		}
	}
	
	function focusAnswer() {
		if (!quiz.isSpectator) {
			$("#gcInput").blur();
			quiz.setInputInFocus(true);
			$("#qpAnswerInput").focus();
		}
	}
	
	function focusChat() {
		quiz.setInputInFocus(false);
		$("#gcInput").focus();
	}
	
	function toggleTeamChat() {
		$("#gcTeamChatSwitch").trigger('click');
	}
	
	function joinLobby() {
		if(lobby.isSpectator) {
			lobby.fireMainButtonEvent();
		}
	}
	
	function joinSpec() {
		if(!lobby.isSpectator) {
			lobby.changeToSpectator(selfName);
		}
	}
	
	function copyPasta() {
		gameChat.$chatInputField.val($(`#gcMessageContainer .gcMessage`).last().text());
		gameChat.sendMessage();
	}
	
	// END callbacks for hotkeys
	
	// pretty printing of hotkeys for script data
	function printKeybind(keybind) {
		const modString = keybind.mod.reduce((prev, curr) => {
			return prev + `<kbd>${curr}</kbd> + `;
		}, "");
		const keyString = `<kbd>${keybind.key}</kbd>`;
		return `${modString}${keyString}: ${keybind.description}`;
	}
	function setup() {
		document.addEventListener('keydown', onKeyDown, false);
		const keybindString = keybinds.map(printKeybind).reduce((prev, curr) => {
			return prev + `<li>${curr}</li>`;
		}, "");
		AMQ_addScriptData({
			name: "Hotkey Functions",
			author: "ayyu",
			description: `
				<p>Streamlined version inspired by nyamu's hotkey script that conflicts less with normal browser usage.
				Customize hotkeys by editing the keyBinds object in the script.</p>
				<p>Current keybinds:</p>
				<ul>
					${keybindString}
				</ul>
			`
		});
	}
})();

