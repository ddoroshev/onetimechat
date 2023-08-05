# One Time Chat: An Ephemeral Real-Time Chat Platform

Welcome to One Time Chat, a unique and privacy-focused chat platform that keeps the conversation right where it should be - between the participants! This application is perfect for those who value real-time interaction and data privacy. Check it out live at https://chat.doroshev.com.

One Time Chat operates on an ephemeral messaging system, meaning your messages only exist as long as you're connected. Once you close the browser, your messages vanish, leaving no trace behind. It does't use any databases or persistent storage - all messages are stored directly in your browser!

## Features:
- **Real-Time Interaction:** One Time Chat operates on a real-time messaging system, ensuring your conversations are smooth and instantaneous.
- **Privacy-Preserving:** Messages are not stored on any server or database; they're stored directly in your browser.
- **Ephemeral Messaging:** Messages disappear once the user disconnects. Perfect for one-time, private conversations.

## Message Structure:

One Time Chat operates on a command-based messaging system, where commands are sent in a structured format:

`[<command>, [param1, param2, ...]]`

## Client-to-Server Commands:

- `[send, <id>, {...}]` - Send a new message.

## Server-to-Clients Commands:

- `[init, <id>]` - Initialize a client with a new `id`.
- `[add, <id>, <message>]` - Add a new message from a client with id=`<id>`.
- `[rm, <id>]` - Remove all messages from a client with id=`<id>`.
- `[fetch]` - Fetch all messages from the client.

## Getting Started:

To participate in a One Time Chat, simply visit the [website](https://chat.doroshev.com) and start chatting! Remember, messages are ephemeral and will disappear once you close the browser.

For developers interested in the source code, feel free to explore this repository. To run this project locally, you need to have Node.js (for the front-end) and Python 3.11+ (for the back-end) installed.

## License:

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
