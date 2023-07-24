// ==UserScript==
// @name         Module Bot
// @version      1.0
// @description  Ave Luna!
// @author       Endless Night
// @include      https://prod-app*
// ==/UserScript==

/* 1 */

async function initCode(){
	if(window.initModule) return window.initModule(module);
	if(!window.mapModules) window.mapModules = [];
	window.mapModules.push(module);
	async function module({
		minimap,
		settings,
		mouse,
		getCanvasApi,
		// palette,
		// templates,
		// secretTemplates,
		functions,
		GM,
		Template,
		uo
	}){
		while(getCanvasApi() === null) {
			await sleep(100);
		}

		const COLORS = getCanvasApi().colorsArray;

		const factions = {
			MLPP: [
				{
					x: -1000,
					y: -1000,
					src: 'https://raw.githubusercontent.com/EndlessNightNLR/endlessnightnlr.github.io/master/MLPP/rplace/canvas_b.png',
				}
			],
			MLP: [
				{
					x: -1000,
					y: -1000,
					src: 'https://raw.githubusercontent.com/EndlessNightNLR/endlessnightnlr.github.io/master/MLPP/rplace/canvas.png',
				}
			]
		}

		let currentFaction = Object.keys(factions)[0];

		const {
			asyncQuerySelector,
			abs,
			factory,
			rand,
			createPanelButton
		} = functions;

		console.log('[BOT] init started');

		// templates
		let templates = [];
		updateTemplateList();
		async function updateTemplateList () {
			templates = factions[currentFaction].map(({ x, y, src }) => new Template({
				x,
				y,
				width: 0, // not necessary
				height: 0,
				name: src.split('/').pop().split('.')[0],
				src
			}));
		}

		async function loadTargets(template) {
			await template.reload();
			return shuffle(createTargets(template))
		}

		function createTargets(tmp) {
			const targets = [];
			const { data } = tmp;

			for (let i = 0, y = 0; y !== tmp.height; y++) {
				for (let x = 0; x !== tmp.width; x++, i += 4) {
					if (data[i | 3] > 128) {
						// const conv = convertPixel(data.slice(i, i | 3));
						targets.push([x, y]);
					}
				}
			}

			return targets;
		}

		function same(f,s,range = 15){
			return abs(f[0] - s[0]) < range && abs(f[1] - s[1]) < range && abs(f[2] - s[2]) < range;
		}

		function convertPixel(rgb) {
			let nearIndex;
			let nearD = Infinity;
			for(let i = 0; i !== COLORS.length; i++) {
				const p = COLORS[i];
				if(same(p, rgb)){
					return p;
				}

				const d = abs(p[0]-rgb[0]) + abs(p[1]-rgb[1]) + abs(p[2]-rgb[2]);
				if(d < nearD){
					nearD = d;
					nearIndex = i;
				}
			}
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

		function getErorrsCount(tmp, targets) {
			let errors = 0;
			targets.forEach(target => {
				const tmpPixel = tmp.get(target[0], target[1]);
				if (tmpPixel[3] < 128) {
					return;
				}

				if(!same(tmpPixel, getCanvasApi().getPixel(
					tmp.x1 + target[0], tmp.y1 + target[1]))) {
					errors++;
				}
			});

			return errors;		
		}

		let works = false;
		async function cycle() {
			if (!works) return nextCycle(250);
			if (!getCanvasApi().canPlace) return nextCycle(3e3 + rand(0, 4e3), 'timer isnt zero');

			for(tmp of templates) {
				const targets = await loadTargets(tmp);
				console.log(`[BOT] check ${tmp.x1}_${tmp.y1} "${tmp.name}"`);

				for (let i = 0; i !== targets.length; i++) {
					const target = targets[i];
					const globalTargetX = target[0] + tmp.x1;
					const globalTargetY = target[1] + tmp.y1;
					const canvasPixel = getCanvasApi().getPixel(globalTargetX, globalTargetY);
					const rgb = tmp.get(target[0], target[1]);

					if (same(rgb, canvasPixel)) {
						continue;
					}

					console.log(`[BOT] move to ${globalTargetX}_${globalTargetY}`);
					console.log(`[BOT] choose [${rgb}]`);
					console.log(`[BOT] click`);
					await getCanvasApi().place(globalTargetX, globalTargetY, rgb);
					// await getCanvasApi().selectPixel(globalTargetX, globalTargetY);
					// getCanvasApi().chooseColor(rgb);

					showLastPxl(`${globalTargetX}_${globalTargetY} [${rgb.join('_')}]`);
					showErrorsCount(getErorrsCount(tmp, targets));
					return nextCycle(9e3 + rand(0, 2e3), '');
					// return nextCycle(5*60e3 + rand(2e3, 4e3), '');
				}
			}

			return nextCycle(5e3 + rand(0, 5e3), 'all is ready');
		}

		let panel = factory({
			type: 'div',
			style: 'display: none; position: absolute; top: 40%; right: 0; background-color: rgba(0,0,0,0.9); z-index:9999; transform:translate(-50%,0); color: white; padding: 5px;'
		});

		let showBotButton = createPanelButton(
			'https://raw.githubusercontent.com/EndlessNightNLR/endlessnightnlr.github.io/master/MLPP/rplace/bot_icon.png');
		minimap.panel.add(showBotButton);
		showBotButton.addEventListener('click', () => {
			if(panel.style.display === 'none'){
				panel.style.display = 'block';
			} else {
				panel.style.display = 'none';
			}
		});

		document.body.appendChild(panel);

		let strategy = uo.getOrDefault('botStrategy','rand');

		// panel.appendChild(factory({
		// 	type: 'div',
		// 	style: 'font-weight: bold;',
		// 	text: 'Бот строит только Дерпи!\nThe bot builds only Derpy!'
		// }));

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

		//TARGETS COUNT
		panel.appendChild(factory({
			type: 'div'
		},[
			factory({
				type: 'span',
				text: 'current faction:'
			}),
			factory({
				type: 'select',
				style: 'background: transparent; color: white; padding: 0px;',
				listeners: {
					change () {
						currentFaction = this.value;
						console.log(`[BOT] faction ${this.options[this.selectedIndex].value}`)
						updateTemplateList();
					}
				}
			}, Object.keys(factions).map(name => {
					return factory({
						type: 'option',
						text: name,
						attributes: {
							value: name
						}
					})
				})
			)
		]));

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

		// DOWNLOAD ERORRS BUTTON
		let errosBtn = factory({
			type: 'button',
			style: 'cursor:pointer;',
			text: 'load errors',
			listeners: {
				async click () {
					const template = templates[0];
					const targets = await loadTargets(template);

					const ctx = document.createElement('canvas').getContext('2d');
					ctx.canvas.width = template.width;
					ctx.canvas.height = template.height;
					ctx.drawImage(template.canvas, 0, 0);

					const gData = getCanvasApi().getArea(
						template.x1, template.y1, template.x2, template.y2);

					const id = ctx.getImageData(0, 0, template.width, template.height);
					const { data } = id;

					const { width } = template;
					targets.forEach(([x, y]) => {
						const i = x + y * width << 2;
						const tmpColor = template.get(x, y)
						if (same(gData.slice(i, i | 3), tmpColor)) {
							data[i | 0] = data[i | 1] = data[i | 2] = (
								tmpColor[0] + tmpColor[1] + tmpColor[2]) / 3;
						} else {
							data[i | 0] = 255;
							data[i | 1] = data[i | 2] = 0;
						}
					});

					ctx.putImageData(id, 0, 0);
					functions.downloadCanvas(ctx.canvas);
				}
			}
		});
		panel.appendChild(errosBtn);

		nextCycle(0, 'first run');

		function setStatus(text){
			statusDisplay.innerText = text;
		}

		function showErrorsCount(text){
			targetsCount.innerText = text;
		}

		function showLastPxl(text){
			lastPxlDisplay.innerText = text;
		}

		function showTimer(time){
			time = Math.round(timer*10)/10;
			timerContent.innerText = time;
		}
	}
}

(() => {
	let code = document.createElement('script');
	code.innerHTML = '('+initCode.toString()+')()';
	document.body.appendChild(code);
})();
