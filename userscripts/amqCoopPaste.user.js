// ==UserScript==
// @name        	AMQ Co-op Autopaste
// @namespace   	https://github.com/ayyu/
// @version     	2.4
// @description 	Automatically pastes your submitted answer to chat. Also copies other people's submitted answers.
// @author      	ayyu
// @match       	https://animemusicquiz.com/*
// @grant       	none
// @require     	https://raw.githubusercontent.com/TheJoseph98/AMQ-Scripts/master/common/amqScriptInfo.js
// @downloadURL 	https://raw.githubusercontent.com/ayyu/amq-scripts/master/userscripts/amqCoopPaste.user.js
// ==/UserScript==

(() => {
	if (document.getElementById('startPage')) return;
	let loadInterval = setInterval(() => {
		if (document.getElementById("loadingScreen").classList.contains("hidden")) {
			setup();
			clearInterval(loadInterval);
		}
	}, 500);

	let coopButton;
	let coopPaste = false;
	let pasted = false;

	let prefix = "[CP] ";
	
	let rePrefix = new RegExp("^" + prefix.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'));
	let lastAnswer = "";

	function ciCompare(a, b) {
		if (typeof a != "string" || typeof b != "string") return false;
		return a.trim().toUpperCase() == b.trim().toUpperCase();
	}

	function answerHandler(payload) {
		if (quiz.gameMode === "Ranked") return;
		answer = payload.answer
		
		if (coopPaste && !ciCompare(answer, lastAnswer) && !pasted) {
			socket.sendCommand({
				type: 'lobby',
				command: 'game chat message',
				data: { msg: prefix + answer, teamMessage: false }
			});
		}
		if (pasted) pasted = false;
	}

	function messageHandler(payload) {
		if (coopPaste && payload.sender != selfName && rePrefix.test(payload.message)) {
			answer = payload.message.replace(rePrefix, '');
			if (!ciCompare(quiz.answerInput.quizAnswerState.submittedAnswer, answer)) {
				pasted = true;
				quiz.answerInput.setNewAnswer(answer);
			}
		}
	}

	function setup() {
		coopButton = $(`<div id="qpCoopButton" class="clickAble qpOption"><i aria-hidden="true" class="fa fa-clipboard qpMenuItem"></i></div>`);
		coopButton.popover({
			placement: "bottom",
			content: "Toggle co-op copy paste to chat",
			trigger: "hover"
		});
		coopButton.click(function () {
			coopPaste = !coopPaste;
			gameChat.systemMessage((coopPaste ? "Enabled" : "Disabled") + " co-op paste to chat.");
			$(`#qpCoopButton i`).toggleClass("fa-inverse", coopPaste);
		});

		// Adds button to in-game options to enable paster
		let oldWidth = $(`#qpOptionContainer`).width();
		$(`#qpOptionContainer`).width(oldWidth + 35);
		$(`#qpOptionContainer > div`).append(coopButton);

		// listener for submission
		new Listener("quiz answer", answerHandler).bindListener();

		// clear last answer upon new song
		new Listener("answer results", () => { lastAnswer = ""; }).bindListener();

		// enter answers that are pasted
		new Listener("game chat message", messageHandler).bindListener();
		new Listener("game chat update", (payload) => {
			payload.messages.forEach(message => messageHandler(message));
		}).bindListener();

		AMQ_addScriptData({
			name: "Co-op Autopaste",
			author: "ayyu",
			description: `
				<p>Automatically pastes your submitted answer to chat. Also copies other people's submitted answers.</p>
				<p>Adds toggleable button in-game <i aria-hidden="true" class="fa fa-clipboard"></i></p>
			`
		});

		AMQ_addStyle(`#qpCoopButton {
			width: 30px;
			height: 100%;
			margin-right: 5px;
		}`);
	}
})();
