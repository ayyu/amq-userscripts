// ==UserScript==
// @name         AMQ Hotkey Functions
// @namespace    https://github.com/ayyu/amq-scripts
// @version      2.0.1
// @description  Hotkey bindings for lobby functions. Also includes auto ready and auto skip.
// @description  Customize hotkeys by editing the keyBinds object.
// @author       ayyu
// @match        https://animemusicquiz.com/*
// @grant        none
// @require      https://raw.githubusercontent.com/TheJoseph98/AMQ-Scripts/master/common/amqScriptInfo.js
// @downloadURL  https://raw.githubusercontent.com/ayyu/amq-scripts/master/userscripts/amqHotkeys.user.js
// ==/UserScript==

(() => {
  // set your keybinds here
  let keybinds = [
    {
      'mod': ['alt'],
      'key': 'Backspace',
      'callback': pauseQuiz,
      'description': 'pause quiz'
    },
    {
      'mod': [],
      'key': 'Escape',
      'callback': clearTooltips,
      'description': 'remove ghost tooltips'
    },
    {
      'mod': ['alt'],
      'key': 'ArrowUp',
      'callback': startLobby,
      'description': 'start game if all players are ready'
    },
    {
      'mod': ['alt'],
      'key': 'ArrowDown',
      'callback': returnLobby,
      'description': 'start vote for returning to lobby, or add your vote to return'
    },
    {
      'mod': ['alt'],
      'key': 'ArrowLeft',
      'callback': joinLobby,
      'description': 'switch to player'
    },
    {
      'mod': ['alt'],
      'key': 'ArrowRight',
      'callback': joinSpec,
      'description': 'switch to spectator'
    },
    {
      'mod': ['alt'],
      'key': '`',
      'callback': toggleTeamChat,
      'description': 'toggle team chat'
    },
    {
      'mod': ['ctrl'],
      'key': 'Enter',
      'callback': voteSkip,
      'description': 'vote to skip current song'
    },
    {
      'mod': [],
      'key': 'Tab',
      'callback': focusAnswer,
      'description': 'focus cursor on answer box'
    },
    {
      'mod': ['shift'],
      'key': 'Tab',
      'callback': focusChat,
      'description': 'focus cursor on chat'
    },
    {
      'mod': ['alt', 'shift'],
      'key': 'Enter',
      'callback': copyPasta,
      'description': 'copy paste latest message in chat'
    },
    {
      'mod': ['alt'],
      'key': 'z',
      'callback': toggleAutoSkip,
      'description': 'toggle auto skip'
    },
    {
      'mod': ['alt'],
      'key': 'r',
      'callback': toggleAutoReady,
      'description': 'toggle auto ready'
    },
  ];

  if (document.getElementById('startPage')) return;
  let loadInterval = setInterval(() => {
    if (document.getElementById('loadingScreen').classList.contains('hidden')) {
      setup();
      clearInterval(loadInterval);
    }
  }, 500);

  let auto_ready = Cookies.get('auto_ready');
  if (auto_ready != undefined) {
    localStorage.setItem('auto_ready', auto_ready);
    Cookies.set('auto_ready', '', { expires: 0 });
  }
  let toggles = {
    'auto skip': false,
    'auto ready': localStorage.getItem('auto_ready') == "true",
  }

  // socket functions
  
  function pauseQuiz() {
    if (!quiz.inQuiz
        || hostModal.gameMode == 'Ranked') return
    socket.sendCommand({
      type: 'quiz',
      command: 'quiz pause',
    });
  }

  function startLobby() {
    if (!lobby.isHost
        || lobby.numberOfPlayers == 0
        || lobby.numberOfPlayers != lobby.numberOfPlayersReady) return;
    socket.sendCommand({
      type: 'lobby',
      command: 'start game'
    });
  }

  function joinLobby() {
    if (lobby.isSpectator) {
      socket.sendCommand({
        type: 'lobby',
        command: 'change to player'
      });
    }
  }

  function joinSpec() {
    if(lobby.isSpectator) return;
    socket.sendCommand({
      type: 'lobby',
      command: 'change player to spectator',
      data: { playerName: selfName }
    });
  }
  
  function returnLobby() {
    if (!quiz.inQuiz
        || hostModal.gameMode == 'Ranked') return;
    if (lobby.isHost) socket.sendCommand({
      type: 'quiz',
      command: 'start return lobby vote',
    });
    socket.sendCommand({
      type: 'quiz',
      command: 'return lobby vote',
      data: { accept: true }
    });
  }

  function copyPasta() {
    lastMsg = $(`#gcMessageContainer .gcMessage`).last().text()
    socket.sendCommand({
      type: 'lobby',
      command: 'game chat message',
      data: { msg: lastMsg, teamMessage: false }
    });
  }

  // local UI functions

  function clearTooltips() {
    $(`[id^=tooltip]`).remove(); $(`[id^=popover]`).remove();
  }

  function voteSkip() {
    if (quiz.isSpectator) return;
    quiz.skipClicked();
  }

  function focusAnswer() {
    if (quiz.isSpectator) return
    $(`#gcInput`).blur();
    quiz.setInputInFocus(true);
    $(`#qpAnswerInput`).focus();
  }

  function focusChat() {
    quiz.setInputInFocus(false);
    $(`#gcInput`).focus();
  }

  function toggleTeamChat() {
    $(`#gcTeamChatSwitch`).trigger('click');
  }

  function _toggle(prop) {
    toggles[prop] = !toggles[prop];
    gameChat.systemMessage((toggles[prop] ? "Enabled" : "Disabled") + ` ${prop}.`);
  }

  function toggleAutoSkip() {
    _toggle('auto skip');
  }
  function toggleAutoReady() {
    _toggle('auto ready');
  }

  // pretty printing of hotkeys for script data
  function keybindToString(keybind) {
    const modString = keybind.mod.reduce((prev, curr) => {
      return prev + `<kbd>${curr}</kbd> + `;
    }, "");
    const keyString = `<kbd>${keybind.key}</kbd>`;
    return `${modString}${keyString}: ${keybind.description}`;
  }

  // handler for keypresses that I don't want to inline
  function onKeyDown(event) {
    keybinds.forEach(command => {
      if (event.key == command.key
          && command.mod.reduce((prev, curr) => {
            modProp = curr + "Key";
            return prev && (modProp in event) && event[modProp];
          }, true)) {
        event.preventDefault();
        event.stopPropagation();
        command.callback();
      }
    });
  }
  
  function notifyToggles(event) {
    if (event.error) return;
    for (const toggle in toggles) {
      if (toggles[toggle]) gameChat.systemMessage(`WARNING: ${toggle} is currently enabled.`);
    }
  }

  function checkReady() {
    setTimeout(() => {
      if (!toggles['auto ready']
        || lobby.isHost
        || !lobby.inLobby
        || lobby.isSpectator
        || lobby.isReady
        || quiz.gameMode == 'Ranked') return;
      socket.sendCommand({
        type: 'lobby',
        command: 'set ready',
        data: { ready: true }
      });
      lobby.updateMainButton();
    }, 50);
  }
  let readyEvents = [
    'Room Settings Changed',
    'Host Promotion',
    'Join Game',
    'Change To Player',
    'quiz over'
  ];
  let warningEvents = [
    'Join Game',
    'Spectate Game'
  ];

  function setup() {
    // autoskip
    new Listener("play next song", () => {
      setTimeout(() => {
        if (toggles['auto skip']) voteSkip();
      }, 500);
    }).bindListener();
    // autoready
    for (const event of readyEvents) {
      new Listener(event, checkReady).bindListener();
    }

    // warn about active toggles when joining a game
    for (const event of warningEvents) {
      new Listener(event, notifyToggles).bindListener();
    }

    document.addEventListener('keydown', onKeyDown, false);
    const keybindString = keybinds.map(keybindToString).reduce(
      (prev, curr) => {
        return prev + `<li>${curr}</li>`;
      }, '');
    AMQ_addScriptData({
      name: 'Hotkey Functions',
      author: 'ayyu',
      description:
        `<p>Streamlined version inspired by nyamu's hotkey script that conflicts less with normal browser usage.
        Customize hotkeys by editing the keyBinds object in the script.</p>
        <p>Current keybinds:</p>
        <ul>
          ${keybindString}
        </ul>`
    });
  }

})();
