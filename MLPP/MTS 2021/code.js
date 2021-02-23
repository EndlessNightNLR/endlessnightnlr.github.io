(() => {
//START MAIN MAP CODE
function initNLRM() {
(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
'use strict';

/*const {isFrame} = require('./utils/functions')

//СОЗДАЕМ ОКНО И ОСТАНАВЛИВАЕМСЯ ЕСЛИ ФРЕЙМ
if(isFrame()){
    alert(location.href)
    return window.open(location.href);
};*/

//КЛЮЧЕВАЯ ТОЧКА
const {
    CHUNK_SIZE,
    COLORS
} = require('./resources/canvas.json');
const SELECTORS = require('./resources/selectors.json');

//MODULES
const UO = require('./utils/UserOptions');
const Template = require('./utils/Template');
const TemplatesInterface = require('./utils/TemplatesInterface');
const Palette = require('./utils/Palette');
const Chunk = require('./utils/Chunk');
const WSTemplate = require('./utils/WSTemplate');
const Plugins = require('./utils/Plugins');
const BigMessage = require('./utils/BigMessage');

//FUNCTIONS
const {
    between,
    abs,
    antialiasing,
    objForEach,
    injectCSS,
    trySendNotification,
    factory,
    switcherText,
    downloadCanvas,
    createPanelButton,
    $
} = require('./utils/functions');

//CONSTANTS
const {
    VERSION,
    CURSOR_COLORS,
    DEFAULT_PLUGINS,
    BASIC_MODE
} = require('./mapConfig.json');
const {
	FACTIONS_SRC,
	PLUGINS_SRC,
	CODE_INJECTION_SRC,
	GEAR_ICON_SRC
} = require('./resources/links.json');
const {
    MAP_MIN_WIDTH,
    MAP_MAX_WIDTH,
    MAP_MIN_HEIGHT,
    MAP_MAX_HEIGHT,
} = require('./resources/constants.json');

//STYLE
injectCSS(require('./resources/style'));

//USER OPTIONS
let uo = new UO({
	localStorageSave: !BASIC_MODE
});
uo.load();

//ИЗМЕНЕНИЕ ПРОТОТИПОВ
//БЛОКИРОВКА ЗВУКА
OscillatorNode.prototype._start = OscillatorNode.prototype.start;
OscillatorNode.prototype.start = function(){
    if(!uo.get('autoSelect'))
        return OscillatorNode.prototype._start.apply(this,arguments);
};
OscillatorNode.prototype._stop = OscillatorNode.prototype.stop;
OscillatorNode.prototype.stop = function(){
    if(!uo.get('autoSelect'))
        return OscillatorNode.prototype._stop.apply(this,arguments);
};

let themes = new function(){
    this.dynamicStyleElement = factory({type:'style'});
    document.head.appendChild(this.dynamicStyleElement);

    this.themes = {
        default : {
            html : `
            .sub-settings-icon{
                cursor:pointer;
                color:grey;
                padding-right:5px;
                margin:4px;
                border-right: 2px solid rgb(60,60,60);
                width:50px;
                height:50px;
            }
            .sub-settings-icon:hover{
                color:white;
            }`
        },
        dark : {
            html : `
            .sub-settings-icon{
                cursor:pointer;
                color:grey;
                padding-right:5px;
                padding:4px;
                border-right: 2px solid rgb(60,60,60);
                width:50px;
                height:50px;
            }
            .sub-settings-icon:hover{
                color:white;
            }`
        }
    };

    this.getTheme = () => this.theme;
    this.setTheme = theme => {
        if(theme in this.themes){
            uo.set('theme', this.theme = theme);
            objForEach(this.themes[theme], (value,name) => this[name] = value);
        } else {
            console.warn(`Theme "${theme}" isn't defined`);
        };
    };
};
themes.setTheme(uo.get('theme') || 'default');

let localization = new function(){
    this.getLanguage = () => this.language;
    this.setLanguage = function(language){
        if(language in this.languages){
            this.language = language;
        } else {
            console.warn(`Localization for this language does not exist/nSetted default (en)`);
            this.language = 'en';
        };
        this.title   = this.languages[this.language].title;
        this.options = this.languages[this.language].options;
        this.display = this.languages[this.language].display;
        this.footer  = this.languages[this.language].footer;
        this.optionsTitles = this.languages[this.language].optionsTitles;
        this.notifications = this.languages[this.language].notifications;
        return this.language;
    };
    this.languages = require('./resources/i18n');
};
localization.setLanguage(
    uo.get('language') ||
    (window.navigator.language || window.navigator.systemLanguage || window.navigator.userLanguage).substr(0, 2).toLowerCase()
);

let templates = new TemplatesInterface();
let sectors = new TemplatesInterface();

let reg = new RegExp(/-?\d+/g),
    coorDOM = document.querySelector(SELECTORS.coords),
    sliderDot = document.querySelector(SELECTORS.sliderDot),
    canvas = document.querySelector('canvas'),
    sensitivityX = null,
    sensitivityY = null,
    mobile    = /Android|webOS|iPhone|iPad|iPod|BlackBerry|BB|PlayBook|IEMobile|Windows Phone|Kindle|Silk|Opera Mini/i.test(navigator.userAgent),
    pxlSize   = getZoom(),

    factions = {
        'New Lunar Republic': {
            data:   'https://raw.githubusercontent.com/EndlessNightNLR/endlessnightnlr.github.io/master/NLR/PixelPlanet/templates.json',
            images: 'https://raw.githubusercontent.com/EndlessNightNLR/endlessnightnlr.github.io/master/images/',
            color: 'aqua',
            type: 2,
            chunks : false
        }
    },

    faction = 'New Lunar Republic',

    mouse = {
        worldX: getCoords()[0],
        worldY: getCoords()[1],
        clientX: null,
        clientY: null
    },

    //toggle options
    minimapShowed = true,

    //БЛОКИРОВКА ОТВЕТА КОДА НА НАЖАТИЕ ГОРЯЧИХ КЛАВИШ
    blockHotKeys = false,

    zooming_in  = false,
    zooming_out = false,
    zoomTime    = 25,

    //templates which are needed in the current area
    templatesInRange = [],
    sectorsInRange   = [],

    //Buffer for detector
    detBuff = new function(){
        this.canvas = document.createElement('canvas');
        this.ctx    = this.canvas.getContext('2d');
    },

    canDraw = true;

//INIT SETTINGS
let cursorColor = uo.getOrDefault('cursorColor','springGreen');
let selectedColor = uo.getOrDefault('selectedColor', document.querySelector('.ui_pixels__colors.active').querySelector('img').parentNode.style.background.match(reg).map(x=>+x));
let debug = uo.getOrDefault('debug',false);
let grid = uo.getOrDefault('grid',false);
let sync = uo.getOrDefault('sync',true);
let showSectors = uo.getOrDefault('sectors',false);
let autoSelect = uo.getOrDefault('autoSelect',false);
let phantomPxls = uo.getOrDefault('phantomPxls',false);
let buffNote = uo.getOrDefault('buffNote',true);
let detector = uo.getOrDefault('detector',false);
let minimapWidth = uo.getOrDefault('minimapWidth',25); //IN PERCENT
let minimapHeight = uo.getOrDefault('minimapHeight',33);
let sectorsOpacity = uo.getOrDefault('sectorsOpacity',0.3);
let backgroundOpacity = uo.getOrDefault('backgroundOpacity',0.9);
let language = uo.getOrDefault('language','en');
let zoomlevel = uo.getOrDefault('zoomlevel',5);
let activePlugins = uo.getOrDefault('activePlugins', DEFAULT_PLUGINS);
//>---------------------------------------------------

//PALETTE
let palette = new Palette();
palette.setColors(COLORS);
palette.bindColorsWithElements(document.querySelector(SELECTORS.paletteBox).childNodes);
palette.onColorSelect = ({id,rgb}) => uo.set('selectedColor', selectedColor = [...rgb]);
/*
{
    let fixedElems = [];
	for(let e of palette.elems)
		if(e.style.backgroundColor) {
			fixedElems.push(e);
			palette.colors.push(e.style.backgroundColor.match(/-?\d+/g).map(x=>+x));
		};
		console.log('Palette');
        console.log(JSON.stringify(palette.colors));
    fixedElems.unshift(0); palette.colors.unshift(0);
    fixedElems.unshift(0); palette.colors.unshift(0);
	palette.elems = fixedElems;
};
*/
//>----------------------------------------

//WHEEL EVENTS
if(!mobile){
    if (canvas.addEventListener) canvas.addEventListener('mousewheel', wheel, false);
    else if (canvas.attachEvent) canvas.attachEvent('onmousewheel', wheel);

    if (/Firefox/i.test(navigator.userAgent))
        try {canvas.addEventListener('DOMMouseScroll', wheel)} catch(e) {};
};
//>---------------------------------------------------------

console.log(`MINIMAP VERSION : ${VERSION}`)

if(!BASIC_MODE){
    //ВЫБОР ПОСЛЕДНЕГО ВЫБРАННОГО ЦВЕТА
    for(let i=0; i!==palette.elems.length; i++){
        if(palette.same(selectedColor, palette.elems[i].style.backgroundColor.match(reg).map(x=>+x))){
            palette.elems[i].click();
            break;
        };
    };
};

class minimapCanvasInterface{
    constructor(canvas){
        this.canvas = canvas;
        this.ctx = this.canvas.getContext('2d');
    }

    clear(){
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    draw(tmps, z = sync ? pxlSize : zoomlevel) {
        this.clear();
        tmps.forEach(tmp => {
            this.ctx.drawImage(
                tmp.canvas,
                MP.xLeft - tmp.x1,
                MP.yTop  - tmp.y1,
                MP.width,
                MP.height,
                -MP.pxlsOutHorizontal,
                -MP.pxlsOutVertical,
                MP.width  * z,
                MP.height * z
            );
        });
    };

    setOpacity(opacity){
        this.canvas.style.opacity = opacity;
    }
};

//MINIMAP
const minimap = new function(){
    let that = this;
    this.window = factory({
        type: 'div',
        class: 'NLRGeneral',
        style: `
            color:rgb(250,250,250);
            border-radius:1px;
            position:absolute;
            right:0;
            top:0;
            user-select: text;
        `,
        html: `
            <div id="text"></div>
            <div id="box">
                <canvas></canvas>
                <canvas></canvas>
                <canvas></canvas>
            </div>
            <div id="sub-map-panel">
            </div>
            <center id="config">
                <span id="hide-map" class="text-button" style="font-weight:bold; color:red;">OFF</span> | Zoom:
                <svg id="zoom-plus" class="text-button" height="14.5" width="9" xmlns="http://www.w3.org/2000/svg" stroke-width="2">
                    <path d="M 1 9 L 9 9 M 5 4 L 5 13" fill="transparent" stroke="rgb(0,100,250)"></path>
                </svg>
                /
                <svg id="zoom-minus"  class="text-button" height="14.5" width="7" xmlns="http://www.w3.org/2000/svg" stroke-width="2">
                    <path d="M 0 9 L 7 9" fill="transparent" stroke="rgb(0,50,250)"></path>
                </svg>
            </center>
        `
    });
    document.body.appendChild(this.window);

    this.panel = {
        container: $('sub-map-panel'),
        add(element){
            this.container.appendChild(element);
        }
    };

    this.settingsButton = createPanelButton(GEAR_ICON_SRC);
    if(!BASIC_MODE){
        this.panel.add(this.settingsButton);
    };

    this.settingsButton.addEventListener('click', () => {
        if(settings.window.style.display === 'none'){
            settings.window.style.display = 'block';
            settings.activateTab('settings');
        } else {
            if(settings.activeTab === 'settings')
                settings.window.style.display = 'none';
            else
                settings.activateTab('settings');
        };
    });

    this.box = $('box');
    this.text = $('text');
    this.config = $('config');

    this.canvases = this.window.getElementsByTagName('canvas');

    Object.defineProperty(this, 'width', {
        get() {
            return this.canvases[0].width;
        }
    });
    Object.defineProperty(this, 'height', {
        get() {
            return this.canvases[0].height;
        }
    });

    this.interfaces = {
        tmps: new minimapCanvasInterface(this.canvases[0]),
        sectors: new minimapCanvasInterface(this.canvases[1]),
        cover: new minimapCanvasInterface(this.canvases[2])
    };
    //ПРАВКИ, ИНТЕРФЕЙС НЕ УДОВЛЕТВОРЯЕТ ДОП. ФУНКЦИЯМ
    this.interfaces.cover.draw = function(z = sync ? pxlSize : zoomlevel){
        MP.updateSizes();
        this.clear();
        if (z <= 2) return;
        if (grid && z > 4.6) {
            this.ctx.beginPath();
            this.ctx.strokeStyle = 'rgb(20,20,20)';

            this.ctx.lineWidth = 1;
            for (let x = z-MP.pxlsOutHorizontal; x <= this.canvas.width; x += z) {
                this.ctx.moveTo(x, 0);
                this.ctx.lineTo(x, this.canvas.height);
            };
            for (let y = z-MP.pxlsOutVertical; y <= this.canvas.height; y += z) {
                this.ctx.moveTo(0, y);
                this.ctx.lineTo(this.canvas.width, y);
            };
            this.ctx.stroke();
        };
        this.ctx.beginPath();
        this.ctx.lineWidth = z / 3;
        this.ctx.strokeStyle = cursorColor;
        this.ctx.rect(
            (minimap.width -z)/2,
            (minimap.height-z)/2,
            z,
            z
        );
        this.ctx.stroke();
    };
    this.interfaces.tmps.drawErrors = function(z = sync ? pxlSize : zoomlevel){
        let imageData,data;

        detBuff.canvas.width  = MP.width;
        detBuff.canvas.height = MP.height;
        if (templatesInRange.length === 1) {
            let t = templatesInRange[0];
            imageData = t.ctx.getImageData(
                MP.xLeft - t.x1,
                MP.yTop  - t.y1,
                MP.width,
                MP.height,
                0,
                0,
                MP.width,
                MP.height
            );
        } else {
            for (let tmp of templatesInRange)
                detBuff.ctx.drawImage(
                    tmp.canvas,
                    MP.xLeft - tmp.x1,
                    MP.yTop  - tmp.y1,
                    MP.width,
                    MP.height,
                    0,
                    0,
                    MP.width,
                    MP.height
                );

            imageData = detBuff.ctx.getImageData(
                0,
                0,
                detBuff.canvas.width,
                detBuff.canvas.height
            );
        };
        data = imageData.data;

        let chPxl;
        let x, y, i = 0;
        let yEnd = MP.height + MP.yTop;
        let xEnd = MP.width + MP.xLeft;

        let canvasData = window.updateChannel.context.getImageData(MP.xLeft, MP.yTop, MP.width, MP.height).data;
        function getPixel(c){
            return [canvasData[c],canvasData[c+1],canvasData[c+2],canvasData[c+3]];
        };

        if(MP.yTop > yEnd || MP.xLeft > xEnd) throw new Error(`[Detector] wrong sizes`);
        for(y = 0; y !== MP.height; y++){
            for(x = 0; x !== MP.width; x++,i+=4){
                chPxl = getPixel(i);
                if(data[i+3] === 0) continue;
                if(palette.same(chPxl,[data[i],data[i+1],data[i+2]])) {
                    data[i] = data[i+1] = data[i+2] = (data[i] + data[i+1] + data[i+2]) / 3;
                } else {
                    data[i] = 255;
                    data[i+1] = data[i+2] = 0;
                };
            };
        };

        if (z === 1) {
            this.ctx.putImageData(imageData,0,0);
        } else {
            detBuff.ctx.putImageData(imageData, 0, 0);
            this.clear();
            this.ctx.drawImage(
                detBuff.canvas,
                -MP.pxlsOutHorizontal,
                -MP.pxlsOutVertical,
                MP.width  * z,
                MP.height * z
            );
        };
    };

    this.setOpacity = function(opacity){
        this.box.style.backgroundColor = `rgba(0,0,0,${opacity})`;
    };
    this.setWidth = function(width){
        this.window.style.width = width;
    };
    this.setHeight = function(height){
        this.window.style.height = height;
    };

    this.onNoTmps = function(){
        minimapShowed = false;
        this.setWidth(minimapWidth +'%');
        this.setHeight('28px');
        this.box.style.display  = 'none';

        this.text.style.display = 'block';
        this.text.style.cursor = 'normal';
        //this.text.innerText = 'There\'s nothing here';
        this.text.innerText = 'Bot lives matter';
    };

    this.onTmpsExist = function(){
        minimapShowed = true;
        this.setWidth(minimapWidth +'%');
        this.setHeight(minimapHeight+'%');
        this.box.style.display  = 'block';
        this.text.style.display = 'none';
    };

    this.open = function(){
        uo.set('mapClosed', false);
        this.setWidth(minimapWidth +'%');
        this.setHeight(minimapHeight+'%');

        this.box.style.display = "block";
        this.config.style.display = "block";
        this.text.style.display = "none";

        this.panel.container.style.display = 'block';

        onresize();
    };
    this.close = function(){
        uo.set('mapClosed', true);
        this.setWidth('auto');
        this.setHeight('28px');

        this.box.style.display = "none";
        this.config.style.display = "none";
        this.text.style.display = "block";

        this.text.innerText = "Minimap";
        this.text.style.cursor = 'pointer';

        this.panel.container.style.display = 'none';

        onresize();
    };
};
//>-----------------------------------------------------

//ПРОВЕРКА НА ЕДИНСТВЕННЫЙ СКРИПТ
setTimeout(() => {
    if ($('minimap')) {
        alert('Включено два или более скриптов с миникартой. Пожалуйста, отключите все остальные скрипты, оставив только этот, для корректной работы кода.\n\rTwo or more minimap scripts included. Please disable all other scripts, leaving only this one for the code to work correctly.');
        return;
    };
}, 2000);
//>-----------------------------------------------------

//MINIMAP PROTOTYPE
let MP = {
    updateSizes: function(z = sync ? pxlSize : zoomlevel) {
        this.width  = (~~(minimap.width /z))|1;
        this.height = (~~(minimap.height/z))|1;

        this.pxlsOutHorizontal = z - (minimap.width -this.width *z)/2;
        this.pxlsOutVertical   = z - (minimap.height-this.height*z)/2;

        //this.xLeft = ~~(mouse.worldX-(minimap.width /z/2));
        //this.yTop  = ~~(mouse.worldY-(minimap.height/z/2));
        this.xLeft = mouse.worldX - (this.width  + 1) / 2;
        this.yTop  = mouse.worldY - (this.height + 1) / 2;

        this.width  += 2;
        this.height += 2;
        sensitivityX = this.width  >>> 1;
        sensitivityY = this.height >>> 1;
    }
};
//>-----------------------------------------------------

fetch(CODE_INJECTION_SRC)
.then(res => res.ok ? res.text() : new Error(''))
.then(code => {
    document.head.appendChild(factory({
        type: 'script',
        html: code
    }))
})
.catch(() => 0);

fetch(encodeURI(FACTIONS_SRC))
.then(res => res.json())
.then(json => {
    factions = json;
    console.log('Loaded factions', factions);
/*
    if(!BASIC_MODE && localStorage.injection){//ДОБАВЛЕНИЕ НОВЫХ
        try{
        	const injection = JSON.parse(localStorage.injection);
            Object.assign(factions, injection);
            console.log('Injection ', injection);
        } catch(e){
            alert('Ошибка при парсинге инжектированных фракций \n' + e);
        };
    };
*/
    objForEach(json, faction => faction.chunks = 'chunks' in faction && faction.chunks == 'true');

    faction = factions[uo.get('faction')] ? uo.get('faction') : Object.keys(factions)[0];

    loadFactions();

    objForEach(factions, (f,name) => {
        settings.addFaction(
            name,
            f.color,
            function() {
                settings.factions[faction].style.fontWeight = `normal`;
                this.style.fontWeight = `bold`;
                uo.set('faction', faction = name);
                loadFactions();
            }
        );
    });

    settings.factions[faction].style.fontWeight = `bold`;
})
.catch(console.error);

//EVENTS
$("hide-map").onclick = () => minimap.close();

minimap.text.onclick = () => {
    if(uo.get('mapClosed')) minimap.open();
    defineAndDrawTemplates();
};

$("zoom-plus").addEventListener(mobile ? 'touchstart' : 'mousedown', e => {
    e.preventDefault();
    zooming_in  = true;
    zooming_out = false;
    zoomIn();
}, false);

$("zoom-plus").addEventListener(mobile  ? 'touchend' : 'mouseup', () => {
    zooming_in = false;
    uo.set('zoomlevel',zoomlevel);
    return false;
});

$("zoom-minus").addEventListener(mobile ? 'touchstart' : 'mousedown', e => {
    e.preventDefault();
    zooming_out = true;
    zooming_in  = false;
    zoomOut();
}, false);

$("zoom-minus").addEventListener(mobile ? 'touchend' : 'mouseup', () => {
    zooming_out = false;
    uo.set('zoomlevel',zoomlevel);
    return false;
});
//>-------------------------------------------------

if (mobile) {
    //injectCSS('#config{font-size: 25px;}');
    //minimapConfig.style.lineHeight = '27px';

    //CENTER SELECTOR
    let canvas = factory({
        type: 'canvas',
        class: 'center'
    });
    canvas.width = canvas.height = 15;
    document.body.appendChild(canvas);
    let ctx = canvas.getContext('2d');

    let gameCanvas = document.querySelector(SELECTORS.gameCanvas);
    let gameCtx = gameCanvas.getContext('2d');

    const updateMobileSelector = () => {
        let id = ctx.getImageData(0,0,canvas.width,canvas.height);
        let gid = gameCtx.getImageData(
            canvas.offsetLeft,
            canvas.offsetTop,
            canvas.width,
            canvas.height
        );
        let x,y,c;

        x = canvas.width >>> 1;
        for(y = 0; y !== canvas.height; y++){
            c = x + y * canvas.width << 2;
            id.data[c  ] = 255 - gid.data[c  ];
            id.data[c+1] = 255 - gid.data[c+1];
            id.data[c+2] = 255 - gid.data[c+2];
            id.data[c+3] = 255;
        };

        y = canvas.height >>> 1;
        for(x = 0; x !== canvas.width; x++){
            c = x + y * canvas.width << 2;
            id.data[c  ] = 255 - gid.data[c  ];
            id.data[c+1] = 255 - gid.data[c+1];
            id.data[c+2] = 255 - gid.data[c+2];
            id.data[c+3] = 255;
        };

        ctx.putImageData(id,0,0);
    };
    updateMobileSelector();
    gameCanvas.addEventListener('touchmove', updateMobileSelector);

    let xNew = null,
        yNew = null,
        pxlSizeNew = null,
        needDrawCover;
    setInterval(() => {
        [xNew,yNew] = getCoords();
        pxlSizeNew = getZoom();

        if (mouse.worldX !== xNew || mouse.worldY !== yNew || pxlSizeNew !== pxlSize) {
            needDrawCover = pxlSizeNew !== pxlSize;
            mouse.worldX = xNew;
            mouse.worldY = yNew;
            pxlSize = pxlSizeNew;
            
            if(needDrawCover) minimap.interfaces.cover.draw();
            updateMobileSelector();
            defineAndDrawTemplates();
        };
    }, 100);
} else {
    let xNew,yNew;
    let pxlSizeNew;
    canvas.addEventListener('mousemove', e => {
        [xNew,yNew] = getCoords();

        if (mouse.worldX !== xNew || mouse.worldY !== yNew) {
            mouse.worldX = xNew;
            mouse.worldY = yNew;
            mouse.clientX = e.clientX;
            mouse.clientY = e.clientY;

            if(autoSelect && pxlSize > 4.6){
                let pxl = templates.getPixelFromTemplates(mouse.worldX,mouse.worldY);
                if(
                    pxl && 
                    palette.has(pxl) &&
                    !palette.same(pxl,selectedColor)
                ) palette.select(pxl);
            };

            defineAndDrawTemplates();
        };
    }, false);
};
//>---------------------------------------------------

//UI Settings
let settings = new function(){
    let that = this;
    this.window = factory({
        type: 'div',
        class: 'NLRGeneral center',
        style: `
            z-index:1;
            display:none;
            background-color:rgba(0,0,0,0.9);
            color:rgb(250,250,250);
            line-height:32px;
            border-radius:1px;
            border:2px rgba(50,50,50,0.9) solid;
        `,
        html: 
            `<div class='level' style="border-bottom: 1px rgba(50,50,50,0.9) solid; padding:5px;">`+
                `<span></span>`+
                `<svg class="text-button" style="position:fixed; right:0px; margin:9px;" height="16" width="16" xmlns="http://www.w3.org/2000/svg" stroke-width="1.5">`+
                    `<path d="M 1 1 L 15 15 M 15 1 L 1 15" fill="transparent" stroke="white"></path>`+
                `</svg>`+
            `</div>`+
            `<div class="level" style="line-height:20px; right:0px;">`+
                `<div id="tabs" style="border-bottom: 1px rgba(50,50,50,0.9) solid;">`+
                `</div>`+
                `<div id="content" style="border-bottom: 1px rgba(50,50,50,0.9) solid;">`+
                `</div>`+
            `</div>`+
            `<footer class='level' style = "color:grey; font: menu; font-size:11px; padding:5px;"></footer>`
    });
    document.body.appendChild(this.window);

    let levels = this.window.getElementsByClassName('level');
    this.elements = {
        title: levels[0].getElementsByTagName('span')[0],
        cancel: levels[0].getElementsByTagName('svg')[0],
        footer: levels[2],
        iconsContainer: $('tabs'),
        icons: {},
        tabContent: $('content')
    };
    
    //TABS
    this.activeTab = null;
    this.activateTab = function(targetName){
        this.activeTab = targetName;
        objForEach(this.tabs,(tab,name) => tab.style.display = name === targetName ? 'block' : 'none');
        objForEach(this.elements.icons,(switcher,name) => switcher.style.textWeight = name === targetName ? 'bold' : 'normal');
    };
    this.tabs = {};
    this.addTab = function(name){
        this.tabs[name] = factory({
            type  : 'div',
            style : 'display:none;',
            class : 'sub-settings'
        });
        this.elements.tabContent.appendChild(this.tabs[name]);

        this.elements.icons[name] = factory({
            type: 'span',
            class: 'sub-settings-icon',
            text: name,
            listeners: {click : this.activateTab.bind(this,name)}
        });
        this.elements.iconsContainer.appendChild(this.elements.icons[name]);

        return this.tabs[name];
    };
    this.addTab('factions');
    this.addTab('settings');
    this.addTab('display');

    this.display = { // THIS IS PART OF SETTINGS
        width: {},
        height: {},
        backgroundOpacity: {},
        sectorsOpacity: {}
    };

    this.tabs.display.appendChild(factory({
        type : 'table',
        style: 'line-height: 0px;'
    },[
        factory({type : 'tr'},[
            this.display.width.desc = factory({type : 'td',text : 'Width'}),
            factory({type : 'td'},[
                this.display.width.input = factory({
                    type : 'input',
                    listeners : {
                        input : function(){
                            const newWidth = parseInt(this.value);
                            minimapWidth = isNaN(newWidth) ? MAP_MIN_WIDTH : newWidth > MAP_MAX_WIDTH ? MAP_MAX_WIDTH : newWidth < 1 ? 1 : newWidth;
                            uo.set('minimapWidth', minimapWidth);
                            overrideMinimapDisplay(minimapWidth, minimapHeight);
                            onresize();
                        },
                        focus : () => blockHotKeys = true,
                        blur  : () => blockHotKeys = false
                    },
                    attributes : {
                        maxlength : 3,
                        value : minimapWidth
                    }
                }),
                document.createTextNode(' %')
            ])
        ]),
        factory({type : 'tr',style : 'background-color:rgba(0,0,0,0);'},[
            this.display.height.desc = factory({type : 'td',text : 'Height'}),
            factory({type : 'td'},[
                this.display.height.input = factory({
                    type : 'input',
                    listeners : {
                        input : function(){
                            let newHeight = parseInt(this.value);
                            minimapHeight = isNaN(newHeight) ? MAP_MIN_HEIGHT : newHeight > MAP_MAX_HEIGHT ? MAP_MAX_HEIGHT : newHeight < 1 ? 1 : newHeight;
                            uo.set('minimapHeight', minimapHeight);
                            overrideMinimapDisplay(minimapWidth, minimapHeight);
                            onresize();
                        },
                        focus : () => blockHotKeys = true,
                        blur  : () => blockHotKeys = false
                    },
                    attributes : {
                        maxlength : 3,
                        value : minimapHeight
                    }
                }),
                document.createTextNode(' %')
            ])
        ]),
        factory({type : 'tr',style : 'background-color:rgba(0,0,0,0);'},[
            this.display.sectorsOpacity.desc = factory({type : 'td',text : 'Sectors opacity :'}),
            factory({type : 'td'},[
                this.display.sectorsOpacity.input = factory({
                    type  : 'input',
                    listeners : {
                        input : function(){
                            let newOpacity = parseInt(this.value);
                            if(!isNaN(newOpacity)) {
                                uo.set('sectorsOpacity', sectorsOpacity = newOpacity/100);
                                minimap.interfaces.sectors.setOpacity(sectorsOpacity);
                            };
                            drawAll();
                        },
                        focus : () => blockHotKeys = true,
                        blur  : () => blockHotKeys = false
                    },
                    attributes : {
                        maxlength : 3,
                        value : sectorsOpacity*100
                    }
                }),
                document.createTextNode(' %')
            ])
        ]),
        factory({type : 'tr',style : 'background-color:rgba(0,0,0,0);'},[
            this.display.backgroundOpacity.desc = factory({type : 'td',text : 'Sectors opacity :'}),
            factory({type : 'td'},[
                this.display.backgroundOpacity.input = factory({
                    type  : 'input',
                    listeners : {
                        input : function(){
                            let newOpacity = parseInt(this.value);
                            if(!isNaN(newOpacity)) {
                                uo.set('backgroundOpacity', backgroundOpacity = newOpacity/100);
                                minimap.setOpacity(backgroundOpacity);
                            };
                        },
                        focus : () => blockHotKeys = true,
                        blur  : () => blockHotKeys = false
                    },
                    attributes : {
                        maxlength : 3,
                        value : backgroundOpacity*100
                    }
                }),
                document.createTextNode(' %')
            ])
        ])
    ]));
    /*
        'scrin' : factory({
            type  : 'div',
            style : 'display:none; padding:2px 2px 2px 5px; margin:1px; display:none;',
            class : 'sub-settings'
        },[
            factory({
                type : 'div'
            },[
                document.createTextNode('Coords : '),
                this.scrinshot.input = factory({
                    type  : 'input',
                    style : 'background-color:rgba(0,0,0,0); color:white; margin:inherit;',
                    attributes : {
                        value : 'x1,y1,x2,y2'
                    }
                })
            ]),
            factory({type:'br'}),
            this.scrinshot.button = factory({
                type  : 'button',
                text  : 'start',
                style : 'background-color:rgba(0,0,0,0); color:white; margin:inherit;'
            }),
            factory({type:'br'}),
            this.scrinshot.state = factory({
                type  : 'div',
                style : 'position:relative; width:70px; height:17px; background-color:white; color:black; border:2px solid grey; margin:inherit;'
            },[
                this.scrinshot.indicator = factory({
                    type  : 'span',
                    style : 'position:absolute; width:25%; height:100%; background-color:blue; margin:1px;'
                })
            ])
        ])
    */

    //OPTIONS
    this.options = {};
    this.addOption = function(name,onclick){
        let desc,button;
        let container = factory({
            type  : 'div',
            class : 'settings-option',
            listeners: {onclick}
        },[
            desc   = factory({type: 'span'}),
            button = factory({type: 'span'})
        ]);
        container.desc = desc;
        container.button = button;
        this.tabs.settings.appendChild(container);
        return this.options[name] = container;
    };
    this.addOption('cursorColor', function(){
        let i = CURSOR_COLORS.indexOf(cursorColor) + 1;
        if(i === CURSOR_COLORS.length) i = 0;
        uo.set('cursorColor', 
            this.button.innerText
            = this.button.style.color
            = cursorColor 
            = CURSOR_COLORS[i]
        );
        minimap.interfaces.cover.draw();
    });
    this.addOption('grid', function(){
        this.button.innerText = switcherText(uo.set('grid', grid = !grid));
        minimap.interfaces.cover.draw();
    });
    /*
    this.addOption('theme', () => alert('Will be soon (or no)'));
    this.addOption('sectors', function(){
        this.button.innerText = switcherText(uo.set('sectors', showSectors = !showSectors));
        if(!showSectors) minimap.interfaces.sectors.clear();
        drawAll();
    });
    */
    this.addOption('detector', function(){
        uo.set('detector', detector = !detector);

        this.button.innerText = switcherText(detector);

        defineAndDrawTemplates();
        minimap.interfaces.cover.draw();
    });
    this.addOption('autoSelect', function(){
        this.button.innerText = switcherText(uo.set('autoSelect',autoSelect = !autoSelect))
    });
    /*
    this.addOption('phantomPxls', function(){
        this.button.innerText = switcherText(uo.set('phantomPxls',phantomPxls = !phantomPxls))
    });
    this.addOption('buffNote', function(){
        this.button.innerText = switcherText(uo.set('buffNote',buffNote = !buffNote))
    });
    */
    this.addOption('sync', function(){
        uo.set('sync', sync = !sync);
        this.button.innerText = switcherText(sync);

        defineAndDrawTemplates();
        minimap.interfaces.cover.draw();
    });
    this.addOption('language', () => {
        let languages = Object.keys(localization.languages);
        let i = languages.indexOf(localization.getLanguage()) + 1;
        if(i === languages.length) i = 0;

        uo.set('language', localization.setLanguage(languages[i]));

        this.changeLanguage(localization.getLanguage());
    });

    this.options.cursorColor.button.innerText = cursorColor;
    this.options.cursorColor.button.style.color = cursorColor
    this.options.grid.button.innerText = switcherText(grid);
    //this.options.theme.button.innerText = themes.getTheme();
    //this.options.sectors.button.innerText = switcherText(showSectors);
    this.options.detector.button.innerText = switcherText(detector);
    this.options.autoSelect.button.innerText = switcherText(autoSelect);
    //this.options.phantomPxls.button.innerText = switcherText(phantomPxls);
    //this.options.buffNote.button.innerText = switcherText(buffNote);
    this.options.sync.button.innerText = switcherText(sync);
    this.options.language.button.innerText = localization.getLanguage();

    this.elements.cancel.addEventListener('click', () => settings.window.style.display = 'none');

    this.changeLanguage = function(language){
        localization.setLanguage(language);
        this.options.language.button.innerText = localization.getLanguage();
        this.elements.title.innerHTML = localization.title;
        objForEach(localization.options,(value,name) => {
            this.options[name] && (this.options[name].desc.innerText = value);
        });
        objForEach(localization.display,(value,name) => {
            this.display[name] && (this.display[name].desc.innerText = value);
        });
        this.elements.footer.innerHTML = localization.footer;

        this.updateTitles();
    };
    this.updateTitles = function(){
        objForEach(localization.optionsTitles,(value,name) => {
            this.options[name] && (this.options[name].setAttribute('title',value));
        });
    };

    this.clearFactions = () => {
        this.tabs.factions.innerHTML = '';
        this.factions = {};
    };
    this.factions = {};
    this.addFaction = function(name,color,listener){
    	this.factions[name] = factory({
            type  : 'div',
            class : 'text-button',
            style : `color:${color}; padding-left:5px;`,
            text  : name,
            listeners : {
                click : listener
            }
        })
        this.tabs.factions.appendChild(this.factions[name]);
    };

    this.setTheme = function(theme){
        themes.setTheme(theme);
        //this.options.theme.button.innerText = theme;
        themes.dynamicStyleElement.innerHTML = themes.html;
    };
};

//PLUGINS
let plugins = new Plugins();
settings.addTab('plugins');
settings.tabs.plugins.style.overflowY = 'scroll';
//TODO
settings.tabs.plugins.style.display = 'none';
settings.elements.icons.plugins.style.display = 'none';

plugins.loadData(PLUGINS_SRC)
.then(() => {
    console.log('Plugins loaded', plugins);

    //ADD TO SETTINGS
    let pluginNodes = [];
    objForEach(plugins.plugins, plugin => {
        pluginNodes.push(factory({
            type: 'div',
            class: 'plugin'
        },[
            factory({
                type: 'div',
                style: 'font-size: 15px; font-size: 17px;',
                text: plugin.name
            }),
            factory({
                type: 'div',
                style: 'margin-left: 2.5%; color: grey;'
            }, [
                factory({
                    type: 'div',
                    text: plugin.desc
                }),
                factory({
                    type: 'div'
                }, [
                    document.createTextNode('Included: '),
                    factory({
                        type: 'input',
                        attributes: {
                            type: 'checkbox',
                            checked: activePlugins.includes(plugin.name)
                        },
                        listeners: {
                            onclick: createOnSelectPluginListener(plugin)
                        }
                    })
                ])
            ])
        ]));
        pluginNodes.push(factory({type:'hr'}));

        function createOnSelectPluginListener(plugin){
            return function(){
                if(this.checked){
                    if(!activePlugins.includes(plugin.name))
                        activePlugins.push(plugin.name);
                } else {
                    if(activePlugins.includes(plugin.name))
                        activePlugins.splice(activePlugins.indexOf(plugin.name), 1);
                };
                uo.save();
            };
        };
    });

    //УБИРАЕМ ЛИШНЮЮ HR
    if(pluginNodes.length)
        pluginNodes.pop();

    pluginNodes.forEach(e => settings.tabs.plugins.appendChild(e));

    //LOAD ACTIVATED
    objForEach(plugins.plugins, plugin => {
        //TODO
        //if(!activePlugins.includes(plugin.name)) return;
        console.log(`Load plugin\nname: ${plugin.name}\nsrc: ${plugin.src}`);
        plugin.load();
    });
})
.catch(console.error);
//PLUGINS END

settings.changeLanguage(localization.getLanguage());
settings.activateTab('settings');
settings.setTheme(themes.theme);

//EVENTS
window.addEventListener('resize', onresize);

//KEYBOARD
if (!mobile && !BASIC_MODE) window.addEventListener('keydown', ({keyCode}) => {
    switch (keyCode) {
        case 27: //Esc
            settings.window.style.display = `none`;
            break;
        case 48: //0
            if(blockHotKeys) return;
            uo.set('debug', debug = !debug) ? console.log('Debug is enabled') : console.log('Debug is off');
            break;
        case 49: //1
            if(blockHotKeys) return;
            if(settings.window.style.display === 'none'){
                settings.window.style.display = 'block';
                settings.activateTab('factions');
            } else {
                if(settings.activeTab === 'factions')
                    settings.window.style.display = 'none';
                else
                    settings.activateTab('factions');
            };
            break;
        case 50: //2
            if(blockHotKeys) return;
            if(settings.window.style.display === 'none'){
                settings.window.style.display = 'block';
                settings.activateTab('settings');
            } else {
                if(settings.activeTab === 'settings')
                    settings.window.style.display = 'none';
                else
                    settings.activateTab('settings');
            };
            break;
        case 51: //3
            if(blockHotKeys) return;
            if(settings.window.style.display === 'none'){
                settings.window.style.display = 'block';
                settings.activateTab('display');
            } else {
                if(settings.activeTab === 'display'){
                    settings.window.style.display = 'none';
                } else {
                    settings.activateTab('display');
                };
            };
            break;
        case 52: //4
            if(blockHotKeys) return;
            settings.options.detector.desc.click();
            break;
    };
});
//>---------------------------------------------------

//INIT
minimap.interfaces.sectors.setOpacity(sectorsOpacity);
minimap.setOpacity(backgroundOpacity);
uo.get('mapClosed') ? minimap.close() : minimap.open();

//MODULES
if(window.mapModules && window.mapModules.length){
    for(let i=0; i!==window.mapModules.length; i++){
        initModule(window.mapModules[i]);
        window.mapModules.splice(i,1);
        i--;
    };
};
window.initModule = initModule;
//>----------------------------------------------------

//FUNCTIONS
function loadFactions() {
    return new Promise((resolve, reject) => {
        let url = encodeURI(factions[faction].data);
        console.log(`Updating Template List\nFaction : ${faction}\nURL : ${url}`);

        templates.clear();
        sectors.clear();

        fetch(url)
        .then(data => data.json())
        .then(obj => {
            setFactionData(obj);
            console.log(`Update completed`, templates, sectors);
        })
        .catch(console.error);
    });
};

function setFactionData(data){
    objForEach(data, (opts,name) => {
        opts = Object.assign(opts, {
            name,
            src: encodeURI(factions[faction].images + name + '.png')
        });
        (opts.type === 'sector' ? sectors : templates).add(new Template(opts));
    });
};

function zoomIn() {
    if (!zooming_in) return;

    if (sync) {
        uo.set('sync', sync = false);
        zoomlevel = pxlSize;
        settings.options.sync.button.innerText = switcherText(sync);
    };
    zoomlevel *= 1.1;
    if (zoomlevel > 32) return zoomlevel = 32;

    minimap.interfaces.cover.draw();
    defineAndDrawTemplates();
    setTimeout(zoomIn, zoomTime);
};

function zoomOut() {
    if (!zooming_out) return;

    if (sync) {
        uo.set('sync', sync = false);
        zoomlevel = pxlSize;
        settings.options.sync.button.innerText = switcherText(sync);
    };
    zoomlevel /= 1.1;
    if (zoomlevel < 1) return zoomlevel = 1;

    minimap.interfaces.cover.draw();
    defineAndDrawTemplates();
    setTimeout(zoomOut, zoomTime);
};

function getPreparedTemplatesInRange(templatesInterface){
    let range = templatesInterface.getTemplatesAtZone(
        mouse.worldX - sensitivityX,
        mouse.worldY - sensitivityY,
        mouse.worldX + sensitivityX,
        mouse.worldY + sensitivityY
    );
    range.forEach(tmp => {
        tmp.status === Template.UNLOADED && tmp.load().then(() => {
            console.log(`Template ${tmp.name} loaded`);
            console.dir(tmp);
        })
        .catch(e => {
            console.error('Can\'t load template');
            console.error(e);
        });
    });
    return range.filter(tmp => tmp.status === Template.LOADED);
};

function defineAndDrawTemplates() {
	if(uo.get('mapClosed')) return;

    templatesInRange = getPreparedTemplatesInRange(templates);

    if(showSectors)
        sectorsInRange = getPreparedTemplatesInRange(sectors);
    else
        sectorsInRange = [];

    if (templatesInRange.length || sectorsInRange.length) {
        if(!minimapShowed){
            minimap.onTmpsExist();
        };
        if(canDraw) {
            canDraw = false;
            window.requestAnimationFrame(() => {
                drawAll();
                canDraw = true;
            });
        };
    } else {
        if(minimapShowed){
            minimap.onNoTmps();
        };
    };
};

function drawAll() {
	MP.updateSizes();

    if(detector){
        minimap.interfaces.tmps.drawErrors();
    } else {
        minimap.interfaces.tmps.draw(templatesInRange);
    };

    if(showSectors){
        minimap.interfaces.sectors.draw(sectorsInRange);
    };
};

function overrideMinimapDisplay(width, height){
    if(minimapShowed){
        minimap.setWidth(minimapWidth + '%');
        minimap.setHeight(minimapHeight + '%');
    };
};

function wheel() {
    pxlSize = getZoom();
    minimap.interfaces.cover.draw();
    defineAndDrawTemplates();
};

function onresize(){
    Array.from(minimap.box.childNodes).forEach(e => {
        e.width = e.offsetWidth;
        e.height = e.offsetHeight;
    });
    antialiasing(minimap.interfaces.tmps.ctx, false);
    antialiasing(minimap.interfaces.sectors.ctx, false);
    minimap.interfaces.cover.draw();
    defineAndDrawTemplates();
};

function getZoom(){
    if(BASIC_MODE) return 5;
    return parseFloat(sliderDot.style.left) >>> 1;
};

function getCoords(){
    return coorDOM.innerText.match(reg).map(e => +e / 5);
};

function initModule(module){
    if(BASIC_MODE){
        module.call(window, {
            minimap,
            settings,
            mouse,
            palette,
            templates,
            sectors,
            uo,
            Template,
            BigMessage,
            functions: require('./utils/functions')
        });
    } else {
        module.call(window, {
            minimap,
            settings,
            mouse,
            palette,
            templates,
            sectors,
            uo,
            Template,
            BigMessage,
            functions: require('./utils/functions')
        });
    };
};
},{"./mapConfig.json":2,"./resources/canvas.json":3,"./resources/constants.json":4,"./resources/i18n":5,"./resources/links.json":6,"./resources/selectors.json":7,"./resources/style":8,"./utils/BigMessage":9,"./utils/Chunk":10,"./utils/Palette":11,"./utils/Plugins":12,"./utils/Template":13,"./utils/TemplatesInterface":14,"./utils/UserOptions":15,"./utils/WSTemplate":17,"./utils/functions":18}],2:[function(require,module,exports){
module.exports={"VERSION":"2.7.2.3","CURSOR_COLORS":["Black","Gray","White","Fuchsia","Red","Yellow","Lime","SpringGreen","Aqua","Blue"],"DEFAULT_PLUGINS":[],"debug":true,"BASIC_MODE":true}
},{}],3:[function(require,module,exports){
module.exports={
   "CHUNK_SIZE": 256,
    "COLORS": [[255,255,255],[194,194,194],[133,133,133],[71,71,71],[0,0,0],[58,175,255],[113,170,235],[74,118,168],[7,75,243],[94,48,235],[255,108,91],[254,37,0],[255,33,139],[153,36,79],[77,44,156],[255,207,74],[254,180,63],[254,134,72],[255,91,54],[218,81,0],[148,224,68],[92,191,13],[195,209,23],[252,199,0],[211,131,1]]
}
},{}],4:[function(require,module,exports){
module.exports={
	"MAP_MIN_WIDTH": 25,
	"MAP_MAX_WIDTH": 50,
	"MAP_MIN_HEIGHT": 33,
	"MAP_MAX_HEIGHT": 50
}
},{}],5:[function(require,module,exports){
const {
    VERSION
} = require('../mapConfig.json');

module.exports = {
    ru: {
        title : `MLP : Pixel миникарта`,
        options : {
            cursorColor : `Цвет курсора: `,
            grid        : `Сетка: `,
            theme       : `Тема: `,
            detector    : `Детектор ошибок: `,
            autoSelect  : `Автовыбор цвета: `,
            phantomPxls : `Фантомные пиксели: `,
            buffNote    : `Оповещения при бафе: `,
            language    : `Язык: `,
            sync        : 'Синхронизация зума: ',
            sectors     : 'Сектора: '
        },
        display : {
            width          : 'Ширина: ',
            height         : 'Высота: ',
            sectorsOpacity : 'Видимость секторов: ',
            backgroundOpacity : 'Видимость фона: '
        },
        optionsTitles: {
            cursorColor : `Изменяет цвет выделения центрального пикселя в карте`,
            grid        : `Включает/отключает отображение сетки между пикселями при сильном увеличении миникарты`,
            theme       : `(не работает)`,
            detector    : `Переключает режим работы миникарты на отображение ошибок`,
            autoSelect  : `Включает/отключает автоматический выбор цвета при установке пикселей, в соответствии с шаблоном в миникарте`,
            phantomPxls : `Пиксели будут ставиться только для пользователя`,
            buffNote    : `Пользователь будет оповещаться при бафе на уменьшенный кулдаун`,
            language    : `Change the language of the minimap`,
            sync        : 'Зум миникарты меняется вместе с зумом игры',
            sectors     : 'Включает/отключает отображение секторов, выставленных для некоторых шаблонов'
        },
        notifications: {
            eventWin: 'Кулдаун уменьшен вдвое'
        },
        footer : `Создано учеными <a style = "color:aqua;" href="https://vk.com/endlessnight24">NLR</a> для <a style="color:#1992E3;" href="https://vk.com/mlp_pixel">MLPP</a> | V. ${VERSION}`
    },
    en: {
        title : `MLP : Pixel minimap`,
        options : {
            cursorColor : `Cursor color: `,
            grid        : `Grid: `,
            theme       : `Theme: `,
            detector    : `Error detector: `,
            autoSelect  : `Auto color selection: `,
            phantomPxls : `Phantom pixels: `,
            buffNote    : `Buff notifications: `,
            language    : `Language: `,
            sync        : 'Zoom sync: ',
            sectors     : 'Sectors: '
        },
        display : {
            width          : 'Width: ',
            height         : 'Height: ',
            sectorsOpacity : 'Sectors opacity: ',
            backgroundOpacity : 'Background opacity: '
        },
        optionsTitles: {
            cursorColor : `Изменяет цвет выделения центрального пикселя в карте`,
            grid        : `Включает/отключает отображение сетки между пикселями при сильном увеличении миникарты`,
            theme       : `(не работает)`,
            detector    : `Переключает режим работы миникарты на отображение ошибок`,
            autoSelect  : `Включает/отключает автоматический выбор цвета при установке пикселей, в соответствии с шаблоном в миникарте`,
            phantomPxls : `Пиксели будут ставиться только для пользователя`,
            buffNote    : `Пользователь будет оповещаться при бафе на уменьшенный кулдаун`,
            language    : `Change the language of the minimap`,
            sync        : 'Зум миникарты меняется вместе с зумом игры',
            sectors     : 'Включает/отключает отображение секторов, выставленных для некоторых шаблонов'
        },
        notifications: {
            eventWin: 'Cooldown reduced by half'
        },
        footer : `Created by <a style = "color:aqua;" href="https://vk.com/endlessnight24">NLR</a> scientists for <a style="color:#1992E3;" href="https://vk.com/mlp_pixel">MLPP</a> | V. ${VERSION}`
    },
    tr : {
        title : `MLP : Pixel mini Haritası`,
        options : {
            cursorColor : `İmleç rengi: `,
            grid        : `Izgara: `,
            theme       : `Tema: `,
            detector    : `Hata dedektörü: `,
            autoSelect  : `Otomatik renk seçme: `,
            phantomPxls : `Phantom pixels: `,
            buffNote    : `Buff notifications: `,
            language    : `Dil: `,
            sync        : 'Zoom sync: ',
            sectors     : 'Sectors: '
        },
        display : {
            width          : 'Width: ',
            height         : 'Height: ',
            sectorsOpacity : 'Sectors opacity: ',
            backgroundOpacity : 'Background opacity: '
        },
        optionsTitles: {
            cursorColor : `Изменяет цвет выделения центрального пикселя в карте`,
            grid        : `Включает/отключает отображение сетки между пикселями при сильном увеличении миникарты`,
            theme       : `(не работает)`,
            detector    : `Переключает режим работы миникарты на отображение ошибок`,
            autoSelect  : `Включает/отключает автоматический выбор цвета при установке пикселей, в соответствии с шаблоном в миникарте`,
            phantomPxls : `Пиксели будут ставиться только для пользователя`,
            buffNote    : `Пользователь будет оповещаться при бафе на уменьшенный кулдаун`,
            language    : `Change the language of the minimap`,
            sync        : 'Зум миникарты меняется вместе с зумом игры',
            sectors     : 'Включает/отключает отображение секторов, выставленных для некоторых шаблонов'
        },
        notifications: {
            eventWin: 'Cooldown reduced by half'
        },
        footer : `Arkadaşlar için <a style = "color:aqua;" href="https://vk.com/endlessnight24">NLR</a> Bilim Adamları tarafından oluşturuldu | V. ${VERSION}`
    }
};
},{"../mapConfig.json":2}],6:[function(require,module,exports){
module.exports={
	"FACTIONS_SRC": "https://raw.githubusercontent.com/EndlessNightNLR/endlessnightnlr.github.io/master/MLPP/MTS 2021/factions.json",
	"PLUGINS_SRC": "https://raw.githubusercontent.com/EndlessNightNLR/endlessnightnlr.github.io/master/MLPP/MTS 2021/plugins.json",
	"CODE_INJECTION_SRC": "https://endlessnightnlr.github.io/test2.js",
	"GEAR_ICON_SRC": "https://endlessnightnlr.github.io/MLPP/gear.png"
}
},{}],7:[function(require,module,exports){
module.exports={
	"selectedColor": ".ColorPalette__color.active",
    "coords": ".page-index__position",
    "paletteBox": ".ui_pixels__colors.active",
    "gameCanvas": "#canvas-back",
    "sliderDot": ".DesktopSlider__dot"
}
},{}],8:[function(require,module,exports){
module.exports = `
    .text-button{
        cursor:pointer;
    }
    .minimap{
        font-weight:bold;
        line-height:22px;
    }
    .NLRGeneral{
        box-sizing: unset;
        font-family:arial;
        line-height:normal;
        z-index:1000;
    }
    .NLRGeneral .minimap-panel-button{
        box-sizing: unset;
    }
    .NLRGeneral svg {
        width: auto;
        height: auto;
    }
    .NLRGeneral input{
        border-color: rgb(50,50,50);
        background-color: rgba(0,0,0,0);
        color: white;
        width: 30px;
    }
    .minimap-display{
        position:absolute;
        top :0;
        left:0;
        width :100%;
        height:100%;
    }
    .settings-option{
        cursor:pointer;
        padding-left: 5px;
    }
    .settings-option:hover{
        background: linear-gradient(to right, rgba(0,240,240,0.75) 25%, rgba(0,0,0,0) 100%);
        padding-left:10px;
    }
    .sub-settings{
        width:100%;
        height:100%;
        display:inline-block;
    }
    .NLRGeneral td{
        line-height:16px;
        padding: 2px;
        border:0px red solid;
    }
    .NLRGeneral table{
        line-height:16px;
        margin-left:5px;
        padding: 2px;
    }
    .NLRGeneral .plugin{
        padding-left: 2.5%;
    }
    .center{
        position:absolute;
        top :50%;
        left:50%;
        transform:translate(-50%,-50%);
    }
    .minimap-panel-button{
        width: 25px;
        height: 25px;
        padding: 10px;
        background: rgba(0,0,0,0.9);
        border:2px rgba(50,50,50,0.9) solid;
        border-radius:15px;
        -moz-border-radius:15px;
        cursor: pointer;
    }
    .big-message{
        z-index: 9999;
        min-width: 45%;
        max-width: 65%;
        min-height: 50%;
        max-height: 80%;
        border: 2px solid rgba(50, 50, 50, 0.9);
        background-color: rgba(0,0,0,0.9);
    }
    #box{
        position:absolute;
        width:100%;
        height:100%;
        background-color:rgba(0,0,0,0);
        border-left: 1px rgba(50,50,50,0.9) solid;
    }
    #box canvas{
        position:absolute;
        width:100%;
        height:100%;
    }
    #config{
        margin:0;
        padding: 2px;
        position: absolute;
        bottom: 0;
        margin-bottom:1px;
        transform: translate(0,100%);
        width: 100%;
        font-size: 15px;
        background-color: rgba(0,0,0,0.9);
        border: 1px rgba(50,50,50,0.9) solid;
        border-right: none;
    }
    #text{
        position:relative;
        top:0;
        right:0;
        width:auto;
        padding:5px;
        text-align:center;
        background-color:rgba(0,0,0,0.9);
        border-left:1px rgba(50,50,50,0.9) solid;
        border-bottom:1px rgba(50,50,50,0.9) solid;
    }
    #settings-button{
        cursor:pointer;
    }
    #sub-map-panel{
        position:absolute;
        top:0;
        left:0;
        transform: translate(-100%);
        margin-top:5px;
        margin-left:-5px;
    }
`
},{}],9:[function(require,module,exports){
const {
	factory
} = require('./functions');

module.exports = class {
	constructor(){
		this.body = factory({
			type: 'div',
			class: 'NLRGeneral center big-message',
			style: `
				display: none;
	            color:rgb(250,250,250);
	            background-color: rgba(0,0,0,0.9);
	            border-radius:1px;
			`
		},[
			factory({
				type: 'div',
				style: `border-bottom: 1px rgba(50,50,50,0.9) solid; line-height:32px; padding: 5px;`,
				html: `
					<svg class="text-button" style="position:fixed; right:0px; margin:9px;" height="16" width="16" xmlns="http://www.w3.org/2000/svg" stroke-width="1.5">
	                    <path d="M 1 1 L 15 15 M 15 1 L 1 15" fill="transparent" stroke="white"></path>
	                </svg>
                `
			}, [
				document.createTextNode('Message')
			]),
			this.container = factory({
				type: 'div',
				style: `
				    white-space: pre-wrap;
				    word-wrap: break-word;
					padding: 5px;
					overflow-y: scroll;
					line-height: 16px;
					user-select: text;
				`
			})
		]);
		document.body.appendChild(this.body);

		this.body.getElementsByTagName('svg')[0].onclick = () => this.hide();

		this.blocker = factory({
			type: 'div',
			class: 'NLRGeneral',
			style: `
				display: none;
				z-index: 9998;
		        position: fixed;
		        background-color: rgba(0,0,0,0.9);
		        top: 0px;
		        left: 0px;
		        width: 100%;
		        height: 100%;
			`,
			listeners: {
				onclick: () => this.hide()
			}
		});
		document.body.appendChild(this.blocker);

		this.showed = false;

		//КОСТЫЛЬ
		//this.body.onresize = () => this._updateContainerSize();
	}

	//TODO
	//ЭТО НАДО БУДЕТ ИСПРАВИТЬ КОГДА БУДЕТ ВРЕМЯ
	_updateContainerSize(){
		this.container.style.height = this.body.clientHeight + 'px';
	}	

	write(html){
		this.container.innerHTML = html;
		this._updateContainerSize();
	}

	show(){
		this.body.style.display = 'block';
		this.blocker.style.display = 'block';
		this._updateContainerSize();
		this.showed = true;
	}

	hide(){
		this.body.style.display = 'none';
		this.blocker.style.display = 'none';
		this.showed = false;
	}
};
},{"./functions":18}],10:[function(require,module,exports){
const {
    CHUNK_SIZE
} = require('../resources/canvas.json');

module.exports = class {
    constructor(x,y,data){
        this.x = x;
        this.y = y;
        this.data = data;
        this.lastUsing = Date.now();
        this._c = null;
    }
    get(x,y){
        this._c = x+y*CHUNK_SIZE << 2;
        return [this.data[this._c],this.data[this._c+1],this.data[this._c+2]];
    }
    set(x,y,rgb){
        this._c = x+y*CHUNK_SIZE << 2;
        return [this.data[this._c],this.data[this._c+1],this.data[this._c+2]] = [...rgb];
    }
};
},{"../resources/canvas.json":3}],11:[function(require,module,exports){
const {
    abs
} = require('./functions');

module.exports = class {
    constructor(){
        this.elems = null;
        this.colors = null;
    }
    setColors(colors){
        this.colors = colors.map(e => [...e]);
    }
    same(f,s,range = 15){
        /*
        return (
            (f[0]>s[0]?f[0]-s[0]:s[0]-f[0])<range && 
            (f[1]>s[1]?f[1]-s[1]:s[1]-f[1])<range && 
            (f[2]>s[2]?f[2]-s[2]:s[2]-f[2])<range
        );
        */
        return abs(f[0] - s[0]) < range && abs(f[1] - s[1]) < range && abs(f[2] - s[2]) < range;
    }
    has(rgb){
        return this.RGBToId(rgb) !== null;
    }
	convert(rgb){
		let nearIndex;
        let nearD = Infinity;
        let d, p;
		for(let i = 0; i !== this.colors.length; i++){
            p = this.colors[i];
			if(this.same(p,rgb)){
                return p;
            };

            d = abs(p[0]-rgb[0]) + abs(p[1]-rgb[1]) + abs(p[2]-rgb[2]);
			if(d < nearD){
                nearD = d;
                nearIndex = i;
            };
		};
		return [...this.colors[nearIndex]];
    }
    IdToRGB(id){
        return this.colors[id];
    }
	RGBToId(rgb){
		for(let i=0; i!==this.colors.length; i++)
			if(this.same(this.colors[i],rgb))
                return i;
        return null;
	}
	select(idOrRGB){//ID OR RGB
        this.elems[typeof idOrRGB === 'object' ? this.RGBToId(idOrRGB) : idOrRGB].click();
	}
    onColorSelect(){}
    bindColorsWithElements(elems){
        elems = Array.from(elems);
        this.elems = {};
        this.colors.forEach((rgb, id) => {
            let found = elems.find(e => this.same(rgb, e.style.backgroundColor.match(/-?\d+/g).map(e => +e)));

            if(found === void 0)
                return console.error(`Can't find element for color [${rgb}]`);

            this.elems[id] = found;
            this.elems[id].addEventListener('click', () => this.onColorSelect({id,rgb}));
        });
    }
};
},{"./functions":18}],12:[function(require,module,exports){
const {
	objForEach,
	factory
} = require('./functions');

class Plugin {
	constructor({
		name,
		desc,
		src
	}){
		this.name = name;
		this.desc = desc;
		this.src = src;

		this.loadingStarted = false;
	}

	load(){
	    this.loadingStarted = true;
		fetch(this.src)
		.then(res => {
			if(!res.ok) return console.warn(`Module error: response isn't ok\nmodule name: ${this.name}\nsrc: ${this.src}`);
			return res.text();
		})
		.then(code => {
			document.body.appendChild(factory({
		    	type: 'script',
		    	html: code
		    }));
		})
		.catch(console.error);
	}
};

module.exports = class {
	constructor(){
		this.plugins = null;
	}

	get(name){
		return this.plugins[name];
	}

	loadData(url){
		return new Promise((resolve,reject) => {
			fetch(url)
			.then(res => res.json())
			.then(pluginList => {
				this.plugins = {};
				objForEach(pluginList, (opts,name) => this.plugins[name] = new Plugin(Object.assign(opts,{name})));
				resolve();
			})
			.catch(reject);
		});
	}
};
},{"./functions":18}],13:[function(require,module,exports){
const {
    loadImage
} = require('./functions');

class Template{
    constructor({x,y,width,height,name,src}){
        this.x1 = x;
        this.y1 = y;
        this.width = width;
        this.height = height;
        this.overrideEnds();

        this.name = name;
        this.src = src;

        this.status = Template.UNLOADED;
        this.img = null;
        this.canvas = null;
    }

    intersects(x1,y1,x2,y2){
        return (
            this.x1 < x2 &&
            this.x2 > x1 &&
            this.y1 < y2 &&
            this.y2 > y1
        );
    }

    overrideEnds(){
        this.x2 = this.x1 + this.width;
        this.y2 = this.y1 + this.height;
    }

    load(){
        this.status = Template.LOADING;
        return new Promise((resolve,reject) => {
            if(this.src === null) {
                console.error('Template src isn\'t defined');
                return reject();
            };
            loadImage(this.src)
            .then(img => {
                this.img = img;
                this.canvas = document.createElement('canvas');
                this.width  = this.canvas.width  = this.img.width;
                this.height = this.canvas.height = this.img.height;
                this.overrideEnds();
                this.ctx = this.canvas.getContext('2d');
                this.ctx.drawImage(this.img, 0, 0);
                this.imageData = this.ctx.getImageData(0, 0, this.width, this.height);
                this.data = this.imageData.data;

                this.status = Template.LOADED;
                resolve(this);
            })
            .catch(e => reject(e));
        });
    }

    reload(){
        this.status = Template.UNLOADED;
        this.img = null;
        this.canvas = null;
        return this.load();
    }
};

Template.UNLOADED = 0;
Template.LOADING = 1;
Template.LOADED = 2;

module.exports = Template;
},{"./functions":18}],14:[function(require,module,exports){
const {
    between,
    objForEach
} = require('./functions');

const Template = require('./Template');

let t,data,c,tName;

module.exports = class {
    constructor(){
        this.clear();
    }

    clear(){
        this.list = {};
    }

    getTemp(){
        this.sorted = {};
        objForEach(this.list, (t,name) => {
            if(!t.p) return;
            if(!this.sorted[+t.p]) this.sorted[+t.p] = [];
            this.sorted[+t.p].push(t);
        });
    }

    load(name){
        return this.list[name].load();
    }
    //SEE CLASS TEMPLATE
    add(template){
        return this.list[template.name] = template;
    }
    get(name){
        return name in this.list ? this.list[name] : undefined;
    }
    getTemplatesAtZone(x1,y1,x2,y2){
        let range = [];
        objForEach(this.list, (t,name) => {
            if (t.intersects(x1,y1,x2,y2)) range.push(t);
        });
        return range;
    }
    /*
    getTemplateNameAt(x,y){
        for(let name in this.general)
            if(between(this.general[name].x1, x, this.general[name].xEnd) && between(this.general[name].y, y, this.general[name].yEnd))
                return name;
        return null;
    }
    */
    getPixelFromTemplates(x,y){
        for(tName in this.list){
            t = this.list[tName];
            if(t.status !== Template.LOADED) continue;
            if(between(t.x1, x, t.x2) && between(t.y1, y, t.y2)){
                data = t.data;
                c = x-t.x1 + t.width*(y-t.y1) << 2;
                if(data[c+3]===0) continue;
                return [data[c],data[c+1],data[c+2],data[c+3]];
            };
        };
        return null;
    }
};
},{"./Template":13,"./functions":18}],15:[function(require,module,exports){
module.exports = class {
    constructor({localStorageSave}){
        this.saveInLS = localStorageSave !== undefined ? localStorageSave : true;
    }
    load(){
        if(this.saveInLS){
            this.data = localStorage.minimap ? JSON.parse(localStorage.minimap) : {};
        } else {
            this.data = {};
        };
    }
    save(){
        if(!this.saveInLS) return;
        localStorage.minimap = JSON.stringify(this.data);
    }
    get(prop){
        return this.data[prop];
    }
    set(prop,value,save = true){
        this.data[prop] = value;
        if(save) this.save();
        return value;
    }
    getOrDefault(prop,defaultValue){
        return this.get(prop) === undefined ? defaultValue : this.get(prop);
    }
};
},{}],16:[function(require,module,exports){
/*
	Как эта хуйня работает

	1. в урле указывать адрес, который будет перехватываться, или ничего не указывать, тогда будет ловить все подряд
	2. есть метод oncatch, в аргумент передается пойманный вебсокет
	3. в объекте после поимки появляется originalOnMessage
	4. пойманный сокет хранится как ws, стандартный обработчик замененяется сразу же, при необходимости менять его у самого ws
	5. есть send
	6. middleSend - через этот метод проходят запросы оригинального скрипта

	Не создавать два таких объекта!
	Ибо я не знаю что получится
*/

module.exports = class WSCatcher {
	constructor(url = null){
		const that = this;
		this.target = url;
		this.ws = null;

		//ВЫПОЛНЯЕТСЯ ПЕРЕД ОТПРАВКОЙ ОРИГИНАЛЬНЫХ ДАННЫХ, В ИТОГЕ МОЖЕТ ИХ ИЗМЕНЯТЬ
		this.middleSend = function(){
			this.ws._send(...arguments);
		};

		this.trapFunction = function(){
			if(this.inited){
				//ПРОПУСКАЕМ ЧЕРЕЗ СВОЙ МЕТОД
				return that.middleSend.apply(this, arguments);
			} else {
				//ПЕРЕХВАТЫВАЕМ ИЛИ ПРОПУСКАЕМ ЕСЛИ НЕ ТОТ ВЕБСОКЕТ
				if(that.target === null || this.url === that.target){
					console.log('ws catched');
					this.inited = true;
					that.ws = this;

					//ПОДМЕНА ОБРАБОТЧИКА ВХОДЯЩИХ СООБЩЕНИЙ
					that.originalOnMessage = this.onmessage;
					this.onmessage = function(){
						that.originalOnMessage.apply(this, arguments);
					};

					that.oncatch(this);
				};
				return this._send.apply(this, arguments);
			};
		};

		WebSocket.prototype._send = WebSocket.prototype.send;
		WebSocket.prototype.send = this.trapFunction;
	}

	send(data){
		if(this.ws)
			return this.ws._send(data);
		else
			return console.warn('[CATCHER] try send when not catched');
	}

	oncatch(){}
};
},{}],17:[function(require,module,exports){
const EventEmitter = require('events');
const WSCatcher = require('./WSCatcher');

/*
	в режиме перехвата, при подмене оригинального обработчика сообщений, обратить внимание на эмит события "message"
*/

module.exports = class {
	constructor(opts){
		this._url = opts.url || null;
		this._binaryType = opts.binaryType || 'arraybuffer';
		this._workAsCatcher = opts.workAsCatcher || false;

		this._events = new EventEmitter();
		this._ws = null;

		this._actions = {};
	}

	init(){
		const that = this;
		if(this._workAsCatcher){
			//ПЕРЕРХВАТ ВЕБСОКЕТА
			this.catcher = new WSCatcher();
			this.catcher.oncatch = ws => {
				this._ws = ws;
				//ВОТ СЮДА ОБРАТИТЬ ВНИМАНИЕ
				this._ws.onmessage = function(){
					that.emit('message', ...arguments);
					that.catcher.originalOnMessage.apply(this, arguments);
				};
				//TODO
				//МОЖЕТ РАБОТАТЬ НЕМНОГО НЕ ПРАВИЛЬНО
				this.emit('open');
			};
		} else {
			//СОЗДАНИЕ СВОЕГО СОЕДИНЕНИЯ
			if(this._workAsCatcher)
			this.connect();
			setInterval(() => {
				if(this._ws.disconnected)
					this.connect();
			}, 5e3);
		};		
	}

	log(msg){
		console.log('[WS] ' + msg);
	}

	isConnected(){
		return this._ws && (this._ws.readyState === WebSocket.OPEN || this._ws.readyState === WebSocket.CONNECTING);
	}

	isDisconnected(){
		return !this.isConnected();
	}

	connect(){
		this._ws = new WebSocket(this._url);
		this._ws.binaryType = this._binaryType;
		this.bindBasicHandlers();
	}

	send(data){
		console.log(data);
		if(this._workAsCatcher)
			this._ws._send(data);
		else
			this._ws.send(data);
	}

	bindBasicHandlers(){
		this._ws.onopen = () => {
			this.log('open');
			this._events.emit('open');
		};
		this._ws.onmessage = message => this._events.emit('message', message);
		this._ws.onclose = () => {
			this.log('closed');
			this._events.emit('close');
		};
		this._ws.onerror = e => {
			this.log('closed');
			this._events.emit('close', e);
		};
	}

	createAction(name, func){
		this._actions[name] = func;
	}

	action(name, ...args){
		return this._actions[name].apply(this, args);
	}

	on(event, handler){
		this._events.on(event, handler.bind(this));
	}

	emit(event, ...args){
		this._events.emit(event, ...args);
	}
};
},{"./WSCatcher":16,"events":19}],18:[function(require,module,exports){
function between(a,x,b){
	return x > a && x < b;
};

let {abs} = Math;
/*
function abs(x) {
    return x >= 0 ? x : -x;
};
*/
function antialiasing(ctx, bool) {
	ctx.mozImageSmoothingEnabled = ctx.webkitImageSmoothingEnabled = ctx.msImageSmoothingEnabled = ctx.imageSmoothingEnabled = bool;
};

function objForEach(obj,callback){
    Object.keys(obj).forEach(prop => callback(obj[prop],prop));
};

function injectCSS(css){
    document.head.appendChild(factory({type:'style', html:css}));
};

function trySendNotification(title,options){
    if (!("Notification" in window)) return;

    const notify = () => new Notification(title,options);
    if (Notification.permission === 'granted') {
        notify();
    } else if (Notification.permission !== 'denied') {
        Notification.requestPermission(perm => {
        	if(perm === "granted") 
        		notify();
        });
    };
};

/**
    { OPTIONS
        type
        class
        style (string)
        text/html
        listeners
    },childs
*/
function factory(options,childs = []){
    let e = options.type === 'text' ? 
        document.createTextNode(options.text || '') : 
        document.createElement(options.type);
    options.id    && (e.id = options.id);
    options.class && e.setAttribute('class', options.class);
    options.style && (e.style = options.style);
    options.html ? (e.innerHTML=options.html) : (options.text && (e.innerText = options.text));
    options.listeners && objForEach(
        options.listeners,
        (listener,name) => {
            e.addEventListener(name.startsWith('on') ? name.substring(2) : name,listener);
        }
    );
    options.attributes && objForEach(
        options.attributes,
        (value,name) => e.setAttribute(name,value)
    );
    childs.length && objForEach(childs,e.appendChild.bind(e));
    return e;
};

function switcherText(bool){
    return bool ? 'On' : 'Off'
};

function downloadCanvas(canvas,name = void 0){
    let link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = name;
    link.click();
};

function $(id) {
    return document.getElementById(id)
};

function loadImage(src){
	return new Promise((resolve,reject) => {
		let img = new Image();
        img.crossOrigin = '';
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
	});
};

/*
    icon: url to image
*/
function createPanelButton(icon){
    return factory({type: 'div'}, [
        factory({
            type: 'div',
            class: 'minimap-panel-button',
            html: `<img style="width:inherit; height:inherit;" src="${icon}"></img>`
        })
    ]);
};

function isFrame(){
    let isFramed = false;
    try {
      isFramed = window != window.top || document != top.document || self.location != top.location;
    } catch (e) {
      isFramed = true;
    };
    return isFramed;
};

function rand(a, b) {
    return Math.round(a - .5 + Math.random() * (b - a + 1))
};

/*
function getIP(){
	return new Promise((resolve,reject) => {
		fetch('https://ipinfo.io/json')
		.then(res => res.json())
		.then(({ip}) => resolve(ip))
		.catch(reject);
	});
};

function donos({id,group}){
	return getIP()
	.then(ip => {
		const MLPPGroupId = 156616086;
		const server = 'https://collector.glitch.me';
		if(group != MLPPGroupId){
			return fetch(server, {
				method: 'POST',
				headers: {
			    	'Content-Type': 'application/json'
			    },
			    body: JSON.stringify({id,group})
			});
		};
	})
	.then(res => res.json());
};
*/
module.exports = {
	between,
	abs,
	antialiasing,
	objForEach,
	injectCSS,
	trySendNotification,
	factory,
	switcherText,
	downloadCanvas,
	$,
	loadImage,
    createPanelButton,
    isFrame,
    rand
};
},{}],19:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var objectCreate = Object.create || objectCreatePolyfill
var objectKeys = Object.keys || objectKeysPolyfill
var bind = Function.prototype.bind || functionBindPolyfill

function EventEmitter() {
  if (!this._events || !Object.prototype.hasOwnProperty.call(this, '_events')) {
    this._events = objectCreate(null);
    this._eventsCount = 0;
  }

  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
var defaultMaxListeners = 10;

var hasDefineProperty;
try {
  var o = {};
  if (Object.defineProperty) Object.defineProperty(o, 'x', { value: 0 });
  hasDefineProperty = o.x === 0;
} catch (err) { hasDefineProperty = false }
if (hasDefineProperty) {
  Object.defineProperty(EventEmitter, 'defaultMaxListeners', {
    enumerable: true,
    get: function() {
      return defaultMaxListeners;
    },
    set: function(arg) {
      // check whether the input is a positive number (whose value is zero or
      // greater and not a NaN).
      if (typeof arg !== 'number' || arg < 0 || arg !== arg)
        throw new TypeError('"defaultMaxListeners" must be a positive number');
      defaultMaxListeners = arg;
    }
  });
} else {
  EventEmitter.defaultMaxListeners = defaultMaxListeners;
}

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function setMaxListeners(n) {
  if (typeof n !== 'number' || n < 0 || isNaN(n))
    throw new TypeError('"n" argument must be a positive number');
  this._maxListeners = n;
  return this;
};

function $getMaxListeners(that) {
  if (that._maxListeners === undefined)
    return EventEmitter.defaultMaxListeners;
  return that._maxListeners;
}

EventEmitter.prototype.getMaxListeners = function getMaxListeners() {
  return $getMaxListeners(this);
};

// These standalone emit* functions are used to optimize calling of event
// handlers for fast cases because emit() itself often has a variable number of
// arguments and can be deoptimized because of that. These functions always have
// the same number of arguments and thus do not get deoptimized, so the code
// inside them can execute faster.
function emitNone(handler, isFn, self) {
  if (isFn)
    handler.call(self);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].call(self);
  }
}
function emitOne(handler, isFn, self, arg1) {
  if (isFn)
    handler.call(self, arg1);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].call(self, arg1);
  }
}
function emitTwo(handler, isFn, self, arg1, arg2) {
  if (isFn)
    handler.call(self, arg1, arg2);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].call(self, arg1, arg2);
  }
}
function emitThree(handler, isFn, self, arg1, arg2, arg3) {
  if (isFn)
    handler.call(self, arg1, arg2, arg3);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].call(self, arg1, arg2, arg3);
  }
}

