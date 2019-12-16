// ==UserScript==
// @name         Minimap fenerzone
// @namespace    http://tampermonkey.net/
// @version      1.0
// @author       Endless Night (and ConsoleBey)
// @include      *://pixelzone.io/*
// @homepage     https://github.com/EndlessNightNLR
// @updateURL    https://github.com/EndlessNightNLR/endlessnightnlr.github.io/blob/master/fenerzone/node.js
// @downloadURL  https://github.com/EndlessNightNLR/endlessnightnlr.github.io/blob/master/fenerzone/node.js
// ==/UserScript==
(()=>{
	let e = document.createElement(`script`);
	e.src = 'https://raw.githubusercontent.com/EndlessNightNLR/endlessnightnlr.github.io/master/fenerzone/minimap.js';
	document.body.appendChild(e);
})();
