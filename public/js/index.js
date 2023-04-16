var standard = "wss"


function switchDisplay() {
	document.getElementById("call").style.display = '';
	document.getElementById("setup").style.display = 'none';
    console.log("Display Switching")
}

function connect(){
    var roomID = document.getElementById("room").value
    var socket = new WebSocket(standard + '://' + location.host);

    socket.addEventListener('open', function(event) {
        console.log('WebSocket connection opened');
        console.log(roomID)
        socket.addEventListener('message', function(event) {
            q = JSON.parse(event.data.toString())
            if(q.status=="good"){
                switchDisplay()
            }
            console.log(q)
        });

        socket.send(JSON.stringify({type:"joinRoom",room:roomID}))
      });

    socket.addEventListener("error", (event) => {
        standard = "ws"
        connect()
    });

    socket.addEventListener("error", (event) => {
        standard = "ws"
        connect()
    });




}