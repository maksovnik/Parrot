const express = require('express');
const path = require('path');
const WebSocket = require('ws');

const app = express();

app.use(express.static(__dirname + '/public'));

app.get('/', (req, res) => {
  res.sendFile('views/index.html', {root: __dirname });
});


var server = app.listen(process.env.PORT || 5000, () => {
  console.log('Server listening on port 3000');
});

const wss = new WebSocket.Server({server:server})

var waitingRoom = {}


wss.on('connection', ws => {
  console.log('Client connected');

  ws.on('message', data => {

    message = JSON.parse(data.toString())
    console.log("Message received of time "+ message.type)
    
    if(message['type']=='joinRoom'){
      ws.room = message['room']
      ws.sdp = message['sdp']

      if(ws.room in waitingRoom){
        ws.friend = waitingRoom[ws.room]
        waitingRoom[ws.room].friend = ws
        waitingRoom[ws.room].send(JSON.stringify({"type":"roomFull"}))
        delete waitingRoom[ws.room]
      }
      else{
        waitingRoom[ws.room] = ws
      }

      ws.send(JSON.stringify({type:"joined"}))
    }

    if(['answer','offer'].includes(message['type'])){
      ws.friend.send(data.toString())
      console.log("Sending answer")
    }
  });

  ws.on('close', function close() {
    console.log('Client disconnected');
    delete waitingRoom[ws.room]
  });
  
});