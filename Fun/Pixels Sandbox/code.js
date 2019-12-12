//Endless Night
//Glory to the Luna and New Lunar Republic!
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
	getIdByColor : function(rgba){
		for(let i=0;i<this.colors.length;i++) {
			let palClr = this.colors[i];
			if(palClr[0]===rgba[0] && palClr[1]===rgba[1] && palClr[2]===rgba[2]) return i;
		};
		return null;
	}
};
for(let i=0;i<palette.elems.length;i++) {
	let e = palette.elems[i];
	palette.colors.push(e.style.backgroundColor.match(/-?\d+/g).map(x=>+x));
	//PIXEL COLOR
	e.onclick = () => selectColor(i);
	//BACKGROUND COLOR
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
	for(let i=0;i<data.length;i++) data[i]=0;
	ctx.putImageData(imageData,0,0);
	for(let i=0;i<width;i++) layers[i]=border;
};

document.oncontextmenu = () => false;

if(!fromFile) window.onunload = () => {
	save.data = compressData(save.data);
	localStorage.save = JSON.stringify(save);
};

$('save').onclick = () => {
	let time = performance.now();

	//COPY
	save = {
		data   : new Uint8ClampedArray(data.length),
		layers : [...layers],
		pixels : [...pixels].map(x=>[...x])
	};
	for(let i=0;i<data.length;i++) save.data[i]=data[i];
	//>------------------------------------------------

	console.log('Saved '+(performance.now()-time));
};

$('load').onclick = () => {
	if(save===null) {console.log('Save not found');return};
	if(save.layers.length!==layers.length) {console.warn('Dif layers sizes');return};
	if(save.data.length!==data.length) {console.warn('Dif datas sizes');return};

	//COPY
	for(let i=0;i<data.length;i++) data[i]=save.data[i];
	layers = [...save.layers];
	pixels = [...save.pixels].map(x=>[...x]);
	//>------------------------------------------------

	ctx.putImageData(imageData,0,0);
	console.log('Loaded');
};
//>------------------------------------------------

//FUNCTIONS
function addPxls(x,y,count=4,range=6){
	main : for(let i=0;i<count;i++){
		let last = pixels.length;
		pixels.push([x+rand(-range,range),y+rand(-range,range),[...palette._selectedColorRGB,255]]);
		if(pixels[last][0]>=width || pixels[last][0]<0){
			pixels.splice(last,1);
			continue main
		};
		if(pixels[last][1]>=layers[pixels[last][0]]) {
			pixels.splice(last,1);
			count--;
			continue main
		};
		sub : for(let j=1;j<i;j++)
			if(pixels[last][0]==pixels[last-j][0] && pixels[last][1]==pixels[last-j][1]) {
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

function compressData(data){
	let ids = new Uint8ClampedArray(data.length>>>2),
		compressed = [],
		idOfEmpty = 31;
	for(let i=0,j=0;j<ids.length;i+=4,j++) {
		if(data[i+3]===0) ids[j]=idOfEmpty;
		else ids[j]=palette.getIdByColor([data[i],data[i+1],data[i+2]]);
	};
	for(let i=0;i<ids.length;i+=2) compressed.push(ids[i]+(ids[i+1]<<5));
	return compressed.join('.')
};

function decompressData(compressed){
	compressed = compressed.split('.');
	let data = new Uint8ClampedArray(compressed.length<<3),
		ids  = new Uint8ClampedArray(compressed.length<<1),
		idOfEmpty = 31;
	for(let i=0,j=0;j<compressed.length;i+=2,j++)
		[ids[i],ids[i+1]] = [compressed[j]&31,compressed[j]>>>5];
	for(let i=0,j=0;j<ids.length;i+=4,j++){
		if(ids[j]===idOfEmpty) data[i]=data[i+1]=data[i+2]=data[i+3]=0;
		else [data[i],data[i+1],data[i+2],data[i+3]] = [...palette.getColorById(ids[j]),255];
	};
	return data
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

(window.listener = function(){
	try{
		if(pixels.length){
			for(let i=0,l=pixels.length;i<l;i++){
				let pxl = pixels[i];
				if(layers[pxl[0]]>pxl[1]) setPxl(pxl[0],pxl[1],[0,0,0,0]);
				if(pxl[1]+speed>=layers[pxl[0]]){
					setPxl(pxl[0],layers[pxl[0]],pxl[2]);
					pixels.splice(i,1);
					i--;l--;layers[pxl[0]]--;
				} else {
					pxl[1]+=speed;
					setPxl(...pxl);
				};
			};
			ctx.putImageData(imageData,0,0);
		};
		if(mouseDown && worldY<layers[worldX]) addPxls(worldX,worldY);
	} catch(e){console.log(e)};
	window.requestAnimationFrame(window.listener);
})();