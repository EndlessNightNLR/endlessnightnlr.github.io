//Endless Night
//Wow, you decided to look here?
//Apparently you are interested in my code ...
//I am very pleased)
`use strict`;
var canvas = $('canvas'),
    ctx = canvas.getContext('2d'),
    minTime = +$(`minTime`).value,
    map, newMap, scanMap,
    generation,
    width = +$(`width`).value,
    height = +$(`height`).value,
    sWidth,sHeight,//SPECIAL
    pxlSize = +$(`pxlSize`).value,
    isStart = false,
    intervalID, intervalTime = 1000,
    debug = false,
    border = false, updateBorder = false,
    intervalStart = false,
    y0, yMax, x0, xMax,
    yNot0, yNotMax, xNot0, xNotMax,
    cells,
    cache = {
        getWidth: {},
        getHeight: {}
    },
    rules = [,false,false,true,false,false,false,false,false,false,true,true,false,false,false,false,false];

var data = {
    get: function(){
        this.imageData = ctx.getImageData(0,0,canvas.width,canvas.height);
        this.data = this.imageData.data;
    },
    drawCell: function(yMap,xMap){
        let startPosy = pxlSize * ((yMap * canvas.width + xMap) << 2) + 1;//IN DATA
        for(let a = 0;a < pxlSize;a++)
            for(let b = 0;b < pxlSize;b++)
                this.data[startPosy + ((a*canvas.width + b) << 2)] = 150;
    },
    killCell: function(yMap,xMap){
        let startPosy = pxlSize * ((yMap * canvas.width + xMap) << 2) + 1;//IN DATA
        for(let a = 0;a < pxlSize;a++)
            for(let b = 0;b < pxlSize;b++)
                data.data[startPosy + ((a*canvas.width + b) << 2)] = 0;
    },
    set: function(){
        ctx.putImageData(this.imageData,0,0);
    }
};

var timer = {
    start: function(name){
        let date = new Date();
        this[`time_start_${name}`] = [date.getMinutes(), date.getSeconds(), date.getMilliseconds()];
    },
    stop: function(name){
        let date = new Date();
        this.lastTime = (date.getMinutes() - this[`time_start_${name}`][0]) + (date.getSeconds() - this[`time_start_${name}`][1]) + (date.getMilliseconds() - this[`time_start_${name}`][2]);
    },
    lastTime: null
};

// EVENTS

$(`startStop`).onclick = () => {
    if($(`startStop`).innerText == `Start`){
        start();
        intervalStart = true;
        $(`startStop`).innerText = `Stop`;
    } else {
        stop();
        $(`startStop`).innerText = `Start`;
    }
}

$(`restart`).onclick = () => restart();

window.onkeydown = e => {
    switch(e.keyCode){
        case 32:
            if($(`startStop`).innerText == `Start`){
                start();
                intervalStart = true;
                $(`startStop`).innerText = `Stop`;
            } else {
                stop();
                $(`startStop`).innerText = `Start`;
            }
            return 0;
            break;
    }
};

$(`apply`).onclick = () => {
    let r = document.getElementsByClassName(`rule`);
    rules = [];

    for(let i = 1;i <= 16;i++)
        if(r[i - 1].checked)
            rules[i] = true;
        else 
            rules[i] = false;

    ctx.fillStyle = `rgb(0,0,0)`;
    ctx.fillRect(0,0,canvas.width,canvas.height);

    for(let y = 0;y < height;y++)
        for(let x = 0;x < width;x++)
            if(!!map[y][x])
                data.drawCell(y,x);
}

$(`userBorder`).onclick = function(){
    if(border){
        this.innerText = `Off`;
        this.style.color = `red`;
        border = false;
    }else{
        this.innerText = `On`;
        this.style.color = `green`;
        border = true;
    }
    updateBorder = true;
};

window.onload = restart();

// UI

