// ==UserScript==
// @name         AMQ Video Background script
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Simpler video background script, use with anything you can embed in a <video> tag
// @author       ayyu
// @match        https://animemusicquiz.com/*
// @grant        none
// @require      https://raw.githubusercontent.com/TheJoseph98/AMQ-Scripts/master/common/amqScriptInfo.js
// @downloadURL  https://raw.githubusercontent.com/ayyu/amq-scripts/master/amqVideoBackground.user.js
// ==/UserScript==


let video = "https://openings.moe/video/KodomoNoJikan-ED01-NCOLD.mp4";

let template = $(`<video id="custom-background" autoplay loop muted><source src="${video}"></video>`);

$("#gameContainer").append(template);

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

#gameContainer {
    background: none;
}
`);
