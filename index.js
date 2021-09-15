const videoGrid = document.getElementById("video-grid");
const iceConfig = {
    iceServers: [{
        urls: 'stun:stun.l.google.com:19302'
    }]
}


var socket

var Ctype;



peerA = window.location.hash;
document.title = window.location.hash ? "Parrot - Peer A" : "Parrot - Peer B"



function setupSocket() {



    socket.addEventListener('close', e => console.log('WebSocket is closed'))

    socket.addEventListener('error', e => console.error('WebSocket is in error', e))

    socket.addEventListener('message', e => {
        try{
            console.log('New Message:', JSON.parse(e.data))
        }
        catch(e){
            console.log('New Message:', e.data)
        }
        
    })

}

function send(msg, type) {
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
        open()

    }
    channel.onclose = e => console.log("closed!!!!!!");
}

function hideBox() {
    document.getElementById("callSetup").style.visibility = "hidden";
}
async function generate() {

   //var room = document.getElementById('room').value



    socket = new WebSocket('wss://br5co6ogz2.execute-api.eu-west-3.amazonaws.com/production')
    setupSocket()
    socket.addEventListener('open', async e => {
        console.log('WebSocket is connected')

        //sendRoom(room);

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

        const tracks = [];
        camera = await navigator.mediaDevices.getUserMedia(options)

        camera.getTracks().forEach(track => tracks.push(track))

        if (document.getElementById('screen').checked) {
            console.log("Screen enabled")
            const localStream = await navigator.mediaDevices.getDisplayMedia({
                audio: true,
                video: true
            })
            localStream.getTracks().forEach(track => tracks.push(track))
        }



        tracks.forEach(track => {
            connection.addTrack(track)
            console.log("Added track to connection. Type:" + track.kind )
            addTrack(track, true)
        })


        connection.onicecandidate = e => {
            console.log("New ICE Candidate!")
        }

        connection.onicegatheringstatechange = e => {
            if (connection.iceGatheringState == 'complete') {
                console.log("Ice Gathering complete")
                var t = connection.localDescription
                send(t, Ctype)
            }
        }


        connection.ontrack = event => {
            console.log("Track Recieved!! Type:" + event.track.kind)
            addTrack(event.track, false)
        }




        if (peerA) {

            Ctype = "sendOffer";
            const sendChannel = connection.createDataChannel("sendChannel");
            setupChannel(sendChannel)


            connection.createOffer().then(o => {
                socket.addEventListener('message', e => {
                    connection.setRemoteDescription(JSON.parse(e.data)).then(a => console.log("Remote Description set"))
                })

                connection.setLocalDescription(o)
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

function open() {

}

function addTrack(track, muted) {
    var video = document.createElement('video')


    var b = new MediaStream()
    b.addTrack(track)
    video.srcObject = b;
    video.controls = true;

    if (muted) {
        video.muted = true;
    }

    video.play();

    videoGrid.append(video)
}