var gear = $(`gear`),
    img = new Image(),
    settings = $(`settingsWindow`);
    setOut = false,
    setIn = false,
    settingsTime = 80,//ВРЕМЯ РАЗВЕРТЫВАНИЯ (MILISEC.)
    settingsIterations = 10,//КОЛИЧЕСТВО КАДРОВ
    setSize = {
        minWidth: getWidth(settings),
        maxWidth: 200,
        minHeight: getHeight(settings),
        maxHeight: 325
    },
    step = {
        width: ((setSize.maxWidth - setSize.minWidth) / settingsIterations),
        height: ((setSize.maxHeight - setSize.minHeight) / settingsIterations)
    },
    gearPosy = 0,
    settingsInterval = [];

img.src = `gear.png`;

img.onload = function(){
    let ctx = gear.getContext(`2d`);
    ctx.drawImage(img,0,0,gear.width,gear.height);
};

gear.onclick = function(){
    $(`span`).style.display = `none`;
    $(`filling`).style.display = `none`;

    if(gearPosy > 0){
        if(setOut)
            for(let i in settingsInterval)
                clearInterval(settingsInterval[i]);
        setOut = false;
        setIn = true;

        //console.time();
        settingsInterval[settingsInterval.length - 1] = setInterval(() => { // IN
            if(gearPosy == 0){
                settings.style.width = `${setSize.minWidth}px`;
                settings.style.height = `${setSize.minHeight}px`;

                for(let i in settingsInterval)
                    clearInterval(settingsInterval[i]);
                setIn = false;
                //console.timeEnd();
                return;
            };

            gearPosy--;

            settings.style.width = `${getWidth(settings) - step.width}px`;
            settings.style.height = `${getHeight(settings) - step.height}px`;
        },settingsTime / settingsIterations);
    }else{
        if(setIn)
            for(let i in settingsInterval)
                clearInterval(settingsInterval[i]);

        setOut = true;
        setIn = false;

        //console.time();
        settingsInterval[settingsInterval.length - 1] = setInterval(() => { // OUT
            if(gearPosy == settingsIterations){
                settings.style.width = `${setSize.maxWidth}px`;
                settings.style.height = `${setSize.maxHeight}px`;   
                $(`span`).style.display = `block`;
                $(`filling`).style.display = `block`;

                for(let i in settingsInterval)
                    clearInterval(settingsInterval[i]);
                setOut = false;
                //console.timeEnd();
                return;
            };

            gearPosy++;

            settings.style.width = `${getWidth(settings) + step.width}px`;
            settings.style.height = `${getHeight(settings) + step.height}px`;
        },settingsTime / settingsIterations);
    }
};

// FUNCTIONS

