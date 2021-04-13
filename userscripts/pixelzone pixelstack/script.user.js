// ==UserScript==
// @name         Pixelzone pixelstack
// @version      1.0
// @description  fuck
// @author       Endless Night
// @match        https://pixelzone.io/*
// @icon         https://raw.githubusercontent.com/EndlessNightNLR/endlessnightnlr.github.io/master/images/NLRicon.png
// ==/UserScript==

fetch('https://raw.githubusercontent.com/EndlessNightNLR/endlessnightnlr.github.io/master/userscripts/pixelzone%20pixelstack/code.js')
.then(res => res.text())
.then(code => {
  const script = document.createElement('script');
  script.innerHTML = '(' + code + ')();';
  document.body.appendChild(script);
});
