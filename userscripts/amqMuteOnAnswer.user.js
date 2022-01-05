// ==UserScript==
// @name         AMQ Mute on Answer
// @namespace    https://github.com/ayyu/amq-scripts
// @version      1.0
// @author       ayyu
// @match        https://animemusicquiz.com/*
// @grant        none
// @require      https://raw.githubusercontent.com/TheJoseph98/AMQ-Scripts/master/common/amqScriptInfo.js
// @downloadURL  https://raw.githubusercontent.com/ayyu/amq-scripts/master/userscripts/amqMuteOnAnswer.user.js

// ==/UserScript==

(function() {
  if (document.getElementById('startPage')) return;
  let loadInterval = setInterval(() => {
		if (document.getElementById("loadingScreen").classList.contains("hidden")) {
      setup();
      clearInterval(loadInterval);
		}
	}, 500);
  
  let answerEvent = "quiz answer";
  let nextSongEvent = "play next song";
  
  new Listener(
    answerEvent, function(data) {
      volumeController.setMuted(true);
    }
  ).bindListener();
  new Listener(
    nextSongEvent, function(data) {
      volumeController.setMuted(false);
    }
  ).bindListener();
})();
