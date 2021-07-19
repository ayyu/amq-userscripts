// ==UserScript==
// @name         AMQ Co-op Autopaste
// @namespace    https://github.com/ayyu/
// @version      2.0
// @description  Automatically pastes your submitted answer to chat. Also copies other people's submitted answers.
// @author       ayyu
// @match        https://animemusicquiz.com/*
// @grant        none
// @require      https://raw.githubusercontent.com/TheJoseph98/AMQ-Scripts/master/common/amqScriptInfo.js
// @downloadURL  https://raw.githubusercontent.com/ayyu/amq-scripts/master/userscripts/amqCoopPaste.user.js
// ==/UserScript==

if (document.getElementById('startPage')) {
	return;
}

let coopButton;
let coopPaste = false;

let prefix = "[ANSWER] ";
let re = new RegExp("^" + escapeRegex(prefix));
let lastAnswer = "";

function escapeRegex(string) {
	return string.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
}

function ciCompare(a, b) {
  return a.trim().toUpperCase() == b.trim().toUpperCase();
}

function answerHandler(answer) {
	if (quiz.gameMode === "Ranked") {
		return;
	}

	if (coopPaste && !ciCompare(answer, lastAnswer)) {
		msg = prefix + answer;
		gameChat.$chatInputField.val(msg);
		gameChat.sendMessage();
		lastAnswer = answer;
	}
}

function messageHandler(payload) {
	message = payload.message;
	if (coopPaste && re.test(message)) {
		answer = message.replace(re, '');
		if (!ciCompare(quiz.answerInput.quizAnswerState.submittedAnswer, answer)) {
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
		msg = (coopPaste ? "Disabled" : "Enabled") + " co-op paste to chat.";
		gameChat.systemMessage(msg);
		coopPaste = !coopPaste;
		$(`#qpCoopButton i`).toggleClass('fa-inverse', coopPaste);
	});

	// Adds button to in-game options to enable paster
	let oldWidth = $("#qpOptionContainer").width();
	$("#qpOptionContainer").width(oldWidth + 35);
	$("#qpOptionContainer > div").append(coopButton);

	// listener for submission
	new Listener("quiz answer", (payload) => {
		answerHandler(payload.answer);
	}).bindListener();

	// clear upon new song last answer
	new Listener("answer results", (data) => {
		lastAnswer = "";
	}).bindListener();

	// enter answers that are pasted
	new Listener("Game Chat Message", (payload) => {
		messageHandler(payload);
	}).bindListener();
	new Listener("game chat update", (payload) => {
		payload.messages.forEach(message => {
			messageHandler(message);
		});
	}).bindListener();
}

setup();

AMQ_addStyle(`
	#qpCoopButton {
		width: 30px;
		height: 100%;
		margin-right: 5px;
	}
`);