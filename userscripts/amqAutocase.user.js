// ==UserScript==
// @name       	  AMQ Auto Case
// @namespace  	  https://github.com/ayyu/
// @version    	  1.3.2
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

  const joinEvents = [
    'quiz ready',
    'Rejoining Player',
  ];

  const toggleStates = [
    {
      'name': 'off',
      'faIcon': 'fa-font',
      'callback': input => input,
    },
    {
      'name': 'lowercase',
      'faIcon': 'fa-wheelchair',
      'callback': input => input.toLowerCase(),
    },
    {
      'name': 'alternate case',
      'faIcon': 'fa-wheelchair-alt',
      'callback': input => input.replace(
        /[a-z]/gi,
        c => c[`to${(answer = !answer) ? 'Upp' : 'Low'}erCase`]()
      ),
    }
  ];

  let currState = 0;

  // too lazy to handle toggling in a better way
  // at least it's better than having 2 separate buttons
  const toggleButtonID = 'qpCaseToggleButton';
  const toggleButton = $(
    `<div id="${toggleButtonID}" class="clickAble qpOption">
      <i aria-hidden="true" class="fa ${toggleStates[currState]['faIcon']} qpMenuItem"></i>
    </div>`
  );
  
  function answerHandler(event) {
    if (event.which !== 13
        || currState == 0) return;
    quiz.answerInput.setNewAnswer(
      toggleStates[currState].callback(quiz.answerInput.$input.val())
    );
  }
  
  function toggle() {
    toggleStates.forEach(state => {
      $(`#${toggleButtonID} i`).removeClass(state['faIcon']);
    });
    currState = (currState + 1) % toggleStates.length;
    var state = toggleStates[currState];
    $(`#${toggleButtonID} i`).addClass(state['faIcon']);
    gameChat.systemMessage(`Toggled autocase to ${state['name']}`);
  }
  
  function setup() {
    toggleButton.popover({
      placement: "bottom",
      content: "Toggle automatic casing",
      trigger: "hover"
    });
    toggleButton.click(toggle);
    
    let oldWidth = $("#qpOptionContainer").width();
    $("#qpOptionContainer").width(oldWidth + 35);
    $("#qpOptionContainer > div").append(toggleButton);
    
    // add Enter key listener for copypasta
    joinEvents.forEach(event => {
      new Listener(event, () => {
        quiz.answerInput.$input
          .off("keypress", answerHandler)
          .on("keypress", answerHandler);
      }).bindListener();
    });
  
    AMQ_addScriptData({
      name: "Autocase",
      author: "ayyu",
      description:
        `<p>Changes your answer to lowercase to pretend you didn't use dropdown,
        or alternate casing to troll.</p>
        <p>Adds toggleable button in-game:
        <i aria-hidden="true" class="fa ${toggleStates[0]['faIcon']}"></i></p>`
    });
  
    AMQ_addStyle(`
    #${toggleButtonID} {
      width: 30px;
      height: 100%;
      margin-right: 5px;
    }`);
  }
})();