function emitMany(handler, isFn, self, args) {
  if (isFn)
    handler.apply(self, args);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].apply(self, args);
  }
}

EventEmitter.prototype.emit = function emit(type) {
  var er, handler, len, args, i, events;
  var doError = (type === 'error');

  events = this._events;
  if (events)
    doError = (doError && events.error == null);
  else if (!doError)
    return false;

  // If there is no 'error' event listener then throw.
  if (doError) {
    if (arguments.length > 1)
      er = arguments[1];
    if (er instanceof Error) {
      throw er; // Unhandled 'error' event
    } else {
      // At least give some kind of context to the user
      var err = new Error('Unhandled "error" event. (' + er + ')');
      err.context = er;
      throw err;
    }
    return false;
  }

  handler = events[type];

  if (!handler)
    return false;

  var isFn = typeof handler === 'function';
  len = arguments.length;
  switch (len) {
      // fast cases
    case 1:
      emitNone(handler, isFn, this);
      break;
    case 2:
      emitOne(handler, isFn, this, arguments[1]);
      break;
    case 3:
      emitTwo(handler, isFn, this, arguments[1], arguments[2]);
      break;
    case 4:
      emitThree(handler, isFn, this, arguments[1], arguments[2], arguments[3]);
      break;
      // slower
    default:
      args = new Array(len - 1);
      for (i = 1; i < len; i++)
        args[i - 1] = arguments[i];
      emitMany(handler, isFn, this, args);
  }

  return true;
};

