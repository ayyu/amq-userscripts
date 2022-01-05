// ==UserScript==
// @name        	AMQ Custom Commands
// @namespace   	https://github.com/ayyu/
// @version     	0.2.1
// @description 	Chat commands for custom game modes. spies command from nyamu
// @author      	ayyu
// @match       	https://animemusicquiz.com/*
// @grant       	none
// @require     	https://raw.githubusercontent.com/TheJoseph98/AMQ-Scripts/master/common/amqScriptInfo.js
// @downloadURL 	https://raw.githubusercontent.com/ayyu/amq-userscripts/master/userscripts/amqCustomCommands.user.js
// ==/UserScript==

(() => {
  if (document.getElementById('startPage')) return;
	let loadInterval = setInterval(() => {
		if (document.getElementById("loadingScreen").classList.contains("hidden")) {
			setup();
			clearInterval(loadInterval);
		}
	}, 500);

  // knuth
  function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  function processChatCommand(payload) {
    if (payload.sender !== selfName
        || quiz.gameMode == 'Ranked'
        || (!quiz.inQuiz && !lobby.inLobby)) return;
    
    if (payload.message.startsWith('/assign_spies')) {
      var names = lobby.players.map(player => player._name)
      shuffleArray(names);
      for (var i = 0; i < names.length; i++) {
        const assassin = names[i];
        const spy = names[(i + 1) % names.length];
        setTimeout((from, target) => {
          socket.sendCommand({
            type: "social",
            command: "chat message",
            data: { target: from, message: target },
          });
        }, 1000 * i, assassin, spy);
      }
    }
  }
  
  function setup() {
    new Listener("Game Chat Message", processChatCommand).bindListener();
    new Listener("game chat update", (payload) => {
      payload.messages.forEach(message => processChatCommand(message));
    }).bindListener();
    
    AMQ_addScriptData({
      name: "Custom Commands",
      author: "ayyu",
      description: `<p>Some custom chat commands. Currently only has the one for assigning spies.</p>`
    });
  }
  
})();
