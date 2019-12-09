//Endless
//Glory to the Luna and New Lunar Republic!
//ЭТА НАДПИСЬ ЗДЕСЬ ПРОСТО ТАК
'use strict';

let mobile = !!(/Android|webOS|iPhone|iPad|iPod|BlackBerry|BB|PlayBook|IEMobile|Windows Phone|Kindle|Silk|Opera Mini/i.test(navigator.userAgent)),
	fromFile = location.protocol.includes('file'),

	canvas = $('canvas'),
	ctx = canvas.getContext('2d'),

	width = window.outerWidth,
	height = window.innerHeight,
	border = height - 50,

	worldX = null,
	worldY = null,

	mouseDown = false,

	speed = 10,
	pixels = [],
	layers = new Array(width),

	save = null;

//PALETTE
let palette = {
	elems : document.getElementsByClassName('color'),
	colors : [],

	_selectedColorID : null,
	get selectedColorID(){return this._selectedColorID},
	set selectedColorID(id){this._selectedColorID=id;this._selectedColorRGB=this.getColorById(id)},

	_selectedColorRGB : null,
	get selectedColorRGB(){return this._selectedColorRGB},
	set selectedColorRGB(rgb){this._selectedColorRGB=rgb;this._selectedColorID=this.getIdByColor(rgb)},

	_selectedBackgroundID : null,
	get selectedBackgroundID(){return this._selectedBackgroundID},
	set selectedBackgroundID(id){this._selectedBackgroundID=id;this._selectedBackgroundRGB=this.getColorById(id)},

	_selectedBackgroundRGB : null,
	get selectedBackgroundRGB(){return this._selectedBackgroundRGB},
	set selectedBackgroundRGB(rgb){this._selectedBackgroundRGB=rgb;this._selectedBackgroundID=this.getIdByColor(rgb)},

	getColorById : function(id){return this.colors[id] || null},
	getIdByColor : function(rgb){
		for(let i=0;i<this.colors.length;i++) {
			let palClr = this.colors[i];
			if(palClr[0]===rgb[0] && palClr[1]===rgb[1] && palClr[2]===rgb[2]) return i;
		};
		return null;
	}
};
for(let i=0;i<palette.elems.length;i++) {
	let e = palette.elems[i];
	palette.colors.push(e.style.backgroundColor.match(/-?\d+/g).map(x=>+x));
	//COLOR
	e.onclick = () => selectColor(i);
	//BACKGROUND
	e.oncontextmenu = () => {
	    e = e || window.event;
	    e.preventDefault ? e.preventDefault() : e.returnValue = false;
		selectBackground(i);
	};
};

selectColor(palette.selectedColorID = 15);
selectBackground(0);
console.log(palette.colors.join('\n'));
//>------------------------------------------------

//LOCALE STORAGE
if(!fromFile){
	if(localStorage.save) save = JSON.parse(localStorage.save);
};
//>------------------------------------------------

//CANVAS
canvas.width=width; canvas.height=height;
let imageData = ctx.getImageData(0,0,width,height),
	data = imageData.data;
//>------------------------------------------------

//BORDER
for(let i=0;i<width;i++) layers[i]=border;
//>------------------------------------------------

//LISTENERS
canvas.onmousemove = e => {
	if(!mouseDown) return;
	let lastX = worldX,
		lastY = worldY;
	worldX = e.clientX;
	worldY = e.clientY;

	let pixelsCount = 7;

	let stepX = Math.abs(lastX-worldX)/pixelsCount,
		stepY = Math.abs(lastY-worldY)/pixelsCount;

	for(let i=0;i<pixelsCount;i++){
		let x = ~~(lastX+stepX*i),
			y = ~~(lastY+stepY*i);
		if(y<layers[x]) addPxls(x,y,1,4);
	};
};

canvas.onmousedown = e => {mouseDown=true; worldX=e.clientX; worldY=e.clientY};
window.onblur = canvas.onmouseleave = canvas.onmouseup = () => mouseDown = false;

$('clear').onclick = () => {
	pixels = [];
	for(let i=0;i<width*height<<2;i+=4) data[i]=data[i+1]=data[i+2]=data[i+3]=0;
	ctx.putImageData(imageData,0,0);
	for(let i=0;i<width;i++) layers[i]=border;
};

document.oncontextmenu = () => false;

$('save').onclick = () => {
	save = {
		data : new Uint8ClampedArray(data.length),
		layers : [...layers],
		pixels : [...pixels].map(x=>({x:x.x,y:x.y,rgb:[...x.rgb]}))
	};
	for(let i=0,l=data.length;i<l;i++) save.data[i] = data[i];
	console.log('Saved');

	if(fromFile) return;
	localStorage.save = JSON.stringify(save);
};

