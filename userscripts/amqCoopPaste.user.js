// ==UserScript==
// @name        	AMQ Co-op Autopaste
// @namespace   	https://github.com/ayyu/
// @version     	2.4.3
// @description 	Automatically pastes your submitted answer to chat. Also copies other people's submitted answers.
// @author      	ayyu
// @match       	https://animemusicquiz.com/*
// @grant       	none
// @require     	https://raw.githubusercontent.com/TheJoseph98/AMQ-Scripts/master/common/amqScriptInfo.js
// @downloadURL 	https://raw.githubusercontent.com/ayyu/amq-userscripts/master/userscripts/amqCoopPaste.user.js
// ==/UserScript==

(() => {
  if (document.getElementById('startPage')) return;
  let loadInterval = setInterval(() => {
    if (document.getElementById("loadingScreen").classList.contains("hidden")) {
      setup();
      clearInterval(loadInterval);
    }
  }, 500);

  const toggleButtonID = 'qpCoopButton';
  const faIcon = 'fa-clipboard';
  const toggleButton = $(
    `<div id="${toggleButtonID}" class="clickAble qpOption">
      <i aria-hidden="true" class="fa ${faIcon} qpMenuItem"></i>
    </div>`
  );

  const prefix = "[CP] ";
  const rePrefix = new RegExp(
    "^" + prefix.replace(/[-\/\\^$*+?.()|[\]{}]/g,
    '\\$&'
  ));
  
  let toggleActive = false;
  let pasted = false;
  let lastAnswer = "";

  function ciCompare(a, b) {
    if (typeof a != "string" || typeof b != "string") return false;
    return a.trim().toUpperCase() == b.trim().toUpperCase();
  }

  function answerHandler(payload) {
    if (!toggleActive
        || quiz.gameMode == "Ranked"
        || pasted) return;
    
    answer = payload.answer
    if (ciCompare(answer, lastAnswer)) return;
    
    socket.sendCommand({
      type: 'lobby',
      command: 'game chat message',
      data: { msg: prefix + answer, teamMessage: false }
    });
    pasted = false;
  }

  function messageHandler(payload) {
    if (!toggleActive
        || payload.sender == selfName
        || !rePrefix.test(payload.message)) return;
    answer = payload.message.replace(rePrefix, '');
    if (!ciCompare(quiz.answerInput.typingInput.quizAnswerState.submittedAnswer, answer)) {
      pasted = true;
      quiz.answerInput.typingInput.setNewAnswer(answer);
    }
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
        (toggleActive ? "Enabled" : "Disabled") + " co-op paste to chat."
      );
      $(`#${toggleButtonID} i`).toggleClass("fa-inverse", toggleActive);
    });

    // Adds button to in-game options to enable paster
    let oldWidth = $(`#qpOptionContainer`).width();
    $(`#qpOptionContainer`).width(oldWidth + 35);
    $(`#qpOptionContainer > div`).append(toggleButton);

    // listener for submission
    new Listener("quiz answer", answerHandler).bindListener();

    // clear last answer upon new song
    new Listener("answer results", () => lastAnswer = "").bindListener();

    // enter answers that are pasted
    new Listener("game chat message", messageHandler).bindListener();
    new Listener("game chat update", (payload) => {
      payload.messages.forEach(message => messageHandler(message));
    }).bindListener();

    AMQ_addScriptData({
      name: "Co-op Autopaste",
      author: "ayyu",
      description:
        `<p>Automatically pastes your submitted answer to chat.
        Also copies other people's submitted answers.</p>
        <p>Adds toggleable button in-game:
        <i aria-hidden="true" class="fa ${faIcon}"></i></p>`
    });

    AMQ_addStyle(`#${toggleButtonID} {
      width: 30px;
      height: 100%;
      margin-right: 5px;
    }`);
  }
})();