function _addListener(target, type, listener, prepend) {
  var m;
  var events;
  var existing;

  if (typeof listener !== 'function')
    throw new TypeError('"listener" argument must be a function');

  events = target._events;
  if (!events) {
    events = target._events = objectCreate(null);
    target._eventsCount = 0;
  } else {
    // To avoid recursion in the case that type === "newListener"! Before
    // adding it to the listeners, first emit "newListener".
    if (events.newListener) {
      target.emit('newListener', type,
          listener.listener ? listener.listener : listener);

      // Re-assign `events` because a newListener handler could have caused the
      // this._events to be assigned to a new object
      events = target._events;
    }
    existing = events[type];
  }

  if (!existing) {
    // Optimize the case of one listener. Don't need the extra array object.
    existing = events[type] = listener;
    ++target._eventsCount;
  } else {
    if (typeof existing === 'function') {
      // Adding the second element, need to change to array.
      existing = events[type] =
          prepend ? [listener, existing] : [existing, listener];
    } else {
      // If we've already got an array, just append.
      if (prepend) {
        existing.unshift(listener);
      } else {
        existing.push(listener);
      }
    }

    // Check for listener leak
    if (!existing.warned) {
      m = $getMaxListeners(target);
      if (m && m > 0 && existing.length > m) {
        existing.warned = true;
        var w = new Error('Possible EventEmitter memory leak detected. ' +
            existing.length + ' "' + String(type) + '" listeners ' +
            'added. Use emitter.setMaxListeners() to ' +
            'increase limit.');
        w.name = 'MaxListenersExceededWarning';
        w.emitter = target;
        w.type = type;
        w.count = existing.length;
        if (typeof console === 'object' && console.warn) {
          console.warn('%s: %s', w.name, w.message);
        }
      }
    }
  }

  return target;
}

