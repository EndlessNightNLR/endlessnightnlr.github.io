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
    function module({
        minimap,
        settings,
        mouse,
        palette,
        templates,
        secretTemplates,
        functions,
        Template,
        uo
    }){
        let ws = null;

        let overrideInterval = setInterval(() => {
            if(window.updateChannel) {
                clearInterval(overrideInterval);
                overrideUpdateChannel();
            };
        }, 50);
        function overrideUpdateChannel(){
            const {updateChannel} = window;

            //ПОДМЕНА DISPATCH
            updateChannel._dispatch = updateChannel.dispatch;
            updateChannel.dispatch = function({t,v}){
                console.log(arguments[0]);
                if(t === 12 && v[0] && v[0].t === 2 && v[0].v.wait){
                    timer = v[0].v.wait / 1e3;
                    console.warn('timer '+timer);
                };
                return this._dispatch(...arguments);
            };

            //ПОДМЕНА ВЕБСОКЕТА
            const origWebsocket = WebSocket;
            window.WebSocket = function(){
                ws = new origWebsocket(...arguments);
                console.warn('ws catched');
                return ws;
            };

            updateChannel.ws.close();
        };

        const templateSrc = 'https://raw.githubusercontent.com/EndlessNightNLR/endlessnightnlr.github.io/master/MLPP/pb/PBTest.png';
        const tmp = new Template({
            x: 0,
            y: 0,
            width: 1590,
            height: 400,
            name: 'botTemp',
            src: templateSrc
        });

        const {factory,rand} = functions;

        let panel = factory({
            type: 'div',
            style: 'position: absolute; top:0; background-color: rgba(0,0,0,0.9); z-index:1000; left:50%; transform:translate(-50%,0); color: white; padding: 5px;'
        });
        document.body.appendChild(panel);

        let strategy = uo.getOrDefault('botStrategy','rand');

        //TIMER
        let timer = 0;
        setInterval(() => {
            timer--;
            if(timer < 0)
                timer = 0;
/*
            let uitime = getTimerFromUI();
            if(!uitime)
                timer = uitime;
*/
            showTimer(timer);
        }, 1e3);
        let timerContainer;
        let timerContent;
        timerContainer = factory({
            type: 'div',
            text: 'timer: '
        }, [
            timerContent = factory({
                type: 'span',
                text: 'null'
            })
        ]);
        panel.appendChild(timerContainer);

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

        //STRATEGY
        let strategyContainer;
        let strategyContainerDesc;
        strategyContainerDesc = factory({
            type: 'div',
            text: 'mode: '
        }, [
            strategyContainer = factory({
                type: 'select'
            })
        ]);
        const addStrategy = value => {
            let option = document.createElement('option');
            option.value = option.innerText = value;
            strategyContainer.appendChild(option);
        };
        panel.appendChild(strategyContainerDesc);

        addStrategy('rand');
        addStrategy('line');
        //addStrategy('server');

        strategyContainer.addEventListener('change', e => {
            strategy = e.target.value;
            uo.set('botStrategy', strategy);
        });
        strategyContainer.childNodes.forEach(node => node.value === strategy && node.setAttribute('selected',''));

        panel.appendChild(factory({type:'hr'}));

        //REMOTE BOT
        let remoteBotDesc = factory({
            type: 'div'
        }, [
            factory({
                type: 'div',
                text: 'Удаленный бот'
            }),
            factory({
                type: 'span',
                text: 'On',
                style: 'color: green; background-color: rgba(0,0,0,0); font-weight: bold; cursor: pointer;',
                listeners: {
                    click: () => {
                        fetch('https://mlpp.itpony.ru/botEnable?userData=' + encodeURIComponent(location.search.substring(1).split('#')[0]) + '&enable=true')
                        .finally(window.close);
                    }
                }
            }),
            document.createTextNode(' | '),
            factory({
                type: 'span',
                text: 'Off',
                style: 'color: red; background-color: rgba(0,0,0,0); font-weight: bold; cursor: pointer;',
                listeners: {
                    click: () => {
                        fetch('https://mlpp.itpony.ru/botEnable?userData=' + encodeURIComponent(location.search.substring(1).split('#')[0]) + '&enable=false')
                    }
                }
            })
        ]);
        panel.appendChild(remoteBotDesc);

        //BOT THINGS
        let works = false;

        (async function cycle(){
            if(works) {
                await work();
            };
            setTimeout(cycle, 100);
        })();

        setInterval(() => {
            tmp.reload().then(() => console.log('bot tmp updated'));
        }, 60e3);

        async function work(){
            if(tmp.status === 0) return tmp.load().then(() => console.log('bot tmp loaded'));
            if(tmp.status === 1) return;
            if(timer !== 0) return;
            
            let target;
            let errors;

            switch(strategy){
                case 'rand':
                    let targets = getTargets(tmp);
                    if(targets.length){
                        errors = targets.length;
                        target = targets[rand(0, targets.length-1)];
                        showErrorsCount(targets.length-1);
                    } else {
                        errors = 0;
                        showErrorsCount(errors);
                    };
                    break;
                case 'line':
                    target = getTargetLine(tmp);
                    if(target){
                        errors = getErrorsCount(tmp)-1
                        showErrorsCount(errors);
                    } else {
                        errors = 0;
                        showErrorsCount(0);
                    };
                    break;
            };

            if(!target || errors < 5){
                showErrorsCount(rand(0,10));
                let x = rand(0,1590);
                let y = rand(0,400);
                let clr = palette.RGBToId(updateChannel.context.getImageData(x, y, 1, 1).data);
                target = [x,y,clr];
            } else {
                console.warn(`send pxl ${target[0]} ${target[1]} [${palette.IdToRGB(target[2])}]`);
                showLastPxl(`${target[0]} ${target[1]} [${palette.IdToRGB(target[2])}]`);
            };

            if(!target){
                setStatus('no targets');
                return;
            } else {
                setStatus('on');
            };
            
            timer = 65;
            sendPixel(...target);
        };

        function getTargetLine(tmp){
            let {data} = tmp;
            let canvasData = updateChannel.context.getImageData(tmp.x1, tmp.y1, tmp.x2, tmp.y2).data;

            let x,y,i=0,tmpPxl;

            for(y = tmp.y1; y !== tmp.y2; y++){
                for(x = tmp.x1; x !== tmp.x2; x++, i+=4){
                    if(!data[i+3]) continue;
                    tmpPxl = [data[i],data[i+1],data[i+2]];
                    if(!palette.same(
                        [canvasData[i],canvasData[i+1],canvasData[i+2]],
                        tmpPxl
                    )) return [x,y,palette.RGBToId(tmpPxl)];
                };
            };
            return void 0;
        };

        function getErrorsCount(tmp){
            let {data} = tmp;
            let canvasData = updateChannel.context.getImageData(tmp.x1, tmp.y1, tmp.x2, tmp.y2).data;

            let errors = 0;

            for(let i = 0; i !== data.length; i+=4){
                if(!data[i+3]) continue;
                if(!palette.same(
                    [canvasData[i],canvasData[i+1],canvasData[i+2]],
                    [data[i],data[i+1],data[i+2]]
                )) errors++;
            };

            return errors;
        };

        function getTargets(tmp){
            let {data} = tmp;
            let canvasData = updateChannel.context.getImageData(tmp.x1, tmp.y1, tmp.x2, tmp.y2).data;

            let targets = [];

            let x,y,i=0,tmpPxl;
            for(y = tmp.y1; y !== tmp.y2; y++){
                for(x = tmp.x1; x !== tmp.x2; x++, i+=4){
                    if(!data[i+3]) continue;
                    tmpPxl = [data[i],data[i+1],data[i+2]];
                    if(!palette.same(
                        [canvasData[i],canvasData[i+1],canvasData[i+2]],
                        tmpPxl
                    )) targets.push([x,y,palette.RGBToId(tmpPxl)]);
                };
            };

            return targets;
        };

        async function getPixelFromServer(){
            return new Promise((resolve,reject) => {
                fetch('https://mlpp.itpony.ru/getPixel')
                let targets = getTargets(tmp);
                if(targets.length){
                    target = targets[rand(0, targets.length-1)];
                };
            });
        };

        function setStatus(text){
            statusDisplay.innerText = text;
        };

        function showErrorsCount(text){
            targetsCount.innerText = text;
        };

        function pack (colorId, flag, x, y) {
            const MAX_COLOR_ID = 25;
            const MAX_WIDTH = 1590;
            const MAX_HEIGHT = 400;
            const SIZE = MAX_WIDTH * MAX_HEIGHT;

            const b = parseInt(colorId, 10) + parseInt(flag, 10) * MAX_COLOR_ID;
            return parseInt(x, 10) + parseInt(y, 10) * MAX_WIDTH + SIZE * b;
        };

        async function sendPixel(x, y, colorId, flag = 0){
            const c = new ArrayBuffer(4)
            new Int32Array(c, 0, 1)[0] = pack(colorId, flag, x, y)
            ws.send(c);
        };

        function getTimerFromUI(){
            const UITimer = document.querySelector('.ColorPalette__confirm');
            if(!UITimer || !UITimer.childNodes[0]) return null;
            let [min,sec] = UITimer.childNodes[0].innerText.match(/-?\d+/g).map(e => +e);
            return min*60 + sec;
        };

        function getUserId(){
            return +location.search.substring(1).split('&').find(e => e.startsWith('vk_user_id')).split('=')[1];
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

let code = document.createElement('script');
code.innerHTML = '('+initCode.toString()+')()';
document.body.appendChild(code);