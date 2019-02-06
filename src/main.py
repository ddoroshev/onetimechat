import asyncio
from dataclasses import dataclass
import ujson as json
import logging
import os
import signal
import time
import uuid

import aiojobs
import names
import websockets

DEBUG = bool(int(os.getenv('DEBUG', 0)))

logger = logging.getLogger('websockets')
logger.setLevel(logging.INFO)
logger.addHandler(logging.StreamHandler())


@dataclass
class Client:
    __slots__ = 'id', 'name', 'ws'

    id: str
    name: str
    ws: websockets.WebSocketServerProtocol


class CommandQueue(asyncio.Queue):
    async def put(self, cmd, *params):
        print(cmd, params)
        return await super().put((cmd, *params))


queue = CommandQueue()
clients = dict()


async def worker():
    logger.debug('worker started')
    while True:
        cmd, *params = await queue.get()
        if cmd is None:
            break

        print('COMMAND', cmd, params)
        if cmd == 'rm' and params[0] in clients:
            del clients[params[0]]

        for client in clients.values():
            try:
                await client.ws.send(json.dumps((cmd, *params)))
            except websockets.ConnectionClosed:
                await queue.put('rm', client._id)


async def chat(websocket, path):
    client_id = uuid.uuid4().hex
    name = names.get_full_name()

    client = Client(client_id, name, websocket)
    clients[client_id] = client

    await websocket.send(json.dumps(('init', client_id, name)))
    await queue.put('fetch')

    try:
        async for message in websocket:
            try:
                cmd, *params = json.loads(message)
            except ValueError:
                cmd = message
                params = []

            if cmd == 'send':
                cmd = 'add'
                if params[3] is None:
                    params[3] = uuid.uuid4().hex
                    params[4] = int(time.time())

            await queue.put(cmd, *params)
    except websockets.ConnectionClosed:
        pass

    print('ws connection closed')
    await queue.put('rm', client_id)


async def server(stop, host='0.0.0.0', port=8080):
    scheduler = await aiojobs.create_scheduler()
    await scheduler.spawn(worker())

    async with websockets.serve(chat, host, port, ping_interval=20):
        logger.debug('server started')
        await stop

    await queue.put(None)
    await scheduler.close()


loop = asyncio.get_event_loop()

if DEBUG:
    import aiohttp_autoreload
    aiohttp_autoreload.start(loop, 1)

stop = asyncio.Future()
loop.add_signal_handler(signal.SIGTERM, stop.set_result, None)
loop.run_until_complete(server(stop))
