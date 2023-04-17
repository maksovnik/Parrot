const iceConfig = {iceServers: [{urls: 'stun:stun.l.google.com:19302'}]}

var standard = "wss"
var connection;
var socket;

var cameraOn = false;

const videoGrid = document.getElementById("video-grid");


var currentStreams = {}


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
                // remoteVideo = document.createElement('video')
                // remoteVideo.controls = true;
                // videoGrid.append(remoteVideo)
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


function ontrack(track,stream){
    if(!(stream.id in currentStreams)){
        currentStreams[stream.id] = {stream:stream}

        var container = document.createElement('div')
        var controls = document.createElement('div')
        var slider = document.createElement('input')
        slider.type="range"
        slider.value=200

        controls.innerHTML = "<button type='button'>C</button><button type='button'>M</button>"
        var video = document.createElement('video')
        video.autoplay=true
        video.srcObject = stream

        controls.classList.add("controls")

        slider.addEventListener("change", function(e) {
            video.volume = e.currentTarget.value / 100;
            console.log(e.currentTarget.value / 100)
        })

        controls.append(slider)
        container.append(video)
        container.append(controls)
        videoGrid.append(container)

    }
    console.log("Track recieved")
}
async function begin(){
    connection = new RTCPeerConnection(iceConfig);
    var camera = await navigator.mediaDevices.getUserMedia(audioOptions)
    ontrack(camera.getAudioTracks()[0],camera)
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
        var stream = event.streams[0]
        
        ontrack(track,stream)
	}

    console.log("setup complete")

}

