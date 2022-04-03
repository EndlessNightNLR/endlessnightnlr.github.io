
// ==UserScript==
// @name         Module Bot
// @version      1.0
// @description  Ave Luna!
// @author       Endless Night
// @include      https://prod-app*
// ==/UserScript==

function initCode(){
	if(window.initModule) return window.initModule(module);
	if(!window.mapModules) window.mapModules = [];
	window.mapModules.push(module);
	async function module({
		minimap,
		settings,
		mouse,
		// palette,
		templates,
		// secretTemplates,
		functions,
		GM,
		Template,
		uo
	}){
		const COLORS = [[190,0,57],[255,69,0],[255,168,0],[255,214,53],[0,163,104],[0,204,120],[126,237,86],[0,117,111],[0,158,170],[36,80,164],[54,144,234],[81,233,244],[73,58,193],[106,92,255],[129,30,159],[180,74,192],[255,56,129],[255,153,170],[109,72,47],[156,105,38],[0,0,0],[137,141,144],[212,215,217],[255,255,255]];

		document.querySelector("mona-lisa-embed").wakeUp();

		const templateUrl = 'https://raw.githubusercontent.com/Autumn-Blaze/Autumn-Blaze.github.io/master/rplace/images/test.png';

		const {
			asyncQuerySelector,
			abs,
			factory,
			rand
		} = functions;

		console.log('[BOT] init started');

		// template		
		const tmp = new Template({
			x: 0,
			y: 0,
			width: 1590,
			height: 400,
			name: 'botTemp',
			src: templateUrl 
		});

		// place button
		const placeButton = await asyncQuerySelector(document, "mona-lisa-embed")
			.then(el => asyncQuerySelector(el.shadowRoot, "mona-lisa-color-picker"))
			.then(el => asyncQuerySelector(el.shadowRoot, "button.confirm"));
		console.log('[BOT] find place button');

		// game canvas
		const rPlaceCanvas = document.querySelector("mona-lisa-embed").shadowRoot.querySelector("mona-lisa-share-container mona-lisa-canvas").shadowRoot.querySelector("canvas");

		const botCanvas = document.createElement('canvas');
		botCanvas.width = rPlaceCanvas.width;
		botCanvas.height = rPlaceCanvas.height;
		const botCtx = botCanvas.getContext('2d');
		
		botCtx.clearRect(0, 0, botCanvas.width, botCanvas.height);
		// botCtx.globalCompositeOperation = 'source-in';
		botCtx.drawImage(rPlaceCanvas, 0, 0);
		// botCtx.globalCompositeOperation = 'source-over';

		// palette
		const paletteButtons = document.querySelector("mona-lisa-embed").shadowRoot.querySelector("mona-lisa-color-picker").shadowRoot.querySelectorAll('.palette button.color');
		const palette = [];
		for(const paletteButton of paletteButtons){
			const parsedData = paletteButton.children[0].style.backgroundColor.match(/rgb\(([0-9]{1,3}), ([0-9]{1,3}), ([0-9]{1,3})\)/);
			if(parsedData){
				palette.push([parsedData[1],parsedData[2],parsedData[3]]);
			}else{
				palette.push([0,0,0]);
			}
		}

		async function loadTargets (templateUrl) {
			await tmp.reload();
			return shuffle(createTargets(tmp))
		}

		function createTargets (tmp) {
			const targets = [];

			for (let i = 0, y = 0; y !== tmp.height; y++) {
				for (let x = 0; x !== tmp.width; x++) {
					i += 4;
					if (tmp.data[i | 3] > 128) {
						const conv = convertPixel([tmp.data[i | 0], tmp.data[i | 1], tmp.data[i | 2]]);
						targets.push([x, y, conv[0], conv[1], conv[2]]);
					}
				}
			}

			return targets;
		}

		function getCanvasData () {
			botCtx.clearRect(0, 0, botCanvas.width, botCanvas.height);
			botCtx.drawImage(rPlaceCanvas, 0, 0);
			return botCtx.getImageData(0, 0, botCanvas.width, botCanvas.height).data;
		}

		function same(f,s,range = 15){
			return abs(f[0] - s[0]) < range && abs(f[1] - s[1]) < range && abs(f[2] - s[2]) < range;
		}

		function convertPixel (rgb) {
			let nearIndex;
	        let nearD = Infinity;
	        let d, p;
			for(let i = 2; i !== COLORS.length; i++){
	            p = COLORS[i];
				if(same(p,rgb)){
	                return p;
	            };

	            d = abs(p[0]-rgb[0]) + abs(p[1]-rgb[1]) + abs(p[2]-rgb[2]);
				if(d < nearD){
	                nearD = d;
	                nearIndex = i;
	            };
			};
			return [...COLORS[nearIndex]];
		}

		function shuffle(array) {
		  let currentIndex = array.length, randomIndex;

		  while (currentIndex != 0) {
		    randomIndex = Math.floor(Math.random() * currentIndex);
		    currentIndex--;
		    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
		  }

		  return array;
		}

		function sleep (time) {
			return new Promise(r => setTimeout(r, time));
		}

		async function nextCycle(delay, reason = null) {
			if (reason !== null) {
				console.log(`[BOT] next cycle | ${delay} ms. | ${reason}`);
			}
			setTimeout(cycle, delay);
		}

		function getErorrsCount (canvas, targets) {
			let errors = 0;


			targets.forEach(target => {
				const canvasIndex = target[0] + target[1] * rPlaceCanvas.width;

				if (
					canvas[canvasIndex | 0] !== target[2] ||
					canvas[canvasIndex | 1] !== target[3] ||
					canvas[canvasIndex | 2] !== target[4]
				){
					errors++;
				}
			});

			return errors;		
		}

		function autoColorPick([r, g, b]){
			let diff = [];
			for(const color of palette){
				diff.push(Math.abs(r - color[0]) + Math.abs(g - color[1]) + Math.abs(b - color[2]));
			}
			let correctColorID = 0;
			for(let i = 0; i < diff.length; i++){
				if(diff[correctColorID] > diff[i]) correctColorID = i
			}
			//console.log(correctColorID);
			paletteButtons[correctColorID].click();
		}

		let works = false;
		async function cycle () {
			if (!works) return nextCycle(250);
			if (getTimerFromUI() !== 0) return nextCycle(2e3, 'timer isnt zero');

			const targets = await loadTargets(templateUrl);
			let gameCanvas = getCanvasData();

			// update ui 
			showErrorsCount(getErorrsCount(gameCanvas, targets));

			for (let i = 0; i !== targets.length; i++) {
				const j = i << 2;
				const target = targets[i];

				if (
					gameCanvas[j | 0] !== target[2] ||
					gameCanvas[j | 1] !== target[3] ||
					gameCanvas[j | 2] !== target[4]
				){
					console.log(`[BOT] move to ${target[0]}_${target[1]}`);
					document.querySelector("mona-lisa-embed").selectPixel({x: target[0], y: target[1]});
					console.log(`[BOT] choose [${target.slice(2).join('_')}]`);
					autoColorPick(target.slice(2));
					await sleep(1500);

					gameCanvas = getCanvasData();
					if (
						gameCanvas[j | 0] !== target[2] ||
						gameCanvas[j | 1] !== target[3] ||
						gameCanvas[j | 2] !== target[4]
					) {
						console.log(`[BOT] click`);
						placeButton.click();
						showLastPxl(`${target[0]}_${target[1]} [${target.slice(2).join('_')}]`);
						return nextCycle(5*60e3 + rand(2e3, 10e3), '');
					} else {
						console.log('[BOT] now pixel is right, search next target...')
						continue;
					}
				}
			}

			return nextCycle(1e3 + rand(1e3, 2e3), 'all is ready');
		}

		let panel = factory({
			type: 'div',
			style: 'position: absolute; top: 40%; right: 0; background-color: rgba(0,0,0,0.9); z-index:9999; transform:translate(-50%,0); color: white; padding: 5px;'
		});

		// let clicks = [];
		// panel.box.addEventListener('click', () => {
		// 	clicks.unshift(Date.now());

		// 	console.log('[BOT] click')
		// 	if (clicks[0] - clicks[2] < 1e3) {
		// 		panel.style.display = 'block';
		// 		console.log('[BOT] opened')
		// 	}

		// 	if (clicks.length >= 3) {
		// 		clicks.pop();
		// 	}
		// });

		document.body.appendChild(panel);

		let strategy = uo.getOrDefault('botStrategy','rand');

		//BOT STATUS
		let statusDisplayContainer;
		let statusDisplay;
		statusDisplayContainer = factory({
			type: 'div',
			text: 'status: '
		}, [
			statusDisplay = factory({
				type: 'span',
				text: 'off'
			})
		]);
		panel.appendChild(statusDisplayContainer);

		//LAST PIXEL
		let lastPxlDisplayContainer, lastPxlDisplay;
		lastPxlDisplayContainer = factory({
			type: 'div',
			text: 'last: '
		}, [
			 lastPxlDisplay = factory({
				type: 'span',
				text: 'null'
			})
		]);
		panel.appendChild(lastPxlDisplayContainer);

		//TARGETS COUNT
		let targetsCountDesc;
		let targetsCount;
		targetsCountDesc = factory({
			type: 'div',
			text: 'errors: '
		},[
			targetsCount = factory({
				type: 'span',
				text: 'undef'
			})
		]);
		panel.appendChild(targetsCountDesc);

		//BOT BUTTON
		let botBtn = factory({
			type: 'button',
			style: 'cursor:pointer;',
			text: 'work',
			listeners: {
				click: function(){
					if(works){
						works = false;
						setStatus('off');
					} else {
						works = true;
						setStatus('on');
					};
				}
			}
		});
		panel.appendChild(botBtn);

		nextCycle(0, 'first run');

		function setStatus(text){
			statusDisplay.innerText = text;
		}

		function showErrorsCount(text){
			targetsCount.innerText = text;
		}

		function getTimerFromUI(){
			const timer = document.querySelector("mona-lisa-embed").shadowRoot
				.querySelector('mona-lisa-share-container').shadowRoot
				.querySelector('mona-lisa-status-pill');

			if (!timer) {
				return 0;
			} else {
				return +timer.getAttribute('next-tile-available-in');
			}
		};

		function showLastPxl(text){
			lastPxlDisplay.innerText = text;
		};

		function showTimer(time){
			time = Math.round(timer*10)/10;
			timerContent.innerText = time;
		};
	};
};

(() => {
	let code = document.createElement('script');
	code.innerHTML = '('+initCode.toString()+')()';
	document.body.appendChild(code);
})();
