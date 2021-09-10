


var myID= document.getElementById('myID')
document.getElementById('generate').addEventListener('click', function () {
    console.log("Pressed")
    localConnection = new RTCPeerConnection()
    

    localConnection.onicecandidate = e =>  {
    console.log(" NEW ice candidnat!! on localconnection reprinting SDP " )
    console.log(JSON.stringify(localConnection.localDescription))
    }


    const sendChannel = localConnection.createDataChannel("sendChannel");
    sendChannel.onmessage =e =>  console.log("messsage received!!!"  + e.data )
    sendChannel.onopen = e => console.log("open!!!!");
        sendChannel.onclose =e => console.log("closed!!!!!!");


    localConnection.createOffer().then(o => {
        localConnection.setLocalDescription(o)
        myID.value = JSON.stringify(o);


        console.log("Hi")
        
        document.getElementById('connect').addEventListener('click', async function () {
            var answer = JSON.parse(document.getElementById('otherID').value)
            console.log(answer)
            localConnection.setRemoteDescription(answer).then(a=>console.log("done"))
        })

    })


})

