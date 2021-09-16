const videoGrid = document.getElementById("video-grid");
const iceConfig = {
    iceServers: [{
        urls: 'stun:stun.l.google.com:19302'
    }]
}
var connection;
var sock

peerA = window.location.hash;
document.title = window.location.hash ? "Parrot - Peer A" : "Parrot - Peer B"


const id2content = {};
const remoteStreams = []

function setupsock() {



    sock.addEventListener('close', e => console.log('Socket is closed'))

    sock.addEventListener('error', e => console.error('Socket is in error', e))

    sock.addEventListener('message', e => {
        try{
            data=JSON.parse(e.data)
            console.log('New Message:', data)
            if(data.error=="room taken"){
                sock.close()
                connection.close();
            }
        }
        catch(e){
            console.log('New Message:', e.data)
        }
        
    })

}

function send(msg, type) {
    if(sock.readyState!=WebSocket.OPEN){
        return;
    }
    console.log("Sending:"+msg)
    const payload = {
        action: type,
        msg
    }
    sock.send(JSON.stringify(payload))
}


function hideBox() {
    document.getElementById("setup").style.visibility = "hidden";
}
async function generate() {

   var room = document.getElementById('room').value



    sock = new WebSocket('wss://br5co6ogz2.execute-api.eu-west-3.amazonaws.com/production')
    setupsock()
    sock.addEventListener('open', async e => {
        console.log('Socket is connected')

        send({'room':room},"joinRoom");

        hideBox()
        connection = new RTCPeerConnection(iceConfig);
        var options = {};

        if (document.getElementById('camera').checked) {
            console.log("Camera enabled")
            options["video"] = true;
        }

        if (document.getElementById('microphone').checked) {
            console.log("Mic enabled")
            options["audio"] = {
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

        addStream(camera,true)
        id2content[camera.id] = 'webcam'
        camera.getTracks().forEach(track => {
            console.log("Added Camera track to connection")
            connection.addTrack(track,camera)
        
        })

        if (document.getElementById('screen').checked) {
            console.log("Screen enabled")
            const localStream = await navigator.mediaDevices.getDisplayMedia({
                audio: true,
                video: true
            })

            id2content[localStream.id] = 'screen'
            localStream.getTracks().forEach(track => {
                console.log("Added Stream track to connection")
                connection.addTrack(track,localStream)
            })
        }


        connection.onconnectionstatechange = e=>{
            if(connection.connectionState == 'connected'){
                console.log("Connected")
            }
        }

        connection.onicecandidate = e => {
            console.log("New ICE Candidate!")
        }

        connection.onicegatheringstatechange = e => {
            if (connection.iceGatheringState == 'complete') {
                console.log("Ice Gathering complete")
                var t = connection.localDescription
                var p = t.toJSON()
                p["meta"] = id2content;
                console.log(p)
                if(peerA){
                    send(p, 'sendOffer')
                }
                else{
                    send(p, 'sendAnswer')
                }
                
            }
        }


        connection.ontrack = event => {
            var track = event.track;
            var stream = event.streams[0]
            
            if (remoteStreams.indexOf(stream) === -1){
                remoteStreams.push(stream);
                addStream(stream)
            }

            stream.addTrack(track);
        }


        
        if(peerA){
            connection.setLocalDescription()
        }
        else{
            send({},'getOffer')
        }
        

        sock.addEventListener('message', async e => {
            var s = JSON.parse(e.data)
            console.log("HERE:"+JSON.stringify(s))
            if(s.type=='offer'||s.type=='answer'){
                connection.setRemoteDescription(s).then(a => console.log("Remote Description set")) 

                if(!peerA){
                    connection.setLocalDescription()
                }
            }
            

            
        })


    })

}

function addStream(stream, muted) {
    var video = document.createElement('video')

    video.srcObject = stream;
    video.controls = true;

    if (muted) {
        video.muted = true;
    }

    video.play();

    videoGrid.append(video)
}