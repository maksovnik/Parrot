function connect(){
    var roomID = document.getElementById("room").value
    console.log("Hey "+roomID)

    var url = window.location.href
    var socket = new WebSocket('wss://' + location.host);
}