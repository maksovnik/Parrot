const videoGrid = document.getElementById("video-grid");
const iceConfig = {
    iceServers: [{
        urls: 'stun:stun.l.google.com:19302'
    }]
}
var connection;

var socket

var Ctype;



peerA = window.location.hash;
document.title = window.location.hash ? "Parrot - Peer A" : "Parrot - Peer B"


const id2content = {};

const remoteStreams = []

function setupSocket() {



    socket.addEventListener('close', e => console.log('WebSocket is closed'))

    socket.addEventListener('error', e => console.error('WebSocket is in error', e))

    socket.addEventListener('message', e => {
        try{
            data=JSON.parse(e.data)
            console.log('New Message:', data)
            if(data.error=="room taken"){
                socket.close()
                connection.close();
            }
        }
        catch(e){
            console.log('New Message:', e.data)
        }
        
    })

}

function send(msg, type) {
    if(socket.readyState!=WebSocket.OPEN){
        return;
    }
    console.log("Sending:"+msg)
    const payload = {
        action: type,
        msg
    }
    socket.send(JSON.stringify(payload))
}


// function setRemoteID(){
//     var sdp = JSON.parse(document.getElementById('otherID').value)
//     connection.setRemoteDescription(sdp).then(a => console.log("Remote Description set"))
// }


function setupChannel(channel) {
    channel.onmessage = e => console.log("messsage received!!!" + e.data)
    channel.onopen = e => {
        console.log("Open!!!!");

        const pair = connection.sctp.transport.iceTransport.getSelectedCandidatePair();
        console.log(pair.remote.type);

    }
    channel.onclose = e => console.log("closed!!!!!!");
}

function hideBox() {
    document.getElementById("callSetup").style.visibility = "hidden";
}
async function generate() {

   var room = document.getElementById('room').value



    socket = new WebSocket('wss://br5co6ogz2.execute-api.eu-west-3.amazonaws.com/production')
    setupSocket()
    socket.addEventListener('open', async e => {
        console.log('WebSocket is connected')

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

        id2content[camera.id] = 'webcam'
        camera.getTracks().forEach(track => {
            console.log("Added Camera track to connection")
            connection.addTrack(track,camera)
            
            //addTrack(track, true)
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
                //addTrack(track, true);
            })
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
                send(p, Ctype)
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




        if (peerA) {

            Ctype = "sendOffer";
            const sendChannel = connection.createDataChannel("sendChannel");
            setupChannel(sendChannel)


            connection.createOffer().then(o => {
                
                socket.addEventListener('message', e => {
                    var s = JSON.parse(e.data)
                    console.log(s);
                    if(s.type=='answer'){
                        connection.setRemoteDescription(s).then(a => console.log("Remote Description set"))
                    }
                    
                })

                connection.setLocalDescription(o)

                const msids = o.sdp.split('\n')
                .map(l => l.trim())
                .filter(l => l.startsWith('a=msid:'));
                console.log('offer msids', msids);
            })


        } else {

            send({},'getOffer')

            Ctype = "sendAnswer";
            connection.ondatachannel = e => setupChannel(e.channel)
            //setRemoteID();

            socket.addEventListener('message', async e => {
                sdp = JSON.parse(e.data)
                if(sdp.type=='offer'){
                    connection.setRemoteDescription(sdp).then(a => console.log("Remote Description set"))
                    await connection.createAnswer().then(a => {
                        connection.setLocalDescription(a)
                        //send(a, Ctype);
                    })
                }

            })


        }

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