{
let message = document.createElement('div'),
    msgTimeoutId = null,
    msgIntervalId = null;
message.style = 'background-color: rgba(0, 0, 0, 0); color: rgba(150, 250, 150, 0); display: none; position: absolute; width: auto; height: 20px; right: 50%; top: 3.75em; text-align: center; line-height: 20px; vertical-align: middle; border-radius: 6px;padding:7px;';

document.body.appendChild(message);

function showMsg(msg) {
    if($('message')) $('message').remove();
    if(msgIntervalId !== null) clearInterval(msgIntervalId);
    if(msgTimeoutId !== null) clearTimeout(msgTimeoutId);
    message.style.display = 'block';
    message.innerText = msg;
    let a = 0.8;
    message.style.color = `rgba(250, 250, 250, 0.8)`;
    message.style.backgroundColor = `rgba(0, 0, 0, 0.8)`;
    msgTimeoutId = setTimeout(() => msgIntervalId = setInterval(() => {
            a -= 0.03;
            if(a <= 0){
                message.style.display = 'none';
                if(msgIntervalId !== null) clearInterval(msgIntervalId);
                return;
            };
            message.style.color = `rgba(250, 250, 250, ${a})`;
            message.style.backgroundColor = `rgba(0, 0, 0, ${a})`;
        },40)
    ,4000);
    return msg;
};

showMsg('Press F to pay respect');
};