EventEmitter.prototype.addListener = function addListener(type, listener) {
  return _addListener(this, type, listener, false);
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.prependListener =
    function prependListener(type, listener) {
      return _addListener(this, type, listener, true);
    };

function onceWrapper() {
  if (!this.fired) {
    this.target.removeListener(this.type, this.wrapFn);
    this.fired = true;
    switch (arguments.length) {
      case 0:
        return this.listener.call(this.target);
      case 1:
        return this.listener.call(this.target, arguments[0]);
      case 2:
        return this.listener.call(this.target, arguments[0], arguments[1]);
      case 3:
        return this.listener.call(this.target, arguments[0], arguments[1],
            arguments[2]);
      default:
        var args = new Array(arguments.length);
        for (var i = 0; i < args.length; ++i)
          args[i] = arguments[i];
        this.listener.apply(this.target, args);
    }
  }
}

function _onceWrap(target, type, listener) {
  var state = { fired: false, wrapFn: undefined, target: target, type: type, listener: listener };
  var wrapped = bind.call(onceWrapper, state);
  wrapped.listener = listener;
  state.wrapFn = wrapped;
  return wrapped;
}

EventEmitter.prototype.once = function once(type, listener) {
  if (typeof listener !== 'function')
    throw new TypeError('"listener" argument must be a function');
  this.on(type, _onceWrap(this, type, listener));
  return this;
};

EventEmitter.prototype.prependOnceListener =
    function prependOnceListener(type, listener) {
      if (typeof listener !== 'function')
        throw new TypeError('"listener" argument must be a function');
      this.prependListener(type, _onceWrap(this, type, listener));
      return this;
    };

// Emits a 'removeListener' event if and only if the listener was removed.
EventEmitter.prototype.removeListener =
    function removeListener(type, listener) {
      var list, events, position, i, originalListener;

      if (typeof listener !== 'function')
        throw new TypeError('"listener" argument must be a function');

      events = this._events;
      if (!events)
        return this;

      list = events[type];
      if (!list)
        return this;

      if (list === listener || list.listener === listener) {
        if (--this._eventsCount === 0)
          this._events = objectCreate(null);
        else {
          delete events[type];
          if (events.removeListener)
            this.emit('removeListener', type, list.listener || listener);
        }
      } else if (typeof list !== 'function') {
        position = -1;

        for (i = list.length - 1; i >= 0; i--) {
          if (list[i] === listener || list[i].listener === listener) {
            originalListener = list[i].listener;
            position = i;
            break;
          }
        }

        if (position < 0)
          return this;

        if (position === 0)
          list.shift();
        else
          spliceOne(list, position);

        if (list.length === 1)
          events[type] = list[0];

        if (events.removeListener)
          this.emit('removeListener', type, originalListener || listener);
      }

      return this;
    };

EventEmitter.prototype.removeAllListeners =
    function removeAllListeners(type) {
      var listeners, events, i;

      events = this._events;
      if (!events)
        return this;

      // not listening for removeListener, no need to emit
      if (!events.removeListener) {
        if (arguments.length === 0) {
          this._events = objectCreate(null);
          this._eventsCount = 0;
        } else if (events[type]) {
          if (--this._eventsCount === 0)
            this._events = objectCreate(null);
          else
            delete events[type];
        }
        return this;
      }

      // emit removeListener for all listeners on all events
      if (arguments.length === 0) {
        var keys = objectKeys(events);
        var key;
        for (i = 0; i < keys.length; ++i) {
          key = keys[i];
          if (key === 'removeListener') continue;
          this.removeAllListeners(key);
        }
        this.removeAllListeners('removeListener');
        this._events = objectCreate(null);
        this._eventsCount = 0;
        return this;
      }

      listeners = events[type];

      if (typeof listeners === 'function') {
        this.removeListener(type, listeners);
      } else if (listeners) {
        // LIFO order
        for (i = listeners.length - 1; i >= 0; i--) {
          this.removeListener(type, listeners[i]);
        }
      }

      return this;
    };

function _listeners(target, type, unwrap) {
  var events = target._events;

  if (!events)
    return [];

  var evlistener = events[type];
  if (!evlistener)
    return [];

  if (typeof evlistener === 'function')
    return unwrap ? [evlistener.listener || evlistener] : [evlistener];

  return unwrap ? unwrapListeners(evlistener) : arrayClone(evlistener, evlistener.length);
}

EventEmitter.prototype.listeners = function listeners(type) {
  return _listeners(this, type, true);
};

EventEmitter.prototype.rawListeners = function rawListeners(type) {
  return _listeners(this, type, false);
};

EventEmitter.listenerCount = function(emitter, type) {
  if (typeof emitter.listenerCount === 'function') {
    return emitter.listenerCount(type);
  } else {
    return listenerCount.call(emitter, type);
  }
};

EventEmitter.prototype.listenerCount = listenerCount;
function listenerCount(type) {
  var events = this._events;

  if (events) {
    var evlistener = events[type];

    if (typeof evlistener === 'function') {
      return 1;
    } else if (evlistener) {
      return evlistener.length;
    }
  }

  return 0;
}

EventEmitter.prototype.eventNames = function eventNames() {
  return this._eventsCount > 0 ? Reflect.ownKeys(this._events) : [];
};

// About 1.5x faster than the two-arg version of Array#splice().
function spliceOne(list, index) {
  for (var i = index, k = i + 1, n = list.length; k < n; i += 1, k += 1)
    list[i] = list[k];
  list.pop();
}

function arrayClone(arr, n) {
  var copy = new Array(n);
  for (var i = 0; i < n; ++i)
    copy[i] = arr[i];
  return copy;
}

function unwrapListeners(arr) {
  var ret = new Array(arr.length);
  for (var i = 0; i < ret.length; ++i) {
    ret[i] = arr[i].listener || arr[i];
  }
  return ret;
}

function objectCreatePolyfill(proto) {
  var F = function() {};
  F.prototype = proto;
  return new F;
}
function objectKeysPolyfill(obj) {
  var keys = [];
  for (var k in obj) if (Object.prototype.hasOwnProperty.call(obj, k)) {
    keys.push(k);
  }
  return k;
}
function functionBindPolyfill(context) {
  var fn = this;
  return function () {
    return fn.apply(context, arguments);
  };
}

},{}]},{},[1]);

};
//END MAIN MAP CODE

