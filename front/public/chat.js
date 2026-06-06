const WS_DOMAIN =
    (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
        ? 'ws://localhost:8080'
        : 'wss://onetimechat-ws.fly.dev';

const CMD_INIT = 'init';
const CMD_ADD = 'add';
const CMD_RM = 'rm';
const CMD_FETCH = 'fetch';

let DATA = {
    id: null,
    name: '',
    messages: [],
};

let socket = null;
const outbox = [];

function flushOutbox() {
    while (outbox.length > 0 && socket && socket.readyState === WebSocket.OPEN) {
        socket.send(outbox.shift());
    }
}

function setConnected(isOpen) {
    textInput.disabled = !isOpen;
    sendBtn.disabled = !isOpen;
    textInput.placeholder = isOpen ? '' : (socket ? 'reconnecting…' : 'connecting…');
    if (isOpen) textInput.focus();
}

// YIQ luminance — matches Qix color's isLight() threshold of 128
function isLight(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 >= 128;
}

// Build the full chat DOM and mount it into #root
const root = document.getElementById('root');

const chat = document.createElement('div');
chat.className = 'chat';

const layout = document.createElement('div');
layout.className = 'chat__layout';

const content = document.createElement('div');
content.className = 'chat__content';

const messagesEl = document.createElement('div');
messagesEl.className = 'messages';

const inputRow = document.createElement('div');
inputRow.className = 'input-message';

const textInput = document.createElement('input');
textInput.type = 'text';
textInput.className = 'input-message__text';
textInput.autofocus = true;

const sendBtn = document.createElement('button');
sendBtn.className = 'input-message__button';
sendBtn.textContent = 'Send';

inputRow.appendChild(textInput);
inputRow.appendChild(sendBtn);
content.appendChild(messagesEl);
content.appendChild(inputRow);
layout.appendChild(content);
chat.appendChild(layout);
root.appendChild(chat);

function render() {
    DATA.messages.sort((a, b) => a.timestamp - b.timestamp);

    // Capture scroll position before re-render
    const scrollBottom = messagesEl.scrollHeight - messagesEl.clientHeight;
    const atBottom = scrollBottom <= 0 || messagesEl.scrollTop === scrollBottom;

    messagesEl.replaceChildren(
        ...DATA.messages.map((msg) => {
            const color = '#' + msg.client_id.slice(0, 6);
            const msgEl = document.createElement('div');
            msgEl.className = 'message';

            const nickname = document.createElement('div');
            nickname.className = 'message__nickname';
            nickname.textContent = msg.name;
            nickname.style.color = color;
            if (isLight(color)) {
                nickname.style.backgroundColor = '#2e0000';
            }

            const text = document.createElement('div');
            text.className = 'message__text';
            text.textContent = msg.text;

            msgEl.appendChild(nickname);
            msgEl.appendChild(text);
            return msgEl;
        })
    );

    // Re-pin to bottom only if we were there before
    if (atBottom) {
        const maxScrollTop = messagesEl.scrollHeight - messagesEl.clientHeight;
        messagesEl.scrollTop = maxScrollTop > 0 ? maxScrollTop : 0;
    }
}

function sendMessage(text, message_id = null, timestamp = null) {
    if (text.length === 0) return;
    outbox.push(JSON.stringify(['send', DATA.id, DATA.name, text, message_id, timestamp]));
    flushOutbox();
}

function onSend() {
    sendMessage(textInput.value);
    textInput.value = '';
}

sendBtn.addEventListener('click', onSend);
textInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') onSend();
});

function startSocket(uri) {
    const ws = new WebSocket(uri);
    socket = ws;

    ws.onopen = () => {
        console.log('opened');
        setConnected(true);
        flushOutbox();
    };

    ws.onclose = () => {
        setConnected(false);
        setTimeout(() => startSocket(uri), 500);
    };

    ws.onmessage = (event) => {
        const [cmd, ...params] = JSON.parse(event.data);
        console.log('message', cmd, params);

        switch (cmd) {
            case CMD_INIT:
                DATA.id = params[0];
                DATA.name = params[1];
                break;

            case CMD_ADD: {
                const alreadyExists = DATA.messages.some(m => m.id === params[3]);
                if (!alreadyExists) {
                    DATA.messages.push({
                        client_id: params[0],
                        name: params[1],
                        text: params[2],
                        id: params[3],
                        timestamp: params[4],
                    });
                }
                render();
                break;
            }

            case CMD_RM:
                DATA.messages = DATA.messages.filter(m => m.client_id !== params[0]);
                render();
                break;

            case CMD_FETCH:
                for (const msg of DATA.messages) {
                    if (msg.client_id === DATA.id) {
                        sendMessage(msg.text, msg.id, msg.timestamp);
                    }
                }
                break;

            default:
                break;
        }
    };

    ws.onerror = (event) => console.error('error', event);
}

setConnected(false);
startSocket(WS_DOMAIN);
