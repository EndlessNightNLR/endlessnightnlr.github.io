// ==UserScript==
// @name         NLR Minimap Launcher
// @namespace    New Lunar Republic
// @version      1.0
// @description  To the glory of Luna and the New Lunar Republic!
// @author       Endless Night
// @include      *://pixelzone.io/*
// @include      *://pixelplanet.fun/*
// @include      *://fuckyouarkeros.fun/*
// @include      *://vk.com/*
// @include      *://pixel2019.vkforms.ru/*
// @include      *://pixel2020.vkforms.ru/*
// @include      *://pixel.w84.vkforms.ru/*
// @include      *://ourworldofpixels.com/*
// @include      *://pixelplace.io/*
// @include      *://pxls.space/*
// @include      *://goodsanta.club/*
// @include      https://prod-app*
// @include      https://pixelwar-mts.ru/*
// @homepage     https://endlessnightnlr.github.io
// @updateURL    https://endlessnightnlr.github.io/userscripts/minimap/launcher.user.js
// @downloadURL  https://endlessnightnlr.github.io/userscripts/minimap/launcher.user.js
// ==/UserScript==

{
	const sites = {
		pixelzone: {
			trigger: /pixelzone.io/,
			src: 'https://endlessnightnlr.github.io/MLPP/MLPP_Minimap.user.js'
		},
		pixelplanet: {
			trigger: /pixelplanet.fun/,
			src: 'https://endlessnightnlr.github.io/userscripts/minimap/v3/code.js'
		},
		pixelplanetMirror: {
			trigger: /fuckyouarkeros.fun/,
			src: 'https://endlessnightnlr.github.io/userscripts/minimap/v3/code.js'
		},
		pixelbattle2020: {
			trigger: /https:\/\/prod-app/,
			src: 'https://endlessnightnlr.github.io/MLPP/pb/code.js'
		},
		OWOP: {
			trigger: /ourworldofpixels.com/,
			src: 'https://endlessnightnlr.github.io/MLPP/OWOP/code.js'
		},
		pixelplace: {
			trigger: /pixelplace.io/,
			src: 'https://endlessnightnlr.github.io/MLPP/PixelPlace/code.js'
		},
		pxlsspace: {
			trigger: /pxls.space/,
			src: 'https://endlessnightnlr.github.io/MLPP/PxlsSpace/code.js'
		},
		miniPixel: {
			trigger: /goodsanta.club/,
			src: 'https://endlessnightnlr.github.io/MLPP/MiniPixel/code.js'
		},
		MTSPixelbattle: {
			trigger: /pixelwar-mts.ru/,
			src: 'https://raw.githubusercontent.com/EndlessNightNLR/endlessnightnlr.github.io/master/MLPP/MTS%202021/code.js'
		}
	}

	const triggered = Object.values(sites).find(({ trigger }) => trigger.test(window.location));

	if (triggered && triggered.src) {
		fetch(triggered.src)
		.then(res => res.text())
		.then(code => {
			const e = document.createElement('script');
			e.innerHTML = code;
			document.body.appendChild(e);
		});
	}
}
