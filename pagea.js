

const iceConfiguration = {
    iceServers: [
        {
            urls: 'stun:stun.l.google.com:19302'
        }
    ]
}



async function generate(){
    localConnection = new RTCPeerConnection(iceConfiguration); 
    
    // here
    camera = await navigator.mediaDevices.getUserMedia({video: true,audio: {
        autoGainControl: false,
        channelCount: 2,
        echoCancellation: false,
        latency: 0,
        noiseSuppression: false,
        sampleRate: 48000,
        sampleSize: 16,
        volume: 1.0
    }})

    
    localConnection.onicecandidate = e =>  {
        console.log("New ICE Candidate!! SDP " )
        var t = JSON.stringify(localConnection.localDescription)
        console.log(t)
        document.getElementById('myID').value = t;
    }


    const sendChannel = localConnection.createDataChannel("sendChannel");
    sendChannel.onmessage =e =>  console.log("messsage received!!!"  + e.data )
    sendChannel.onopen = e => {
        console.log("open!!!!");
        document.getElementById('status').innerHTML = "Status: Connected"

        const pair = localConnection.sctp.transport.iceTransport.getSelectedCandidatePair();
        console.log(pair.remote.type);

    }
        sendChannel.onclose =e => console.log("closed!!!!!!");

    //here
    camera.getTracks().forEach(track => {
        console.log("Added")
        localConnection.addTrack(track,camera)
    })

    
    localConnection.createOffer().then(o => {
        localConnection.setLocalDescription(o)
        

        
        document.getElementById('connect').addEventListener('click', async function () {
            var answer = JSON.parse(document.getElementById('otherID').value)
            console.log(answer)
            localConnection.setRemoteDescription(answer).then(a=>console.log("done"), a => console.log(a))
        })
        

    })


}

