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

var rooms = {}
var userID = 0
var sockMapping = {}


wss.on('connection', function connection(ws) {
  console.log('Client connected');
  sockMapping[userID] = ws
  ws.userID = userID
  userID++;

  ws.on('message', function incoming(message) {

    q = JSON.parse(message.toString())
    console.log("Message received of time "+ q.type)

    if(q['type']=='offer'){
      rooms[ws.room].forEach(id =>{
        if(id!=ws.userID){
          sockMapping[id].send(message.toString())
        }
      })
    }
    
    if(q['type']=='answer'){
      ws.sdp = q
      sockMapping[rooms[ws.room][0]].send(JSON.stringify(q))
      console.log("Sending answer")

    }

    if(q['type']=='joinRoom'){
      ws.room = q['room']
      ws.sdp = q['sdp']
      console.log(q)
      if(ws.room in rooms){
        rooms[ws.room].push(ws.userID)

        if(rooms[ws.room].length==2){
          sockMapping[rooms[ws.room][0]].send(JSON.stringify({"type":"roomFull"}))
          console.log("Informing user that room is full")
        }
        
      }
      else rooms[ws.room] = [ws.userID]

      console.log("User " + userID + " joined "+ws.room)
      ws.send(JSON.stringify({type:"joined"}))
    }


  });

  ws.on('close', function close() {
    console.log('Client disconnected');
    rooms[ws.room].splice(rooms[ws.room].indexOf(ws.userID), 1);


  });
  
});



