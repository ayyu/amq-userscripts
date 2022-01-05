// ==UserScript==
// @name       	  AMQ Autocase
// @namespace  	  https://github.com/ayyu/
// @version    	  1.3
// @description	  Changes your answer to lowercase so you can pretend you didn't use dropdown, or alternate casing to troll.
// @author     	  ayyu
// @match      	  https://animemusicquiz.com/*
// @grant      	  none
// @require    	  https://raw.githubusercontent.com/TheJoseph98/AMQ-Scripts/master/common/amqScriptInfo.js
// @downloadURL	  https://raw.githubusercontent.com/ayyu/amq-userscripts/master/userscripts/amqAutocase.user.js
// ==/UserScript==

(() => {
	if (document.getElementById('startPage')) return;
	let loadInterval = setInterval(() => {
		if (document.getElementById("loadingScreen").classList.contains("hidden")) {
			setup();
			clearInterval(loadInterval);
		}
	}, 500);
	
	// too lazy to handle toggling in a better way
	// at least it's better than having 2 separate buttons
	let button;
	let toggleState = "none";
	// states: none lower alternate

	let msg;
	
	function quizJoinHandler(data) {
		quiz.answerInput.$input.off("keypress", answerHandler)
		.on("keypress", answerHandler);
	}
	
	function answerHandler(event) {
		var answer = quiz.answerInput.$input.val();
		if (event.which === 13) { // enter key
			switch (toggleState) {
				case "lower":
					quiz.answerInput.setNewAnswer(answer.toLowerCase());
					break;
				case "alternate":
					quiz.answerInput.setNewAnswer(
						answer.replace(/[a-z]/gi, c => c[`to${(answer = !answer) ? 'Upp' : 'Low'}erCase`]())
					);
			}
		}
	}
	
	function toggle() {
		$(`#qpCaseButton i`).removeClass("fa-font fa-wheelchair fa-wheelchair-alt");
		switch (toggleState) {
			case "none":
				msg = "Enabled auto lowercase";
				toggleState = "lower";
				$(`#qpCaseButton i`).addClass("fa-wheelchair fa-inverse");
				break;
			case "lower":
				msg = "Enabled auto alternate case";
				toggleState = "alternate";
				$(`#qpCaseButton i`).addClass("fa-wheelchair-alt fa-inverse");
				break;
			case "alternate":
				msg = "Disabled auto case";
				$(`#qpCaseButton i`).addClass("fa-font");
				$(`#qpCaseButton i`).removeClass("fa-inverse");
				toggleState = "none";
		}
		gameChat.systemMessage(msg);
	}
	
	function setup() {
		button = $(`<div id="qpCaseButton" class="clickAble qpOption"><i aria-hidden="true" class="fa fa-font qpMenuItem"></i></div>`);
		button.popover({
			placement: "bottom",
			content: "Toggle automatic casing",
			trigger: "hover"
		});
		button.click(toggle);
		
		// Adds button to in-game options to enable paster
		let oldWidth = $("#qpOptionContainer").width();
		$("#qpOptionContainer").width(oldWidth + 35);
		$("#qpOptionContainer > div").append(button);
		
		// add Enter key listener for copypasta
		new Listener("quiz ready", (data) => {
			quizJoinHandler(data);
		}).bindListener();
		new Listener("Rejoining Player", (data) => {
			quizJoinHandler(data);
		}).bindListener();
	
		AMQ_addScriptData({
			name: "Autocase",
			author: "ayyu",
			description: `
				<p>Changes your answer to upper/lowercase so you can pretend you didn't use dropdown, or alternate casing to troll.</p>
				<p>Adds toggleable button in-game <i aria-hidden="true" class="fa fa-font"></i></p>
			`
		});
	
		AMQ_addStyle(`
		#qpCaseButton {
			width: 30px;
			height: 100%;
			margin-right: 5px;
		}`);
	}
})();
