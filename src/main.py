import asyncio
from dataclasses import dataclass
import logging
import os
import signal
import time
import uuid

import aiojobs
import names
import ujson as json
import uvloop
import websockets

uvloop.install()

DEBUG = bool(int(os.getenv('DEBUG', 0)))

CMD_INIT = 'init'
CMD_FETCH = 'fetch'
CMD_RM = 'rm'
CMD_SEND = 'send'
CMD_ADD = 'add'

logger = logging.getLogger('websockets')
log_level = logging.INFO

if DEBUG:
    log_level = logging.DEBUG

logger.setLevel(log_level)
logger.addHandler(logging.StreamHandler())


@dataclass
class Client:
    __slots__ = 'id', 'name', 'ws'  # ~9% perfomance gain

    id: str
    name: str
    ws: websockets.WebSocketServerProtocol


class CommandQueue(asyncio.Queue):
    async def put(self, cmd, *params):
        return await super().put((cmd, *params))


queue = CommandQueue()
clients = {}
to_remove = set()


async def send_data(client, data):
    try:
        await client.ws.send(data)
    except websockets.ConnectionClosed:
        # Remove client if connection is closed
        if client.id not in to_remove:
            to_remove.add(client.id)
            await queue.put(CMD_RM, client.id)


async def worker():
    logger.debug('worker started')
    while True:
        cmd, *params = await queue.get()
        if cmd is None:
            break

        if cmd == CMD_RM and params[0] in clients:
            del clients[params[0]]
            to_remove.discard(params[0])

        for client in clients.values():
            asyncio.create_task(send_data(client, json.dumps((cmd, *params))))


def load_message(message):
    try:
        cmd, *params = json.loads(message)
    except ValueError:
        # In case of CMD_FETCH
        cmd = message
        params = []

    if cmd == CMD_SEND:
        # Convert CMD_SEND to CMD_ADD command with new UUID and timestamp, if needed
        cmd = CMD_ADD
        if params[3] is None:
            params[3] = uuid.uuid4().hex
            params[4] = int(time.time())

    return cmd, params


async def chat(websocket, path):
    client_id = uuid.uuid4().hex
    name = names.get_full_name()

    client = Client(client_id, name, websocket)
    clients[client_id] = client

    await websocket.send(json.dumps((CMD_INIT, client_id, name)))
    await queue.put(CMD_FETCH)

    try:
        async for message in websocket:
            cmd, params = load_message(message)
            await queue.put(cmd, *params)

    except websockets.ConnectionClosed as e:
        logger.exception('Connection closed: %r' % e, exc_info=e)

    if client_id not in to_remove:
        to_remove.add(client_id)
        await queue.put(CMD_RM, client_id)


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
