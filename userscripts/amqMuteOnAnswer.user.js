// ==UserScript==
// @name          AMQ Mute on Answer
// @namespace     https://github.com/ayyu/amq-scripts
// @version       1.0.2
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
  
  const answerEvent = "quiz answer";
  const nextSongEvent = "play next song";

  const toggleButtonID = 'qpMuteAnswerButton';
  const faIcon = 'fa-bath';
  const toggleButton = $(
    `<div id="${toggleButtonID}" class="clickAble qpOption">
      <i aria-hidden="true" class="fa ${faIcon} qpMenuItem"></i>
    </div>`
  );
  
  let toggleActive = false;

  function adjustMuted(muted) {
    if (!toggleActive) return;
    volumeController.setMuted(muted);
    volumeController.adjustVolume();
  }
  
  function setup() {
    toggleButton.popover({
      placement: "bottom",
      content: "Toggle muting on answer",
      trigger: "hover"
    });
    toggleButton.click(() => {
      toggleActive = !toggleActive;
      gameChat.systemMessage(
        (toggleActive ? "Enabled" : "Disabled") + " muting on answer."
      );
      $(`#${toggleButtonID} i`).toggleClass("fa-inverse", toggleActive);
    });
    $(`#qpOptionContainer`).width($(`#qpOptionContainer`).width() + 35);
    $(`#qpOptionContainer > div`).append(toggleButton);

    new Listener(answerEvent, () => adjustMuted(true)).bindListener();
    new Listener(nextSongEvent, () => adjustMuted(false)).bindListener();
    
    AMQ_addScriptData({
      name: "Mute on Answer",
      author: "ayyu",
      description: `
        <p>Mutes volume once you enter an answer, in case you're multi tasking 
        or hate the song you're listening to.</p>
        <p>Adds toggleable button in-game:
        <i aria-hidden="true" class="fa ${faIcon}"></i></p>
      `
    });

    AMQ_addStyle(`#${toggleButtonID} {
      width: 30px;
      height: 100%;
      margin-right: 5px;
    }`);
  }
  
})();