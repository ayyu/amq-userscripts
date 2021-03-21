// ==UserScript==
// @name         AMQ Co-op Autopaste
// @namespace    https://github.com/ayyu/
// @version      1.5
// @description  Automatically pastes your submitted answer to chat. Piggybacks off TheJoseph98's framework.
// @author       ayyu
// @match        https://animemusicquiz.com/*
// @grant        none
// @require      https://raw.githubusercontent.com/TheJoseph98/AMQ-Scripts/master/common/amqScriptInfo.js
// @require      https://raw.githubusercontent.com/TheJoseph98/AMQ-Scripts/master/common/amqWindows.js
// @downloadURL  https://raw.githubusercontent.com/ayyu/amq-scripts/master/userscripts/amqCoopPaste.user.js
// ==/UserScript==

if (!window.setupDocumentDone) return;

let minInterval = 200;
let lastAnswer = "";

let coopWindow;

function setup() {
	// create paster window
	coopWindow = new AMQWindow({
		title: "Co-op Autopaste",
		width: 300,
		height: 130,
		zIndex: 1054,
		draggable: true
	});
	coopWindow.addPanel({
		width: 1.0,
		height: 50,
		id: "coopWindowControls"
	});
	coopWindow.panels[0].panel.append($(`<div></div>`)
		.addClass("customCheckboxContainer")
		.append($(`<div></div>`)
			.addClass("customCheckbox")
			.append($(`<input id="coopPasteCheckbox" type="checkbox">`))
			.append($("<label for='coopPasteCheckbox'><i class='fa fa-check' aria-hidden='true'></i></label>"))
		)
		.append($(`<label for="coopPasteCheckbox"></label>`)
			.addClass("customCheckboxContainerLabel")
			.text("Enable auto-paste"))
	);

	// Adds button to in-game options to enable paster
	let oldWidth = $("#qpOptionContainer").width();
	$("#qpOptionContainer").width(oldWidth + 35);
	$("#qpOptionContainer > div").append($(`<div id="qpCoopPaster" class="clickAble qpOption"><i aria-hidden="true" class="fa fa-paste qpMenuItem"></i></div>`)
		.click(() => {
			if (coopWindow.isVisible()) {
				coopWindow.close();
			}
			else {
				coopWindow.open();
			}
		})
		.popover({
			content: "Co-op Autopaster",
			trigger: "hover",
			placement: "bottom"
		})
	);

	// add Enter key listener for copypasta
	let quizReadyListener = new Listener("quiz ready", data => {
		if (quiz.gameMode !== "Ranked") {
			$("#qpAnswerInput").off("keypress", answerHandler)
			.on("keypress", answerHandler);
		}
		else {
			$("#qpAnswerInput").off("keypress", answerHandler);
		}
	});

	// Sends current answer as chat message
	/*let answerHandler = debounce( function (event) {
		if (event.which === 13 && $("#coopPasteCheckbox").prop("checked")) {
			gameChat.$chatInputField.val($("#qpAnswerInput").val());
			gameChat.sendMessage();
		}
	}, minInterval, true);*/
	let answerHandler = function (event) {
		var answer = $("#qpAnswerInput").val();
		if (event.which === 13 && $("#coopPasteCheckbox").prop("checked") && answer != lastAnswer) {
			gameChat.$chatInputField.val(answer);
			gameChat.sendMessage();
			lastAnswer = answer;
		}
	};

	quizReadyListener.bindListener();

	console.log("co-op setup");
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

AMQ_addScriptData({
	name: "Co-op Autopaste",
	author: "ayyu",
	description: `
		<p>Automatically pastes your submitted answer to chat, for grinding co-op lobbies. This script is disabled during ranked.</p>
		<p>The script can be turned on by clicking on the clipboard icon in the top right next to the settings icon while in a quiz.</p>
		<p>Piggybacks off of some parts by TheJoseph98</p>
	`
});

AMQ_addStyle(`
	#qpCoopPaster {
		width: 30px;
		margin-right: 5px;
	}
	#coopWindowControls .customCheckboxContainer {
		padding: 1rem 0;
		align-items: center;
		justify-content: center;
	}
	.customCheckboxContainer {
		display: flex;
	}
	.customCheckboxContainer > div {
		display: inline-block;
		margin: 5px 0px;
	}
	.customCheckboxContainer > .customCheckboxContainerLabel {
		margin-left: 5px;
		margin-top: 5px;
		font-weight: normal;
	}
`);
