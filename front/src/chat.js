import React, {Component} from 'react';
import * as ReactDOM from 'react-dom';
import Color from 'color';

import './chat.css';

let DATA = {
    id: null,
    name: '',
    messages: [],
};

const REACT_APP_WS_DOMAIN = process.env.REACT_APP_WS_DOMAIN || 'wss://ws.chat.doroshev.com';

const CMD_INIT = 'init';
const CMD_ADD = 'add';
const CMD_RM = 'rm';
const CMD_FETCH = 'fetch';

const Message = ({message}) => {
    let strColor = '#' + message.client_id.substr(0, 6);

    let style = {
        color: strColor,
    };

    let color = new Color(strColor);
    if (color.isLight()) {
        style.backgroundColor = '#2e0000';
    }
    return (
        <div className="message">
            <div
                className="message__nickname"
                style={style}
            >{message.name}</div>
            <div className="message__text">{message.text}</div>
        </div>
    );
};

const InputMessage = ({onSend}) => {
    let messageRef = React.createRef();

    const onClick = () => {
        onSend(messageRef.current.value);
        messageRef.current.value = '';
    };

    const onKeyPress = (e) => {
        if (e.key === 'Enter') {
            onClick();
        }
    };

    return (
        <div className="input-message">
            <input
                type="text"
                className="input-message__text"
                onKeyPress={onKeyPress}
                ref={messageRef}
            />
            <button
                className="input-message__button"
                onClick={onClick}
            >Send
            </button>
        </div>
    );
};

class Messages extends Component {
    componentDidUpdate() {
        if (this.scrollAtBottom) {
            this.scrollToBottom();
        }
    }

    componentWillUpdate(nextProps) {
        const historyChanged = nextProps.lastMessageId !== this.props.lastMessageId;
        if (historyChanged) {
            const {messages} = this.refs;
            const scrollPos = messages.scrollTop;
            const scrollBottom = messages.scrollHeight - messages.clientHeight;
            this.scrollAtBottom = scrollBottom <= 0 || scrollPos === scrollBottom;
        }
    }

    scrollToBottom() {
        const {messages} = this.refs;
        const scrollHeight = messages.scrollHeight;
        const height = messages.clientHeight;
        const maxScrollTop = scrollHeight - height;

        ReactDOM.findDOMNode(messages).scrollTop = maxScrollTop > 0 ? maxScrollTop : 0;
    }

    render() {
        return (
            <div className="messages" ref='messages'>
                {this.props.messages.map((message, i) => <Message key={i} message={message}/>)}
            </div>
        );
    }
}

class Chat extends Component {
    constructor(props) {
        super(props);

        this.startSocket(REACT_APP_WS_DOMAIN);

        this.state = {
            lastMessageId: 0,
        }
    }

    startSocket(uri) {
        let socket = new WebSocket(uri);

        socket.onopen = (event) => {
            console.log('opened', event);
            this.socket = socket;
        };
        socket.onclose = () => {
            setTimeout(() => {
                this.socket = this.startSocket(uri)
            }, 500);
        };
        socket.onmessage = (event) => {
            console.log('message', event);

            let [cmd, ...params] = JSON.parse(event.data);

            switch (cmd) {
                case CMD_INIT:
                    DATA.id = params[0];
                    DATA.name = params[1];
                    break;

                case CMD_ADD:
                    let send = true;
                    console.log('fetching', params[3]);

                    for (let i in DATA.messages) {
                        if (DATA.messages[i].id === params[3]) {
                            send = false;
                            console.log('not send')
                        }
                    }
                    if (send) {
                        DATA.messages.push({
                            client_id: params[0],
                            name: params[1],
                            text: params[2],
                            id: params[3],
                            timestamp: params[4],
                        });
                    }
                    break;

                case CMD_RM:
                    DATA.messages = DATA.messages.filter(msg => msg.client_id !== params[0]);
                    break;

                case CMD_FETCH:
                    for (let i in DATA.messages) {
                        let message = DATA.messages[i];
                        console.log(message.client_id, DATA.id);
                        if (message.client_id === DATA.id) {
                            this.sendMessage(message.text, message.id, message.timestamp);
                        }
                    }
                    break;

                default:
                    break;
            }
            this.setState({
                lastMessageId: DATA.messages.length,
            });

        };
        socket.onerror = (event) => {
            console.log('error', event);
        };

        return socket;
    }

    sendMessage(message, message_id = null, timestamp = null) {
        if (message.length === 0) {
            return;
        }
        this.socket.send(JSON.stringify(['send', DATA.id, DATA.name, message, message_id, timestamp]));
    }

    render() {
        DATA.messages.sort((a, b) => (a.timestamp - b.timestamp));
        return (
            <div className="chat">
                <div className="chat__layout">
                    <div className="chat__content">
                        <Messages messages={DATA.messages} lastMessageId={this.state.lastMessageId}/>
                        <InputMessage onSend={this.sendMessage.bind(this)}/>
                    </div>
                </div>
            </div>
        );
    }
}

export default Chat;
