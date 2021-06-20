// ==UserScript==
// @name         AMQ Lowercase
// @namespace    https://github.com/ayyu/
// @version      1.0
// @description  Changes your answer to lowercase so you can pretend you didn't use dropdown.
// @author       ayyu
// @match        https://animemusicquiz.com/*
// @grant        none
// @require      https://raw.githubusercontent.com/TheJoseph98/AMQ-Scripts/master/common/amqScriptInfo.js
// @downloadURL  https://raw.githubusercontent.com/ayyu/amq-scripts/master/userscripts/amqCoopPaste.user.js
// ==/UserScript==

if (document.getElementById('startPage')) {
	return;
}

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
	if (event.which === 13) {
		quiz.answerInput.setNewAnswer(answer.toLowerCase());
	}
}

function setup() {
	// add Enter key listener for copypasta
	new Listener("quiz ready", (data) => {
		quizJoinHandler(data);
	}).bindListener();
	new Listener("Rejoining Player", (data) => {
		quizJoinHandler(data);
	}).bindListener();
}

setup();