// ==UserScript==
// @name         AMQ Co-op Autopaste
// @namespace    https://github.com/ayyu/
// @version      1.8
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

let minInterval = 200;
let lastAnswer = "";

let coopButton;
let coopPaste = false;

let prefix = "[ANSWER] ";

function escapeRegex(string) {
	return string.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
}

let re = new RegExp("^" + escapeRegex(prefix));

function quizJoinHandler(data) {
	if (quiz.gameMode !== "Ranked") {
		quiz.answerInput.$input.off("keypress", answerHandler)
		.on("keypress", answerHandler);
	}
	else {
		quiz.answerInput.$input.off("keypress", answerHandler);
	}
}

function answerHandler(event) {
	var answer = quiz.answerInput.$input.val();
	if (event.which === 13 && coopPaste && answer != lastAnswer) {
		msg = prefix + answer;
		gameChat.$chatInputField.val(msg);
		gameChat.sendMessage();
		lastAnswer = answer;
	}
}

function messageHandler(payload) {
	message = payload.message;
	if (re.test(message) && coopPaste) {
		answer = message.replace(re, '');
		quiz.answerInput.setNewAnswer(answer);
	}
}

function setup() {

	coopButton = $(`<div id="qpCoopButton" class="clickAble qpOption"><i aria-hidden="true" class="fa fa-paste qpMenuItem"></i></div>`);
	coopButton.popover({
		placement: "bottom",
		content: "Toggle co-op copy paste to chat",
		trigger: "hover"
	});
	coopButton.click(function () {
		msg = (coopPaste ? "Disabled" : "Enabled") + " co-op paste to chat.";
		gameChat.systemMessage(msg);
		coopPaste = !coopPaste;
		$(`#qpCoopButton i`).toggleClass('fas', coopPaste).toggleClass('fa', !coopPaste);
	});

	// Adds button to in-game options to enable paster
	let oldWidth = $("#qpOptionContainer").width();
	$("#qpOptionContainer").width(oldWidth + 35);
	$("#qpOptionContainer > div").append(coopButton);

	// add Enter key listener for copypasta
	new Listener("quiz ready", (data) => {
		quizJoinHandler(data);
	}).bindListener();
	new Listener("Rejoining Player", (data) => {
		quizJoinHandler(data);
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

function debounce(func, wait, immediate) {
	var timeout;
	return function() {
		var context = this, args = arguments;
		var later = function() {
			timeout = null;
			if (!immediate) func.apply(context, args);
		};
		var callNow = immediate && !timeout;
		clearTimeout(timeout);
		timeout = setTimeout(later, wait);
		if (callNow) func.apply(context, args);
	};
};

setup();

AMQ_addStyle(`
	#qpCoopButton {
		width: 30px;
		height: 100%;
		margin-right: 5px;
	}
`);