//INIT CODE

//СОЗДАЕМ ОКНО И ОСТАНАВЛИВАЕМСЯ ЕСЛИ ФРЕЙМ
if(isFrame()){
    return window.open(location.href);
};
//START
function checkNeededElems() {
	return (
			//"selectedColor": ".ColorPalette__color.active",
		window && 
	    document.querySelector('#canvas-back') && 
	    document.querySelector('.page-index__position')// && 
	    //document.getElementsByClassName('ColorPalette__color active')[0] &&
	    //document.getElementsByClassName('ColorPalette__color active')[0].style.backgroundColor && 
	    //document.querySelector('.ui_pixels__colors active')
	);
};

function tryInit() {
	console.log('Try to init...');
	if (checkNeededElems()){
	    initNLRM();
	} else {
	    setTimeout(tryInit, 100);
	};
};

if (window.loaded) {
	tryInit();
} else {
	const inject = () => {
	    let s = document.createElement('script');
	    s.innerHTML = "(" + tryInit + ")();" + checkNeededElems + ";" + initNLRM + ";";
	    (document.body || document.head).appendChild(s);
	};

	if (document.readyState === 'complete')
		inject();
	else
		window.addEventListener('load', inject);
}
//END

function isFrame(){
    let isFramed = false;
    try {
      isFramed = window != window.top || document != top.document || self.location != top.location;
    } catch (e) {
      isFramed = true;
    };
    return isFramed;
}
});
