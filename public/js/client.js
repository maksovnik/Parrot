const iceConfig = {iceServers: [{urls: 'stun:stun.l.google.com:19302'}]}

var standard = "wss"
var room = ""
var connection;
var socket;


var remoteStream;
var remoteVideo;

var cameraOn = false;


const videoGrid = document.getElementById("video-grid");


var audioOptions = 
	{
		audio: {
			autoGainControl: false,
			channelCount: 2,
			echoCancellation: false,
			latency: 0,
			noiseSuppression: false,
			sampleRate: 48000,
			sampleSize: 16,
			volume: 1.0
		}
	}

    function createStream() {
        
        remoteVideo = document.createElement('video')
        const div = document.createElement('div')

        div.classList.add("videoContainer")
    
        
    
        console.log("Stream created")
        remoteVideo.controls = true;
    
        videoGrid.append(remoteVideo)
        div.append(remoteVideo)
        videoGrid.append(div)

        remoteVideo.play();
    
    
    }

function switchDisplay() {
	document.getElementById("call").style.display = '';
	document.getElementById("setup").style.display = 'none';
    console.log("Display Switching")
}


function connect(){
    room = document.getElementById("room").value
    socket = new WebSocket(standard + '://' + location.host);

    socket.addEventListener('open', function(event) {
        console.log('WebSocket connection opened');
        console.log(room)
        
        begin();
        
        socket.addEventListener('message', async function(event) {
            
            q = JSON.parse(event.data.toString())
            console.log(q)

            if(q.type=="offer"){
                connection.setRemoteDescription(q)
                connection.setLocalDescription(await connection.createAnswer())
            }

            if(q.type=="answer"){
                connection.setRemoteDescription(q)
            }

            if(q.type=="joined"){
                switchDisplay()
                createStream()
            }
            if(q.type=="roomFull"){
                connection.setLocalDescription()
                
            }
        });

        socket.send(JSON.stringify({type:"joinRoom",room:room}))
      });

    socket.addEventListener("error", (event) => {
        standard = "ws"
        connect()
    });

    
    

}


async function begin(){
    connection = new RTCPeerConnection(iceConfig);
    var camera = await navigator.mediaDevices.getUserMedia(audioOptions)
    
    document.getElementById('camera').onclick = async e => {

        if(cameraOn){
            cameraOn = false
            document.getElementById('cameraI').src = "icons/cameraOff.png"
            connection.removeTrack(remoteCam)
            camera.removeTrack(camera.getVideoTracks()[0])
        }
        else{
            cameraOn = true
            document.getElementById('cameraI').src = "icons/cameraOn.png"

            console.log("yes")
            var newCam = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 4096 },
                    height: { ideal: 2160 } 
                } ,
                audio: audioOptions})
            var vidTrack = newCam.getVideoTracks()[0]
            camera.addTrack(vidTrack)
            remoteCam = connection.addTrack(vidTrack, camera)

            
        }


        connection.setLocalDescription(await connection.createOffer({
            iceRestart: true
        }))

    }
    document.getElementById('mic').onclick = d => {
		var enabled = camera.getAudioTracks()[0].enabled;
		document.getElementById('micI').src = enabled ?
			document.getElementById('micI').src = "icons/micOff.png" :
			document.getElementById('micI').src = "icons/micOn.png"
		camera.getAudioTracks()[0].enabled = !enabled;
	}
    
    connection.addTrack(camera.getTracks()[0], camera)
    
    connection.onconnectionstatechange = async e => {
       // console.log(e)
    }

    connection.onicecandidate = e => {
       // console.log(e)
    }

    connection.oniceconnectionstatechange = e => {
        //console.log(e)
    }

    connection.onconnectionstatechange = async e => {
		if (connection.connectionState === 'connected') {
			console.log("Connected")
		}
	}

    connection.onicegatheringstatechange = e => {
		if (connection.iceGatheringState === 'complete') {

			console.log("Ice Gathering complete, sending SDP")
			var sdp = connection.localDescription.toJSON()

            socket.send(JSON.stringify(sdp))
            
		}
    }

    connection.ontrack = event => {


        var track = event.track
        remoteStream = event.streams[0]

        console.log("Track recieved")

        
        remoteStream.addTrack(track);
        

        remoteVideo.srcObject = remoteStream;

        remoteVideo.play();
        

	}

    console.log("setup complete")

    

    
    

}