function start() {
    if(isStart){
        console.warn(`Interval is stopped!`);
        return;
    }
    
    isStart = true;

    timer.start(`interval`);

    if(updateBorder){
        //SCAN BORDERS
        for(let y = 0;y < height;y++){
            scanMap[y][0] = 1;
            scanMap[y][sWidth] = 1;        
        };
        for(let x = 0;x < width;x++){
            scanMap[0][x] = 1
            scanMap[sHeight][x] = 1;
        };
        //--------
        updateBorder = false;
    };

    if(border){
        for (let y = 0; y < height; y++){

            if (y == 0){
                yNot0 = false;
                yNotMax = true;
            }else{
                yNot0 = true;
                if (y == sHeight) yNotMax = false;
                else yNotMax = true;
            }

            for (let x = 0; x < width; x++) {
                if(scanMap[y][x] == 0) continue;

                if (x == 0){
                    xNot0 = false;
                    xNotMax = true;
                }else{
                    xNot0 = true;
                    if (x == sWidth) xNotMax = false;
                    else xNotMax = true;
                }

                cells = 0;

                //>-----------------------------------------------<

                    if(yNot0){
                        if(xNot0)
                            cells += map[y - 1][x - 1];
                        cells += map[y - 1][x];
                        if(xNotMax)
                            cells += map[y - 1][x + 1];
                    }

                    if(xNot0)
                        cells += map[y][x - 1];
                    if(xNotMax)
                        cells += map[y][x + 1];

                    if(yNotMax){
                        if(xNot0)
                            cells += map[y + 1][x - 1];
                        cells += map[y + 1][x];
                        if(xNotMax)
                            cells += map[y + 1][x + 1];
                    }

                //>-----------------------------------------------<

                if(rules[cells]){
                    newMap[y][x] = 1;
                    if(map[y][x] != newMap[y][x])
                        data.drawCell(y,x);
                }else if(rules[cells + 8]) 
                    newMap[y][x] = map[y][x];
                else {
                    newMap[y][x] = 0;
                    if(map[y][x] != 0)
                        data.killCell(y,x);
                }
            }
        }
        //SCAN FOR OPTI

        for (let y = 0; y < height; y++){

            if (y == 0){
                yNot0 = false;
                yNotMax = true;
            }else{
                yNot0 = true;
                if (y == sHeight) yNotMax = false;
                else yNotMax = true;
            }

            for (let x = 0; x < width; x++) {
                if(map[y][x] == newMap[y][x]) continue;

                map[y][x] = newMap[y][x];// COPY ARR

                if (x == 0){
                    xNot0 = false;
                    xNotMax = true;
                }else{
                    xNot0 = true;
                    if (x == sWidth) xNotMax = false;
                    else xNotMax = true;
                }

                //>-----------------------------------------------<

                    if(yNot0){
                        if(xNot0)
                            scanMap[y - 1][x - 1] = 1;
                        scanMap[y - 1][x] = 1;
                        if(xNotMax)
                            scanMap[y - 1][x + 1] = 1;
                    }

                    if(xNot0)
                        scanMap[y][x - 1] = 1;
                    if(xNotMax)
                        scanMap[y][x + 1] = 1;

                    if(yNotMax){
                        if(xNot0)
                            scanMap[y + 1][x - 1] = 1;
                        scanMap[y + 1][x] = 1;
                        if(xNotMax)
                            scanMap[y + 1][x + 1] = 1;
                    }

                //>-----------------------------------------------<
            }
        }
        //END SCAN
    }else{
        for (let y = 0; y < height; y++) {
            if (y == 0){
                y0 = true;
                yMax = false;
            }else{
                y0 = false;
                if (y == sHeight)yMax = true;
                else yMax = false;
            }
            for (let x = 0; x < width; x++) {
                if(scanMap[y][x] == 0) continue;

                if (x == 0){
                    x0 = true;
                    xMax = false;
                }else{
                    x0 = false;
                    if (x == sWidth) xMax = true;
                    else xMax = false;
                }

                cells = 0;

                //>------------------<OPTIMIZED>------------------<

                    if (x0) {
                        if (yMax) {
                            cells += map[sHeight][sWidth];
                        } else cells += map[y + 1][sWidth];
                        cells += map[y][sWidth];
                        if (y0) {
                            cells += map[sHeight][x];
                            cells += map[sHeight][sWidth];
                        } else {
                            cells += map[y - 1][sWidth];
                            cells += map[y - 1][x];
                        }
                    } else {
                        if (yMax) {
                            cells += map[sHeight][x - 1];
                        } else cells += map[y + 1][x - 1];
                        cells += map[y][x - 1];
                        if (y0) {
                            cells += map[sHeight][x];
                            cells += map[sHeight][x - 1];
                        } else {
                            cells += map[y - 1][x - 1];
                            cells += map[y - 1][x];
                        }
                    }

                    if (xMax) {
                        if (yMax) {
                            cells += map[0][x];
                            cells += map[0][0];
                        } else {
                            cells += map[y + 1][0];
                            cells += map[y + 1][x];
                        }
                        cells += map[y][0];
                        if (y0) {
                            cells += map[sHeight][0];
                        } else cells += map[y - 1][0];
                    } else {
                        if (yMax) {
                            cells += map[0][x];
                            cells += map[0][x + 1];
                        } else {
                            cells += map[y + 1][x];
                            cells += map[y + 1][x + 1];
                        }
                        cells += map[y][x + 1];
                        if (y0) {
                            cells += map[sHeight][x + 1];
                        } else cells += map[y - 1][x + 1];
                    }
                //>-----------------------------------------------<

                if(rules[cells]){
                    newMap[y][x] = 1;
                    if(map[y][x] != newMap[y][x])
                        data.drawCell(y,x);
                }else if(rules[cells + 8]) 
                    newMap[y][x] = map[y][x];
                else {
                    newMap[y][x] = 0;
                    if(map[y][x] != 0)
                        data.killCell(y,x);
                }

                scanMap[y][x] = 0;
            }
        }

        //SCAN FOR OPTI

        for (let y = 0; y < height; y++) {
            if (y == 0){
                y0 = true;
                yMax = false;
            }else{
                y0 = false;
                if (y == sHeight)yMax = true;
                else yMax = false;
            }

            for (let x = 0; x < width; x++) {
                if(map[y][x] == newMap[y][x]) continue;

                map[y][x] = newMap[y][x];// COPY ARR

                if (x == 0){
                    x0 = true;
                    xMax = false;
                }else{
                    x0 = false;
                    if (x == sWidth) xMax = true;
                    else xMax = false;
                }

                //>------------------<OPTIMIZED_SCAN>------------------<

                    if (x0) {
                        if (yMax) {
                            scanMap[sHeight][sWidth] = 1;
                        } else scanMap[y + 1][sWidth] = 1;
                        cells += scanMap[y][sWidth] = 1;
                        if (y0) {
                            scanMap[sHeight][x] = 1;
                            scanMap[sHeight][sWidth] = 1;
                        } else {
                            scanMap[y - 1][sWidth] = 1;
                            scanMap[y - 1][x] = 1;
                        }
                    } else {
                        if (yMax) {
                            scanMap[sHeight][x - 1] = 1;
                        } else scanMap[y + 1][x - 1] = 1;
                        scanMap[y][x - 1] = 1;
                        if (y0) {
                            scanMap[sHeight][x] = 1;
                            scanMap[sHeight][x - 1] = 1;
                        } else {
                            scanMap[y - 1][x - 1] = 1;
                            scanMap[y - 1][x] = 1;
                        }
                    }

                    if (xMax) {
                        if (yMax) {
                            scanMap[0][x] = 1;
                            scanMap[0][0] = 1;
                        } else {
                            scanMap[y + 1][0] = 1;
                            scanMap[y + 1][x] = 1;
                        }
                        scanMap[y][0] = 1;
                        if (y0) {
                            scanMap[sHeight][0] = 1;
                        } else scanMap[y - 1][0] = 1;
                    } else {
                        if (yMax) {
                            scanMap[0][x] = 1;
                            scanMap[0][x + 1] = 1;
                        } else {
                            scanMap[y + 1][x] = 1;
                            scanMap[y + 1][x + 1] = 1;
                        }
                        scanMap[y][x + 1] = 1;
                        if (y0) {
                            scanMap[sHeight][x + 1] = 1;
                        } else scanMap[y - 1][x + 1] = 1;
                    }
                //>-----------------------------------------------<
            }
        }
        //END SCAN
    }

    data.set();

    timer.stop(`interval`);

    if(timer.lastTime > 0)
        intervalTime = timer.lastTime * 1.3;
    if(intervalTime < minTime)
        intervalTime = minTime;

    /*if(debug){
        log(`Time for generation ${generation}: ${timer.get(`interval`) / 1000} sec.`);
        log(`intervalTime: ${intervalTime / 1000} sec.`);
        log(`>-----------------------`);
    };*/

    if(!(generation % 5)){
        $(`intervalTime`).innerHTML = intervalTime / 1000;
        $(`time`).innerHTML = timer.lastTime / 1000;
        $(`generation`).innerHTML = generation;
    };

    generation++;

    isStart = false;

    clearInterval(intervalID);
    intervalID = setInterval(start, intervalTime);
};