$('load').onclick = () => {
	if(save===null) {console.log('Save not found');return};
	if(save.data.length!==data.length || save.layers.length!==layers.length) {console.log('Dif sizes');return};

	for(let i=0,l=data.length;i<l;i++) data[i] = save.data[i];
	layers = [...save.layers];
	pixels = [...save.pixels].map(x=>({x:x.x,y:x.y,rgb:[...x.rgb]}));
	ctx.putImageData(imageData,0,0);
	console.log('Loaded	');
};
//>------------------------------------------------

//FUNCTIONS
function addPxls(x,y,count=4,range=6){
	main : for(let i=0;i<count;i++){
		let last = pixels.length;
		pixels.push({
			x:x+rand(-range,range),
			y:y+rand(-range,range),
			rgb: [...palette._selectedColorRGB,255]
		});
		if(pixels[last].x>=width || pixels[last].x<0){
			pixels.splice(last,1);
			continue main
		};
		if(pixels[last].y>=layers[pixels[last].x]) {
			pixels.splice(last,1);
			count--;
			continue main
		};
		sub : for(let j=1;j<i;j++)
			if(pixels[last].x==pixels[last-j].x && pixels[last].y==pixels[last-j].y) {
				i--;
				pixels.unshift();
				break sub
			};
	};
};

function rand(a, b) {return Math.round(a-.5+Math.random()*(b-a+1))};

function getPxl(x,y){
	let c=x + y*width << 2;
	return [data[c],data[c+1],data[c+2],data[c+3]];
};

function setPxl(x,y,rgb){
	let c=x + y*width << 2;
	[data[c],data[c+1],data[c+2],data[c+3]] = [...rgb];
};

function selectColor(id){
	let selector = $('selectorColor');
	selector && selector.remove();

	palette.selectedColorID = id;

	selector = document.createElement('div');
	selector.id = 'selectorColor';
	let s = selector.style,
		radius = 5;
	s.position = 'relative';
    s.marginLeft = s.marginRight = 'auto';
	s.width = s.height = radius*2+'px';
    s.top = palette.elems[0].offsetHeight/2-radius+'px';
    s.borderRadius = radius+'px';
    let rgb = palette.colors[id];
	if(rgb[0]===128 && rgb[1]===128 && rgb[2]===128) selector.style.backgroundColor = `rgb(20,230,230)`;
	else selector.style.backgroundColor = `rgb(${255-rgb[0]},${255-rgb[1]},${255-rgb[2]})`;

	palette.elems[id].appendChild(selector);
};

function selectBackground(id){
	let selector = $('selectorBg');
	selector && selector.remove();

	document.body.style.backgroundColor = `rgb(${palette.getColorById(id)})`;

	selector = document.createElement('div');
	selector.id = 'selectorBg';
	let s = selector.style,
		radius = 5,
		borderWidth = 5;
	s.position = 'relative';
    s.marginLeft = s.marginRight = 'auto';
	s.width = s.height = radius*2+'px';
    s.top = palette.elems[0].offsetHeight/2-radius-borderWidth+'px';
    s.border = `${borderWidth}px solid rgb(${palette.getColorById(id).map(x => 255-x)})`;
    s.borderRadius = radius*2+'px';
    s.borderWidth = borderWidth+'px';
    let rgb = palette.colors[id];
	if(rgb[0]==128 && rgb[1]===128 && rgb[2]===128) selector.style.borderColor = `rgb(20,230,230)`;
	else selector.style.borderColor = `rgb(${255-rgb[0]},${255-rgb[1]},${255-rgb[2]})`;

	palette.elems[id].appendChild(selector);
};

function $(id){return document.getElementById(id)};

(function listener(){
	try{
		if(pixels.length){
			for(let i=0,len=pixels.length;i<len;i++){
				let pxl = pixels[i];
				if(layers[pxl.x]>pxl.y) setPxl(pxl.x,pxl.y,[0,0,0,0]);
				if(pxl.y+speed>=layers[pxl.x]){
					setPxl(pxl.x,layers[pxl.x],pxl.rgb);
					pixels.splice(i,1);
					i--;len--;layers[pxl.x]--;
				} else {
					pxl.y+=speed;
					setPxl(pxl.x,pxl.y,pxl.rgb);
				};
			};
			ctx.putImageData(imageData,0,0);
		};
		if(mouseDown && worldY<layers[worldX]) addPxls(worldX,worldY);
	} catch (e) {console.log(e)};
	window.requestAnimationFrame(listener);
})();