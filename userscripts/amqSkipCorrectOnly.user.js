// ==UserScript==
// @name        	AMQ Skip Correct Answers Only
// @namespace   	https://github.com/ayyu/
// @version     	0.1
// @description 	Only vote skips if you answer correctly. Turn off vote skip for Replay Phase in settings for this to work.
// @author      	ayyu
// @match       	https://animemusicquiz.com/*
// @grant       	none
// @require     	https://raw.githubusercontent.com/TheJoseph98/AMQ-Scripts/master/common/amqScriptInfo.js
// @downloadURL 	https://raw.githubusercontent.com/ayyu/amq-userscripts/master/userscripts/amqSkipCorrectOnly.user.js
// ==/UserScript==

if (document.getElementById('startPage')) return;
let loadInterval = setInterval(() => {
  if (document.getElementById("loadingScreen").classList.contains("hidden")) {
    setup();
    clearInterval(loadInterval);
  }
}, 500);

const toggleButtonID = 'qpSkipCorrectButton';
const faIcon = 'fa-step-forward';
const toggleButton = $(
`<div id="${toggleButtonID}" class="clickAble qpOption">
    <i aria-hidden="true" class="fa ${faIcon} qpMenuItem"></i>
</div>`
);

let toggleActive = false;

function answerResults(results) {
  if (!toggleActive || quiz.gameMode == "Ranked") return;
  socket.sendCommand({
    type: "quiz",
    command: "skip vote",
    data: { skipVote: results.players[quiz.ownGamePlayerId].correct }
  });
}

function setup() {
  toggleButton.popover({
    placement: "bottom",
    content: "Toggle co-op copy paste to chat",
    trigger: "hover"
  });
  toggleButton.click(() => {
    toggleActive = !toggleActive;
    gameChat.systemMessage(
      (toggleActive ? "Enabled" : "Disabled") + " skip on correct answers only."
    );
    $(`#${toggleButtonID} i`).toggleClass("fa-inverse", toggleActive);
  });
  // Adds button to in-game options
  let oldWidth = $(`#qpOptionContainer`).width();
  $(`#qpOptionContainer`).width(oldWidth + 35);
  $(`#qpOptionContainer > div`).append(toggleButton);

  new Listener("answer results", answerResults).bindListener();

  AMQ_addScriptData({
    name: 'Skip Correct Answers Only',
    author: 'ayyu',
    description:
      `<p>Vote skips on reveal phase if you got the answer right.</p><p>Turn off vote skip for Replay Phase in settings for this to work.</p>`
  });

  AMQ_addStyle(`#${toggleButtonID} {
    width: 30px;
    height: 100%;
    margin-right: 5px;
  }`);
}
