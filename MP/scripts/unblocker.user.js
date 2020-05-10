// ==UserScript==
// @name         MiniPixel Разблокировщик
// @version      0.1
// @description  Glory to NLR!
// @author       Endless Night
// @include      https://goodsanta.club/*
// ==/UserScript==
//
// Glory to the Luna and New Lunar Republic!
//

setInterval(console.clear,1e3*60);
reloadMe = () => {};
(() => {
	let isFramed;
	try {isFramed=window!=window.top||document!=top.document||self.location!=top.location} catch (e) {isFramed=true};
	isFramed && window.open(location.href);

	(function unblock(){
		let n = document.getElementById('preloaderapp2');
		n ? n.parentNode.removeChild(n) : setTimeout(unblock,100);
	})();
})();
