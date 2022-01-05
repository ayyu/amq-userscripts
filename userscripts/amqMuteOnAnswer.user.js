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
  
  function setup() {
    new Listener(
      answerEvent, function() {
        volumeController.setMuted(true);
        volumeController.adjustVolume();
      }
    ).bindListener();
    new Listener(
      nextSongEvent, function() {
        volumeController.setMuted(false);
        volumeController.adjustVolume();
      }
    ).bindListener();
  }
})();