function restart(part = 1, parts = 6) {
    width = +$(`width`).value;
    height = +$(`height`).value;
    minTime = +$(`minTime`).value;
    pxlSize = +$(`pxlSize`).value;
    sWidth = width - 1;
    sHeight = height - 1;

    $(`generation`).innerHTML = null;

    canvas.width = width * pxlSize;
    canvas.height = height * pxlSize;
    generation = 0;

    intervalTime = 1000;

    ctx.fillStyle = 'rgb(0,0,0)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    map = new Array(height);
    newMap = new Array(height);
    scanMap = new Array(height);

    ctx.fillStyle = 'rgb(0,150,0)';
    for (let y = 0; y < height; y++){
        map[y] = new Array(width);
        newMap[y] = new Array(width);
        scanMap[y] = new Array(width);
        for (let x = 0; x < width; x++){
            if (rand(parts) <= part){
                ctx.fillRect(x * pxlSize, y * pxlSize, pxlSize, pxlSize);
                map[y][x] = 1;
            }
            else map[y][x] = 0;
            newMap[y][x] = map[y][x];
            scanMap[y][x] = 1;
        }
    }

    data.get();
};

function stop(){
    if (!intervalTime) return;
    clearInterval(intervalID);
    intervalStart = false;
};

function log(msg){
    console.log(msg)
};

