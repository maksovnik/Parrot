
const videoGrid = document.getElementById("video-grid");
const iceConfig = {
    iceServers: [{
        urls: 'stun:stun.l.google.com:19302'
    }]
}

peerA = window.location.hash;
document.getElementById('peer').innerHTML = window.location.hash ? "Peer A" : "Peer B"


function setRemoteID(){
    var sdp = JSON.parse(document.getElementById('otherID').value)
    console.log(sdp)
    connection.setRemoteDescription(sdp).then(a => console.log("Remote Description set"))
}


function setupChannel(channel){
    channel.onmessage = e => console.log("messsage received!!!" + e.data)
    channel.onopen = e => {
        console.log("Open!!!!");
        document.getElementById('status').innerHTML = "Status: Connected"

        const pair = connection.sctp.transport.iceTransport.getSelectedCandidatePair();
        console.log(pair.remote.type);
        open()

        

    }
    channel.onclose = e => console.log("closed!!!!!!");
}

async function generate() {
    
    connection = new RTCPeerConnection(iceConfig);
    var options = {};

    if(document.getElementById('camera').checked){
        console.log("Camera enabled")
        options["video"]=true;
    }
    
    if(document.getElementById('microphone').checked){
        console.log("Mic enabled")
        options["audio"]={
            autoGainControl: false,
            channelCount: 2,
            echoCancellation: false,
            latency: 0,
            noiseSuppression: false,
            sampleRate: 48000,
            sampleSize: 16,
            volume: 1.0
        };
    }

    camera = await navigator.mediaDevices.getUserMedia(options)

    if(document.getElementById('screen').checked){
        console.log("Screen enabled")
        const localStream = await navigator.mediaDevices.getDisplayMedia({audio: true, video: true})
        localStream.getTracks().forEach(track => {
            connection.addTrack(track,camera)
            console.log("Added track to connection")
        })
            
    }

    camera.getTracks().forEach(track => {
        console.log("Added track to connection")
        connection.addTrack(track,camera)
    })

    connection.onicecandidate = e => {
        var t = JSON.stringify(connection.localDescription)
        document.getElementById('myID').value = t;
        console.log("New ICE Candidate! SDP:")
    }


    remoteStream = new MediaStream()

    connection.ontrack = event => {
        console.log("Track Recieved!!")
        var video = document.createElement('video')
        var b = new MediaStream()
        b.addTrack(event.track)
        video.srcObject = b;
        video.controls = true;
        video.play();
        videoGrid.append(video)

    
    }




    if(peerA){
        const sendChannel = connection.createDataChannel("sendChannel");
        setupChannel(sendChannel)


        connection.createOffer().then(o => {
            connection.setLocalDescription(o)
            
            document.getElementById('connect').onclick = setRemoteID
        })

        

    }
    else{
        connection.ondatachannel = e => setupChannel(e.channel)
        setRemoteID();
        await connection.createAnswer().then(a => connection.setLocalDescription(a))
    }

    

}

function open(){



}

