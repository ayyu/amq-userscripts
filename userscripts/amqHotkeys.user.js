// ==UserScript==
// @name          AMQ Hotkey Functions
// @namespace     https://github.com/ayyu/amq-scripts
// @version       2.0.3
// @description   Hotkey bindings for lobby functions. Also includes auto ready and auto skip.
// @description   Customize hotkeys by editing the keyBinds object.
// @author        ayyu
// @match         https://animemusicquiz.com/*
// @grant         none
// @require       https://raw.githubusercontent.com/TheJoseph98/AMQ-Scripts/master/common/amqScriptInfo.js
// @downloadURL   https://raw.githubusercontent.com/ayyu/amq-userscripts/master/userscripts/amqHotkeys.user.js
// ==/UserScript==

(() => {
  // set your keybinds here
  let keybinds = [
    {
      'description': 'pause quiz',
      'callback': pauseQuiz,
      'key': 'Backspace',
      'mod': ['alt'],
    },
    {
      'description': 'remove ghost tooltips',
      'callback': clearTooltips,
      'key': 'Escape',
      'mod': [],
    },
    {
      'description': 'start game if all players are ready',
      'callback': startLobby,
      'key': 'ArrowUp',
      'mod': ['alt'],
    },
    {
      'description': 'start vote for returning to lobby, or add your vote to return',
      'callback': returnLobby,
      'key': 'ArrowDown',
      'mod': ['alt'],
    },
    {
      'description': 'switch to player',
      'callback': joinLobby,
      'key': 'ArrowLeft',
      'mod': ['alt'],
    },
    {
      'description': 'switch to spectator',
      'callback': joinSpec,
      'key': 'ArrowRight',
      'mod': ['alt'],
    },
    {
      'description': 'toggle team chat',
      'callback': () => $(`#gcTeamChatSwitch`).trigger('click'),
      'key': '`',
      'mod': ['alt'],
    },
    {
      'description': 'vote to skip current song',
      'callback': () => quiz.skipClicked(),
      'key': 'Enter',
      'mod': ['ctrl'],
    },
    {
      'description': 'focus cursor on answer box',
      'callback': focusAnswer,
      'key': 'Tab',
      'mod': [],
    },
    {
      'description': 'focus cursor on chat',
      'callback': focusChat,
      'key': 'Tab',
      'mod': ['shift'],
    },
    {
      'description': 'copy paste latest message in chat',
      'callback': copyPasta,
      'key': 'Enter',
      'mod': ['alt', 'shift'],
    },
    {
      'description': 'toggle auto skip',
      'callback': () => toggle('auto skip'),
      'key': 'z',
      'mod': ['alt'],
    },
    {
      'description': 'toggle auto ready',
      'callback': () => toggle('auto ready'),
      'key': 'r',
      'mod': ['alt'],
    },
    /*{
      'description': 'toggle mute on answer',
      'callback': () => $(`#qpMuteAnswerButton`).trigger('click'),
      'key': 'm',
      'mod': ['ctrl', 'alt'],
    },
    {
      'description': 'toggle co-op paste',
      'callback': () => $(`#qpCoopButton`).trigger('click'),
      'key': 'p',
      'mod': ['ctrl', 'alt'],
    },*/
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
    if (!lobby.isSpectator) return;
    socket.sendCommand({
      type: 'lobby',
      command: 'change to player'
    });
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
    $(`[id^=tooltip]`).remove();
    $(`[id^=popover]`).remove();
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

  function toggle(prop) {
    toggles[prop] = !toggles[prop];
    gameChat.systemMessage((toggles[prop] ? "Enabled" : "Disabled") + ` ${prop}.`);
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
    'Host Game',
    'Join Game',
    'Spectate Game'
  ];

  function setup() {
    // autoskip
    new Listener("play next song", () => {
      setTimeout(() => {
        if (toggles['auto skip']) quiz.skipClicked();
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