function rand(a){return Math.round(.5+Math.random()*a)};//ВКЛЮЧАЕТ И МИНИМУМ, И МАКСИМУМ(ОТ 1 ВКЛЮЧИТЕЛЬНО)

function div(a,b){return(a-a%b)/b};

function $(id){return document.getElementById(id)};

function getWidth(e){
    let w = e.style.width;
    if(w in cache.getWidth){
        return cache.getWidth[w];
    }else{
        cache.getWidth[w] = +settings.style.width.split(`px`)[0];
        return cache.getWidth[w];
    }
};

function getHeight(e){
    let w = e.style.height;
    if(w in cache.getHeight){
        return cache.getHeight[w];
    }else{
        cache.getHeight[w] = +settings.style.height.split(`px`)[0];
        return cache.getHeight[w];
    }
}

// ИСПРАВИТЬ SWIDTH И SHEIGHT !!!
            /*SOURCE

            //UP
                //CENTER
                if (y0) {
                    cells += map[sHeight][x];
                } else cells += map[y - 1][x];

                //LEFT
                if (x0) {
                    if (y0) {
                        cells += map[sHeight][sWidth];
                    } else cells += map[y - 1][sWidth];
                } else {
                    if (y0) {
                        cells += map[sHeight][x - 1];
                    } else cells += map[y - 1][x - 1];
                }

                //RIGHT
                if (xMax) {
                    if (y0) {
                        cells += map[sHeight][0];
                    } else cells += map[y - 1][0];
                } else {
                    if (y0) {
                        cells += map[sHeight][x + 1];
                    } else cells += map[y - 1][x + 1];
                }
            //CENTER
                //RIGHT
                if (xMax) {
                    cells += map[y][0];
                } else cells += map[y][x + 1];

                //LEFT
                if (x0) {
                    cells += map[y][sWidth];
                } else cells += map[y][x - 1];
            //DOWN
                //CENTER
                if (yMax) {
                    cells += map[0][x];
                } else cells += map[y + 1][x];

                //LEFT
                if (x0) {
                    if (yMax) {
                        cells += map[sHeight][sWidth];
                    } else cells += map[y + 1][sWidth];
                } else {
                    if (yMax) {
                        cells += map[sHeight][x - 1];
                    } else cells += map[y + 1][x - 1];
                }
                //RIGHT
                if (xMax) {
                    if (yMax) {
                        cells += map[0][0];
                    } else cells += map[y + 1][0];
                } else {
                    if (yMax) {
                        cells += map[0][x + 1];
                    } else cells += map[y + 1][x + 1];
                }
*/