// ==UserScript==
// @name       	  AMQ List Entry Counter
// @namespace  	  https://github.com/ayyu/
// @version    	  0.2
// @description	  Counts the number of unique entries in your list with songs.
// @description	  Does not send anything to spreadsheet, unlike Joseph's script.
// @author     	  ayyu
// @match      	  https://animemusicquiz.com/*
// @grant      	  none
// @require    	  https://raw.githubusercontent.com/TheJoseph98/AMQ-Scripts/master/common/amqScriptInfo.js
// @downloadURL	  https://raw.githubusercontent.com/ayyu/amq-userscripts/master/userscripts/amqListEntryCounter.user.js
// ==/UserScript==

(() => {
  let yearsRange = [1944, 2022];
  const seasons = [0, 1, 2, 3];

  let counting = false;
  let count = {};
  let currYear;
  let currSeason;

  // old listeners
  let oldSettingsChangeListener;
  let oldQuizNoSongsListener;
  let oldQuizOverListener;

  // new listeners
  let quizReadyListener;
  let playNextSongListener;
  let quizNoSongsListener;
  let quizOverListener;
  let settingsChangeListener;
  let hostGameListener;
  let joinGameListener;
  let spectateGameListener;

  const buttonID = 'lbEntryCounterButton';
  const stopID = 'qpEntryStopCounter';
  const buttonHTML = $(
    `<div class="clickAble topMenuButton topMenuMediumButton" id="${buttonID}">
      <h3>Entry Counter</h3>
    </div>`
  );
  let buttonHidden = false;

  if (document.getElementById('startPage')) return;
  let loadInterval = setInterval(() => {
    if (document.getElementById("loadingScreen").classList.contains("hidden")) {
      setup();
      clearInterval(loadInterval);
    }
  }, 500);

  function showCounterButton() {
    $(`#${buttonID}`).show();
    if (buttonHidden) {
      let oldWidth = $("#qpOptionContainer").width();
      $("#qpOptionContainer").width(oldWidth + 35);
      $(`#${stopID}`).show();
      buttonHidden = false;
    }
  }

  function hideCounterButton() {
    $(`#${buttonID}`).hide();
    if (buttonHidden) {
      let oldWidth = $("#qpOptionContainer").width();
      $("#qpOptionContainer").width(oldWidth - 35);
      $(`#${stopID}`).hide();
      buttonHidden = true;
    }
  }

  function setDate(year, season) {
    hostModal.vintageRangeSliderCombo.setValue([year, year]);
    hostModal.fromSeasonSelector.setValue(seasons[season]);
    hostModal.toSeasonSelector.setValue(seasons[season]);
  }

  function checkboxOn(checkbox) {
    if (!checkbox.is(":checked")) checkbox.click();
  }
  function checkboxOff(checkbox) {
    if (checkbox.is(":checked")) checkbox.click();
  }

  function setSettings() {
    // 100 watched
    hostModal.numberOfSongsSliderCombo.setValue(100);
    hostModal.watchedSliderCombo.setValue(100);
    // don't change difficulties
    /*hostModal.songDiffAdvancedSwitch.setOn(true);
    hostModal.songDiffRangeSliderCombo.setValue([0, 100]);*/
    // 5s + vote skip
    hostModal.playLengthSliderCombo.setValue(5);
    options.$AUTO_VOTE_REPLAY.prop("checked", true);
    options.updateAutoVoteSkipReplay();
    // don't change song types
    /*checkboxOn(hostModal.$songTypeOpening);
    checkboxOn(hostModal.$songTypeEnding);
    checkboxOn(hostModal.$songTypeInsert);*/
    // dupes off
    checkboxOff(hostModal.$duplicateShows);
    // don't change rb/dub
    /* checkboxOn(hostModal.$rebroadcastSongs);
    checkboxOn(hostModal.$dubSongs); */
  }

  function startGame() {
    if (!counting || !$("#lbStartButton").is(':visible')) return;
    $("#lbStartButton").click();
  }

  function startCounting() {
    if (!lobby.soloMode || !lobby.inLobby) {
      displayMessage("Error", "Must be in solo mode");
      return;
    }
    counting = true;

    lobby._settingListener.unbindListener();
    quiz._noSongsListner.unbindListener();
    quiz._quizOverListner.unbindListener();
    lobby._settingListener = new Listener("Room Settings Changed", () => {});
    quiz._noSongsListner = new Listener("Quiz no songs", () => {});
    quiz._quizOverListner = new Listener("quiz over", () => {});

    quizReadyListener.bindListener();
    playNextSongListener.bindListener();
    quizNoSongsListener.bindListener();
    quizOverListener.bindListener();
    settingsChangeListener.bindListener();

    
    initializeCount();
    currYear = yearsRange[0];
    currSeason = 0;

    setDate(currYear, currSeason);
    setSettings();

    lobby.changeGameSettings();

    volumeController.setMuted(true);
    volumeController.adjustVolume();
    qualityController.newResolution(0);
  }

  function stopCounting() {
    lobby._settingListener = oldSettingsChangeListener;
    quiz._noSongsListner = oldQuizNoSongsListener;
    quiz._quizOverListner = oldQuizOverListener;
    lobby._settingListener.bindListener();
    quiz._noSongsListner.bindListener();
    quiz._quizOverListner.bindListener();

    quizReadyListener.unbindListener();
    playNextSongListener.unbindListener();
    quizNoSongsListener.unbindListener();
    quizOverListener.unbindListener();
    settingsChangeListener.unbindListener();
    
    counting = false;

    setTimeout(() => hostModal.vintageRangeSliderCombo.setValue(yearsRange), 500);
    gameChat.systemMessage("Counter stopped");
    total = 0;
    for (const year in count) {
      for (const season in count[year]) {
        total += count[year][season];
      }
    }
    gameChat.systemMessage(`Total entries: ${total}`);
    exportJSON();
    console.log(count);
  }

  function exportJSON() {
    let filename = `entry_counter_${selfName}.json`;
    let JSONData =  new Blob(
      [JSON.stringify(count)],
      {type: "application/json"}
    );
    let tmpLink = $(`<a href="${URL.createObjectURL(JSONData)}" download="${filename}"></a>`);
    $(document.body).append(tmpLink);
    tmpLink.get(0).click();
    tmpLink.remove();
  }

  function initializeCount() {
    yearsRange = hostModal.vintageRangeSliderCombo.getValue();
    for (i = yearsRange[0]; i <= yearsRange[1]; i++) {
      count[i] = {};
    }
  }

  function updateDateRange() {
    currSeason++;
    if (currSeason >= seasons.length) {
      currYear++;
      if (currYear > yearsRange[1]) {
        stopCounting();
        return;
      }
      currSeason = 0;
    }
    setDate(currYear, currSeason);
    lobby.changeGameSettings();
  }

  function addSongCounter(year, season, amount) {
    //console.log(year, season, amount);
    count[year][season] = amount;
    gameChat.systemMessage(
      `Entries in ${year} ${seasonToString(season)}: ${amount}`
    );
  }

  function seasonToString(season) {
    return ['Winter', 'Spring', 'Summer', 'Fall'][season];
  }

  function setup() {
    quizNoSongsListener = new Listener("Quiz no songs", () => 
      addSongCounter(currYear, currSeason, 0)
    );

    quizReadyListener = new Listener("quiz ready", (payload) => {
      addSongCounter(currYear, currSeason, payload.numberOfSongs);
      socket.sendCommand({
        type: "quiz",
        command: "start return lobby vote",
      });
    });

    playNextSongListener = new Listener("play next song", () => {
      // 500 ms delay because race conditions
      setTimeout(() => quiz.skipClicked(), 500);
    });

    quizOverListener = new Listener("quiz over", payload => {
      lobby.setupLobby(payload, quiz.isSpectator);
      viewChanger.changeView("lobby", {
        supressServerMsg: true,
        keepChatOpen: true
      });
      if (lobby.inLobby && lobby.soloMode) {
        updateDateRange();
      } else {
        displayMessage("Error", "You must be in a solo lobby");
        stopCounting();
      }
    });

    settingsChangeListener = new Listener("Room Settings Changed", payload => {
      //console.log(payload);
      hostModal.changeSettings(payload);
      Object.keys(payload).forEach(key => {
        let newValue = payload[key];
        lobby.settings[key] = newValue;
      });

      if (payload.roomSize) {
        lobby.settings.roomSize = payload.roomSize;
      }

      Object.values(lobby.players).forEach(player => {
        player.ready = true;
      });

      lobby.isReady = true;
      lobby.toggleRuleButton();
      lobby.updateMainButton();
      if (payload.roomName) {
        lobby.$roomName.text(payload.roomName);
      }

      lobby.updatePlayerCounter();

      startGame();
    });

    hostGameListener = new Listener("Host Game", payload => {
      if (payload.soloMode) {
        showCounterButton();
      } else {
        hideCounterButton();
      }
    });

    joinGameListener = new Listener("Join Game", payload => {
      if (payload.soloMode) {
        showCounterButton();
      } else {
        hideCounterButton();
      }
    });

    spectateGameListener = new Listener("Spectate Game", () => {
      hideCounterButton();
    });

    oldQuizOverListener = quiz._quizOverListner;
    oldSettingsChangeListener = lobby._settingListener;
    oldQuizNoSongsListener = quiz._noSongsListner;

    // stop counting button
    let oldWidth = $("#qpOptionContainer").width();
    $("#qpOptionContainer").width(oldWidth + 35);
    $("#qpOptionContainer > div").append(
      $("<div></div>")
      .attr("id", stopID)
      .attr("class", "clickAble qpOption")
      .html(`<i aria-hidden="true" class="fa fa-ban qpMenuItem"></i>`)
      .click(() => { if (counting) stopCounting(); })
      .popover({
        content: "Stop Counting Entries",
        trigger: "hover",
        placement: "bottom"
      })
    );

    $("#lobbyPage .menuBar").append(buttonHTML);
    buttonHTML.click(() => {
      startCounting();
    });

    AMQ_addStyle(`
      #${buttonID} {
        width: 170px;
        left: 25%;
      }
      #${stopID} {
        width: 30px;
        height: auto;
        margin-right: 5px;
      }
    `);

    hostGameListener.bindListener();
    joinGameListener.bindListener();
    spectateGameListener.bindListener();
  }

})();
