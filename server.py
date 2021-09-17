import asyncio
import websockets
import json

listeners = []
idToID = {}
idToSocket = {}
idNum = 0

async def send(message,connectionID):
    socket = idToSocket[connectionID]
    await socket.send(json.dumps(message))

async def handler(websocket, path):

    global idNum
    idNum+=1
    
    connectionID = idNum
    idToSocket[connectionID] = websocket
    async for message in websocket:

        print(listeners)
        print(idToID)
        message= json.loads(message)
        action = message['action']
        if action == 'signal':
            print("Recieved SDP")
            offer = message['msg']

            await send(offer,idToID[connectionID])

        elif action == 'joinRoom':
            print(message)
            room = message['msg']['room']

            x=False
            for i in range(len(listeners)):
                x= await listeners[i](room,connectionID)
                if x:
                    listeners.pop(i)
                    x=True

            
            async def d(newRoom,id):
                if room == newRoom:
                    print("Binding established")
                    idToID[id]=connectionID
                    idToID[connectionID]=id

                    await send({"message":"roomJoined","order":1},connectionID)
                    await send({"message":"roomJoined","order":2},idToID[connectionID])

                    return True
                return False

            if x==False:
                listeners.append(d)



start_server = websockets.serve(handler,'localhost', 8765)

asyncio.get_event_loop().run_until_complete(start_server)
asyncio.get_event_loop().run_forever()

