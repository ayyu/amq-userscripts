// ==UserScript==
// @name          AMQ Video Background script
// @namespace     https://github.com/ayyu/amq-scripts
// @version       1.0.2
// @description   Simpler video background script, use with anything you can embed in a <video> tag
// @author        ayyu
// @match         https://animemusicquiz.com/*
// @grant         none
// @require       https://raw.githubusercontent.com/TheJoseph98/AMQ-Scripts/master/common/amqScriptInfo.js
// @downloadURL   https://raw.githubusercontent.com/ayyu/amq-userscripts/master/userscripts/amqVideoBackground.user.js
// ==/UserScript==

(function() {
  // array of URLs to video files to be chosen from
  const videos = [
    "https://openings.moe/video/KodomoNoJikan-ED01-NCOLD.mp4",
    "https://openings.moe/video/KodomoNoJikanNiGakki-OP01-NCOLD.webm",
  ];
  
  const video = videos[Math.round(Math.random() * (videos.length - 1))];
  const template = $(
    `<video id="custom-background" autoplay loop muted>
      <source src="${video}">
    </video>`
  );
  
  const opacity = `0.8`;
  const bgGray = `rgba(66, 66, 66, ${opacity})`;
  const bgBlack = `rgba(27, 27, 27, ${opacity})`;
  
  $("#mainContainer").append(template);
  
  AMQ_addStyle(`
  #custom-background {
    position: fixed;
    top: 0%;
    left: 0%;
    width: 100vw;
    height: 100vh;
    object-fit: cover;
    z-index: -1;
  }
  
  #loadingScreen {
    background-image: none;
    background-color: ${bgBlack};
  }
  
  body, #mainContainer, #startPage, #gameContainer, #copyBox, #gameChatPage > .col-xs-9 {
    background: none !important;
  }
  
  #gameChatContainer {
    background-color: ${bgGray};
  }
  
  .gcList > li:nth-child(2n) {
    background-color: ${bgGray};
  }`);
})();
