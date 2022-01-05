// ==UserScript==
// @name          AMQ Mute on Answer
// @namespace     https://github.com/ayyu/amq-scripts
// @version       1.0.1
// @author        ayyu
// @match         https://animemusicquiz.com/*
// @grant         none
// @require       https://raw.githubusercontent.com/TheJoseph98/AMQ-Scripts/master/common/amqScriptInfo.js
// @downloadURL   https://raw.githubusercontent.com/ayyu/amq-userscripts/master/userscripts/amqMuteOnAnswer.user.js
// ==/UserScript==

(() => {
  if (document.getElementById('startPage')) return;
  let loadInterval = setInterval(() => {
    if (document.getElementById("loadingScreen").classList.contains("hidden")) {
      setup();
      clearInterval(loadInterval);
    }
  }, 500);
  
  let answerEvent = "quiz answer";
  let nextSongEvent = "play next song";

  let toggleButton;
  let toggleActive;

  function adjustMuted(muted) {
    if (toggleActive) {
      volumeController.setMuted(muted);
      volumeController.adjustVolume();
    }
  }
  
  function setup() {
    toggleActive = false;
    toggleButton = $(`<div id="qpMuteAnswerButton" class="clickAble qpOption">
    <i aria-hidden="true" class="fa fa-bath qpMenuItem"></i>
    </div>`);
    toggleButton.popover({
      placement: "bottom",
      content: "Toggle muting on answer",
      trigger: "hover"
    });
    toggleButton.click(() => {
      toggleActive = !toggleActive;
      gameChat.systemMessage((toggleActive ? "Enabled" : "Disabled") + " muting on answer.");
      $(`#qpMuteAnswerButton i`).toggleClass("fa-inverse", toggleActive);
    });
    $(`#qpOptionContainer`).width($(`#qpOptionContainer`).width() + 35);
    $(`#qpOptionContainer > div`).append(toggleButton);

    new Listener(
      answerEvent, () => adjustMuted(true)
    ).bindListener();
    new Listener(
      nextSongEvent, () => adjustMuted(false)
    ).bindListener();
    
    AMQ_addScriptData({
      name: "Mute on Answer",
      author: "ayyu",
      description: `
        <p>Mutes volume once you enter an answer, in case you're multi tasking 
        or hate the song you're listening to.</p>
        <p>Adds toggleable button in-game <i aria-hidden="true" class="fa fa-bath"></i></p>
      `
    });

    AMQ_addStyle(`#qpMuteAnswerButton {
      width: 30px;
      height: 100%;
      margin-right: 5px;
    }`);
  }
  
})();