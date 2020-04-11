// ==UserScript==
// @name         NLR & Friends Minimap
// @version      1.1
// @description  Ave Luna!
// @author       Endless Night
// @include      *://pixelzone.io/*
// @include      *://pixelplanet.fun/*
// @include 	 *://fuckyouarkeros.fun/*
// @homepage     https://github.com/EndlessNightNLR
// @updateURL    https://endlessnightnlr.github.io/NLR/core.user.js
// @downloadURL  https://endlessnightnlr.github.io/NLR/core.user.js
// ==/UserScript==
//
// To the glory of Luna and the New Lunar Republic!
// (sorry Arkeros)
//
{
	let e = document.createElement(`script`);
	(e.src = {
		'pixelzone.io'       : 'https://endlessnightnlr.github.io/MLPP/MLPP_Minimap.user.js',
    	'pixelplanet.fun'    : 'https://endlessnightnlr.github.io/NLR/PixelPlanet/code.user.js',
    	'fuckyouarkeros.fun' : 'https://endlessnightnlr.github.io/NLR/PixelPlanet/code.user.js'
	}[window.location.host]) ? document.body.appendChild(e) : console.warn('SOURCE CODE FOR INJECTION NOT FOUND');
};
