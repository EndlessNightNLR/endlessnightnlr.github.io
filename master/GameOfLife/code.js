var canvas = $('canvas');
var ctx = canvas.getContext('2d');
var settings = $(`settings`);
var map, newMap;
var generation = 0;
var width = 300;
var height = 200;
var pxlSize = 2;
var isStart = false;
var intervalID, timeStart, timeEnd, intervalTime = 500;
var times = [];
var borders = false,
    debug = true;

/*if(!localStorage.debug)localStorage.debug = true;
else debug = localStorage.debug;*/

$(`start`).onclick = () => start();
$(`stop`).onclick = () => stop();
$(`restart`).onclick = () => restart();

settings.style.width = '100%';

canvas.width = width * pxlSize;
canvas.height = height * pxlSize;

restart(1, 3);

intervalID = setInterval(start, intervalTime);

window.onkeydown = e => {
    log(`keyCode: ${e.keyCode}`);
    if (e.keyCode == 48)
        if (localStorage.debug == `true`) {
            localStorage.debug = false;
            debug = `false`;
        } else {
            localStorage.debug = `true`;
            debug = false;
        }
    if(e.keyCode = 32)
    	if(isStart)stop();
    else start();
}

function start() {
    isStart = true;

    //intervalID = setInterval(function(){
    timeStart = new Date();
    timeStart = timeStart.getSeconds() + timeStart.getMilliseconds();

    var y0 = true,
        yMax, x0, xMax;
    let cells;
    for (var y = 0; y < height; y++) {
        if (y != 0) y0 = false;
        if (y == height - 1) yMax = true;
        else yMax = false;

        for (var x = 0; x < width; x++) {
            if (x == 0) x0 = true;
            else x0 = false;
            if (x == width - 1) xMax = true;
            else xMax = false;

            //log(`y: ${y} x: ${x}`);

            cells = 0;
            //UP
            //CENTER
            if (y0) {
                if (map[height - 1][x] == 1) cells++;
            } else if (map[y - 1][x] == 1) cells++;

            //LEFT
            if (x0) {
                if (y0) {
                    if (map[height - 1][width - 1]) cells++;
                } else if (map[y - 1][width - 1]) cells++;
            } else {
                if (y0) {
                    if (map[height - 1][x - 1]) cells++;
                } else if (map[y - 1][x - 1]) cells++;
            }

            //RIGHT
            if (xMax) {
                if (y0) {
                    if (map[height - 1][0]) cells++;
                } else if (map[y - 1][0]) cells++;
            } else {
                if (y0) {
                    if (map[height - 1][x + 1]) cells++;
                } else if (map[y - 1][x + 1]) cells++;
            }
            //CENTER
            //RIGHT
            if (xMax) {
                if (map[y][0] == 1) cells++;
            } else if (map[y][x + 1] == 1) cells++;

            //LEFT
            if (x0) {
                if (map[y][width - 1] == 1) cells++;
            } else if (map[y][x - 1] == 1) cells++;
            //DOWN
            //CENTER
            if (yMax) {
                if (map[0][x] == 1) cells++;
            } else if (map[y + 1][x] == 1) cells++;

            //LEFT
            if (x0) {
                if (yMax) {
                    if (map[height - 1][width - 1]) cells++;
                } else if (map[y + 1][width - 1]) cells++;
            } else {
                if (yMax) {
                    if (map[height - 1][x - 1]) cells++;
                } else if (map[y + 1][x - 1]) cells++;
            }
            //RIGHT
            if (xMax) {
                if (yMax) {
                    if (map[0][0]) cells++;
                } else if (map[y + 1][0]) cells++;
            } else {
                if (yMax) {
                    if (map[0][x + 1]) cells++;
                } else if (map[y + 1][x + 1]) cells++;
            }

            if (cells == 3) newMap[y][x] = 1;
            else if (cells == 2) newMap[y][x] = map[y][x];
            else newMap[y][x] = 0;
        }
    }

    ctx.fillStyle = 'rgb(0,150,0)';
    for (let y = 0; y < height; y++)
        for (let x = 0; x < width; x++)
            if ((newMap[y][x] == 1) && (map[y][x] != newMap[y][x])) ctx.fillRect(x * pxlSize, y * pxlSize, pxlSize, pxlSize);
    ctx.fillStyle = 'rgb(0,0,0)';
    for (let y = 0; y < height; y++)
        for (let x = 0; x < width; x++)
            if ((newMap[y][x] == 0) && (map[y][x] != newMap[y][x])) ctx.fillRect(x * pxlSize, y * pxlSize, pxlSize, pxlSize);

    for (let y = 0; y < height; y++)
        for (let x = 0; x < width; x++)
            map[y][x] = newMap[y][x];

    timeEnd = new Date();
    timeEnd = timeEnd.getSeconds() + timeEnd.getMilliseconds();
    times.push(timeEnd - timeStart);
    log(`Time for generation ${generation++}: ${times[times.length - 1] / 1000} sec.`);
	$(`time`).innerHTML = times[times.length - 1] / 1000;

    intervalTime = times[times.length - 1] * 1.2;
    log(`intervalTime: ${intervalTime / 1000} sec.`);
    $(`intervalTime`).innerHTML = intervalTime / 1000;

    log(`>-----------------------`);

    clearInterval(intervalID);
    intervalID = setInterval(start, intervalTime);
};

function restart(part = 1, parts = 3) {
	generation = 0;
	intervalTime = 500;
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    map = new Array(height);
    for (let y = 0; y < height; y++) map[y] = new Array(width);

    newMap = new Array(height);
    for (let y = 0; y < height; y++) newMap[y] = new Array(width);

    for (let y = 0; y < height; y++)
        for (let x = 0; x < width; x++)
            newMap[y][x] = 0;

    ctx.fillStyle = 'rgb(0,0,0)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < height; y++)
        for (let x = 0; x < width; x++)
            if (rand(1, parts) <= part) map[y][x] = 1;
            else map[y][x] = 0;

    times = [];
};

function stop() {
    if (!isStart) return;
    isStart = false;
    clearInterval(intervalID);

    let sum = 0;
    for (let i = 0; i < times.length; i++) sum += times[i];
    log(`Average generation time: ${sum/times.length}`);
    delete sum;
};

function log(msg) {
    if (debug == true) console.log(msg)
};

function rand(a, b) {
    return Math.round(a - .5 + Math.random() * (b - a + 1))
}; //ВКЛЮЧАЕТ И МИНИМУМ, И МАКСИМУМ

function div(a, b) {
    return (a - (a % b)) / b
};

function $(id) {
    return document.getElementById(id);
}