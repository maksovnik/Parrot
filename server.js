const express = require('express');
const path = require('path');
const WebSocket = require('ws');
var fs = require('fs');

const app = express();


app.use(express.static(__dirname + '/public'));

app.get('/', (req, res) => {
  res.sendFile('views/index.html', {root: __dirname });
});

app.get('/room/*', (req, res) => {
  var room = req.params[0];
  res.send("hi")
  console.log(q)
});

var server = app.listen(process.env.PORT || 5000, () => {
  console.log('Server listening on port 3000');
});




const wss = new WebSocket.Server({server:server})

var roomDetails = {}
var userID = 0
var userMapping = {}

wss.on('connection', function connection(ws) {
  console.log('Client connected');
  userMapping[ws] = userID
  ws.userID = userID
  userID++;

  ws.on('message', function incoming(message) {

    q = JSON.parse(message.toString())

    console.log(q)
    if(q['type']=='joinRoom'){
      var room = q['room']
      console.log("User attempted to join "+room)

      if(room in roomDetails){
        roomDetails[room].push(ws.userID)
      }
      else{
        roomDetails[room] = [ws.userID]
      }
      
      ws.send(JSON.stringify({status:"good"}))
    }
    

    console.log(roomDetails)

  });

  ws.on('close', function close() {
    console.log('Client disconnected');

  });
  
});



