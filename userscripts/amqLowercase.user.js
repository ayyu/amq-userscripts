// ==UserScript==
// @name         AMQ Lowercase
// @namespace    https://github.com/ayyu/
// @version      1.0
// @description  Changes your answer to lowercase so you can pretend you didn't use dropdown.
// @author       ayyu
// @match        https://animemusicquiz.com/*
// @grant        none
// @require      https://raw.githubusercontent.com/TheJoseph98/AMQ-Scripts/master/common/amqScriptInfo.js
// @downloadURL  https://raw.githubusercontent.com/ayyu/amq-scripts/master/userscripts/amqLowercase.user.js
// ==/UserScript==

if (document.getElementById('startPage')) {
	return;
}

let lowercaseButton;
let lowercaseSwitch = false;

function quizJoinHandler(data) {
	quiz.answerInput.$input.off("keypress", answerHandler)
	.on("keypress", answerHandler);
}

function answerHandler(event) {
	var answer = quiz.answerInput.$input.val();
	if (event.which === 13 && lowercaseSwitch) {
		quiz.answerInput.setNewAnswer(answer.toLowerCase());
	}
}

function setup() {
	lowercaseButton = $(`<div id="qpLowercaseButton" class="clickAble qpOption"><i aria-hidden="true" class="fa fa-wheelchair-alt qpMenuItem"></i></div>`);
	lowercaseButton.popover({
		placement: "bottom",
		content: "Toggle automatic lowercase",
		trigger: "hover"
	});
	lowercaseButton.click(function () {
		msg = (lowercaseSwitch ? "Disabled" : "Enabled") + " auto lowercase.";
		gameChat.systemMessage(msg);
		lowercaseSwitch = !lowercaseSwitch;
		$(`#qpLowercaseButton i`).toggleClass('fa-inverse', lowercaseSwitch);
	});

	// Adds button to in-game options to enable paster
	let oldWidth = $("#qpOptionContainer").width();
	$("#qpOptionContainer").width(oldWidth + 35);
	$("#qpOptionContainer > div").append(lowercaseButton);

	// add Enter key listener for copypasta
	new Listener("quiz ready", (data) => {
		quizJoinHandler(data);
	}).bindListener();
	new Listener("Rejoining Player", (data) => {
		quizJoinHandler(data);
	}).bindListener();
}

setup();

AMQ_addStyle(`
	#qpLowercaseButton {
		width: 30px;
		height: 100%;
		margin-right: 5px;
	}
`);