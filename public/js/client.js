const iceConfig = {iceServers: [{urls: 'stun:stun.l.google.com:19302'}]}

var connection;
var socket;

var cameraOn = false;

const videoGrid = document.getElementById("video-grid");


var currentStreams = {}


var audioOptions = 
    {audio: {
        autoGainControl: false,
        channelCount: 2,
        echoCancellation: false,
        latency: 0,
        noiseSuppression: false,
        sampleRate: 48000,
        sampleSize: 16,
        volume: 1.0
	}}


function switchDisplay() {
	document.getElementById("call").style.display = '';
	document.getElementById("setup").remove()
    console.log("Display Switching")
}

function connect(standard = "wss"){
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
            }
            if(q.type=="roomFull"){
                connection.setLocalDescription()
                
            }
        });

        socket.send(JSON.stringify({type:"joinRoom",room:room}))
      });

    socket.addEventListener("error", (event) => {
        connect("ws")
    });

}

async function getRtp() {
	connection.getStats(null).then(stats => {
		var statsOutput = "";

		stats.forEach(report => {
			if (report.type === 'candidate-pair') {
				if (report.nominated) {
					var s = report.currentRoundTripTime
					if (s != undefined) {
						console.log("CRTT:" + s * 1000 + "ms")
					}

				}
			}
			if (report.type === 'remote-inbound-rtp') {
				console.log("Inbound:" + report.roundTripTime * 1000 + 'ms')
			}
		});

	});
}


function ontrack(track,stream){
    if(!(stream.id in currentStreams)){
        currentStreams[stream.id] = {stream:stream}

        var container = document.createElement('div')
        container.classList.add("container")

        var controls = document.createElement('div')
        var slider = document.createElement('input')
        slider.type="range"
        slider.value=200

        var button = document.createElement('button')

        button.innerHTML = 'X'

        button.type=button
        button.onclick = e =>{
            stream.getTracks().forEach(track => track.stop());
            container.remove()
        }
        

        var button2 = document.createElement('button')


        var video = document.createElement('video')
        video.autoplay=true
        video.srcObject = stream

        button2.innerHTML = 'O'

        button2.type=button2
        button2.onclick = e =>{
            video.requestFullscreen();
        }



        controls.classList.add("controls")

        slider.addEventListener("change", function(e) {
            video.volume = e.currentTarget.value / 100;
            console.log(e.currentTarget.value / 100)
        })

        controls.append(button)
        controls.append(slider)
        controls.append(button2)
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


    document.getElementById('addScreen').onclick = async e => {
        screen = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: audioOptions
        })

        ontrack(screen.getAudioTracks()[0],screen)
        ontrack(screen.getVideoTracks()[0],screen)

        connection.addTrack(screen.getAudioTracks()[0],screen)
        connection.addTrack(screen.getVideoTracks()[0],screen)

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
        
        stream.onremovetrack = track =>{
            console.log("Track removed")
            
        }
        ontrack(track,stream)
	}

    console.log("setup complete")

}

