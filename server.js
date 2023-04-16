const express = require('express');
const path = require('path');

const app = express();


app.use(express.static(__dirname + '/public'));

app.get('/', (req, res) => {
  res.sendFile('views/index.html', {root: __dirname });
});

app.listen(process.env.PORT || 5000, () => {
  console.log('Server listening on port 3000');
});