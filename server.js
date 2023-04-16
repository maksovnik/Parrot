const express = require('express');
const path = require('path');
const WebSocket = require('ws');

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

wss.on('connection', function connection(ws) {
  console.log('Client connected');
  // Handle WebSocket events here
});

wss.on('message', function incoming(message) {
  console.log('Received message:', message);
  // Handle incoming message here
});

wss.on('close', function close() {
  console.log('Client disconnected');
  // Handle disconnection here
});
