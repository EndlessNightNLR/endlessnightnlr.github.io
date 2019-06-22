var canvas = document.getElementById('canvas');
var ctx = canvas.getContext('2d');
var map = new Array(canvas.width * canvas.height);
var generation = 0;
var width = 100;
var height = 100;
var pxlSize = 5;
var isStart = false;
var draw,timeStart,timeEnd;
var times = [];
borders = false;

canvas.width = width * pxlSize;
canvas.height = height * pxlSize;

ctx.fillStyle = 'rgb(0,0,0)';
ctx.fillRect(0,0,canvas.width,canvas.height);

for(let i = 0;i < map.length;i++)map[i] = !rand(0,2);

function start(){
	var newMap = new Array(map.length);

	switch(borders){
		case(true):
			break;
		case(false):
			if(isStart)break;
			isStart = true;

			draw = setInterval(function(){
				timeStart = new Date();
				timeStart = timeStart.getSeconds() + timeStart.getMilliseconds() / 1000;

				for(let i = 0;i < map.length;i++){
					let cells = 0;
					if (i >= canvas.width) { //Up
				    if (map[i - canvas.width] == true)cells++; //2
				    if (i % canvas.width) //Left
				        if (map[i - 1 - canvas.width] == true)cells++; //1
				    if ((i + 1) % canvas.width) //Right
				        if (map[i + 1 - canvas.width] == true)cells++; //3
					};

					if (i % canvas.width) //Left
					    if (map[i - 1] == true)cells++; //4
					if ((i + 1) % canvas.width) //Right
					    if (map[i + 1] == true)cells++; //5

					if (i < map.length - canvas.width) { //Down
					    if (map[i + canvas.width] == true)cells++; //7
					    if (i % canvas.width) //Left
					        if (map[i - 1 + canvas.width] == true)cells++; //6
					    if ((i + 1) % canvas.width) //Right
					        if (map[i + 1 + canvas.width] == true)cells++; //8

					}

					if(cells == 3)newMap[i] = true;
					else if(cells == 2)newMap[i] = map[i];
					else newMap[i] = false;
				};

				for(let i = 0;i < map.length;i++){
					if(newMap[i])ctx.fillStyle = 'rgb(0,150,0)';
					else ctx.fillStyle = 'rgb(0,0,0)';

					if(map[i] != newMap[i])ctx.fillRect((i % canvas.width) * pxlSize,div(i + 1,canvas.width) * pxlSize,pxlSize,pxlSize);

					map[i] = newMap[i];
				}

				timeEnd = new Date();
				timeEnd = timeEnd.getSeconds() + timeEnd.getMilliseconds() / 1000;
				times.push(timeEnd - timeStart);
				log(`Time for generation ${generation++}: ${times[times.length - 1]} sec.`);
			}, 200);

			log(draw);
			break;
	};
};

function stop(){
	if(!isStart)return;
	isStart = false;
	clearInterval(draw);

	let sum = 0;
	for(let i = 0;i < times.length;i++)sum += times[i];
	log(`Average generation time: ${sum/times.length}`);
	delete sum;
};

function log(msg){console.log(msg)};

function rand(a,b){return Math.round(a-.5+Math.random()*(b-a+1))};//ВКЛЮЧАЕТ И МИНИМУМ, И МАКСИМУМ

function div(a,b){return(a - (a % b))/b};

start();