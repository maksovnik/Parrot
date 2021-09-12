var myID= document.getElementById('myID')
const iceConfiguration = {
    iceServers: [
        {
            urls: 'stun:stun.l.google.com:19302'
        }
    ]
}

async function generate(){
    localConnection = new RTCPeerConnection(iceConfiguration); 


    // camera = await navigator.mediaDevices.getUserMedia({video: true,audio: true})


    localConnection.onicecandidate = e =>  {
        console.log("New ICE Candidate!! SDP " )
        //console.log(JSON.stringify(localConnection.localDescription))
    }


    const sendChannel = localConnection.createDataChannel("sendChannel");
    sendChannel.onmessage =e =>  console.log("messsage received!!!"  + e.data )
    sendChannel.onopen = e => console.log("open!!!!");
        sendChannel.onclose =e => console.log("closed!!!!!!");

    // camera.getTracks().forEach(track => {
    //     console.log("Added")
    //     localConnection.addTrack(track,camera)
    // })

    
    localConnection.createOffer().then(o => {
        localConnection.setLocalDescription(o)
        myID.value = JSON.stringify(o);

        
        document.getElementById('connect').addEventListener('click', async function () {
            var answer = JSON.parse(document.getElementById('otherID').value)
            console.log(answer)
            localConnection.setRemoteDescription(answer).then(a=>console.log("done"))
        })

    })


}

