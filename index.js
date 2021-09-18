const videoGrid = document.getElementById("video-grid");

const iceConfig = {
	iceServers: [{
		urls: 'stun:stun.l.google.com:19302'
	}]
}

var sock;
screenSenders =[]
cameraOn = false;
screenOn = false;
document.title = "Parrot"

var camera;


var streamToVideo = {}

const remoteStreams = []

function send(msg, type) {
	if (sock.readyState != WebSocket.OPEN) {
		return;
	}
	const payload = {
		action: type,
		msg
	}
	console.log("Message sent")
	sock.send(JSON.stringify(payload))
}

async function getConnectionMethod(){
    const stats = await connection.getStats()
    let selectedLocalCandidate;
    for (const {type, state, localCandidateId} of stats.values())
        if (type === 'candidate-pair' && state === 'succeeded' && localCandidateId) {
            selectedLocalCandidate = localCandidateId
            break
        }

    var result = stats.get(selectedLocalCandidate).candidateType
    return result
}
function contains(x, y) {
	if (y.indexOf(x) === -1) {
		return false;
	} else {
		return true
	}
}

function switchDisplay(){
    document.getElementById("camera").style.display = '';
    document.getElementById("screen").style.display = '';
    document.getElementById("generate").style.display = 'none';
    document.getElementById("label").style.display = 'none';
    document.getElementById("room").style.display = 'none';
}

async function generate() {

	var room = document.getElementById('room').value
    switchDisplay();

	sock = new WebSocket('ws://127.0.0.1:8765')


	sock.addEventListener('close', e => console.log('Socket is closed'))

	sock.addEventListener('error', e => console.error('Socket is in error', e))

	sock.addEventListener('message', e => {
		try {
			data = JSON.parse(e.data)
			console.log('New Message:', data)
		} catch (e) {
			console.log('New Message:', e.data)
		}

	})


	sock.addEventListener('open', async e => {
		console.log('Socket is connected')


		connection = new RTCPeerConnection(iceConfig);

		connection.onnegotiationneeded = e => {
			console.log("Now!!!!")
		}

		var options = {};

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
		}

		camera = await navigator.mediaDevices.getUserMedia(options)

		connection.addTrack(camera.getTracks()[0], camera)

		connection.onconnectionstatechange = async e => {
			if (connection.connectionState === 'connected') {
				console.log("Connected via:"+await getConnectionMethod())
                
     

                
			}
		}

		connection.onicecandidate = e => {
			console.log("New ICE Candidate!")
		}


		connection.onicegatheringstatechange = e => {
			if (connection.iceGatheringState === 'complete') {
				console.log("Ice Gathering complete")
				var sdp = connection.localDescription.toJSON()
				send(sdp, 'signal')
			}
		}




		connection.ontrack = event => {

			console.log("Track recieved")
			var track = event.track;
			var stream = event.streams[0]
			console.log(stream)
			

			if (!contains(stream, remoteStreams)) {

				
				remoteStreams.push(stream);
                
				const video = document.createElement('video')
				video.srcObject = stream;

				console.log(video)
				video.controls = true;
				
				streamToVideo[stream] = video;

				videoGrid.append(video)
                video.play();

                stream.onremovetrack = k =>{
					if(stream.getTracks().length==0){

						video.pause();
						video.removeAttribute('src'); // empty source
						video.load();
						video.remove();

					}
					else{
						video.srcObject = stream;
						video.load();
						video.play();
					}
                }

			}
            
            streamToVideo[stream].controls = true;

			stream.addTrack(track);
		}


		send({
			'room': room
		}, "joinRoom");





		sock.addEventListener('message', async e => {
			var o = JSON.parse(e.data)
			var s = o.message
			if (s === 'roomJoined') {

                document.getElementById('camera').onclick = async e=>{
                    console.log("1")
                    if(cameraOn==false){

						document.getElementById("camera").innerHTML = "Disable Camera"

                        console.log("2")
                        cameraOn = true;
                        var stream = await navigator.mediaDevices.getUserMedia({"video":true})
                        console.log('6')
                        sender = connection.addTrack(stream.getVideoTracks()[0],camera)
                        

                    }
                    else{
						document.getElementById("camera").innerHTML = "Enable Camera"
                        console.log("3")
                        cameraOn = false;
                        connection.removeTrack(sender);
                    }

                    connection.setLocalDescription(await connection.createOffer({iceRestart:true}))

                }

				document.getElementById('screen').onclick = async e=>{
                    console.log("1")
                    if(screenOn==false){

                        document.getElementById("screen").innerHTML = "Disable Screen"
                        var stre = await navigator.mediaDevices.getDisplayMedia({audio: true, video: true})
						
						var tracks = stre.getTracks()
						for (let i = 0; i < tracks.length; i++) {
							screenSenders.push(connection.addTrack(tracks[i],stre))
						}

                    }
                    else{
						document.getElementById("screen").innerHTML = "Enable Screen"
						screenSenders.forEach(s => connection.removeTrack(s))
                        
                    }

					screenOn = !screenOn;

                    connection.setLocalDescription(await connection.createOffer({iceRestart:true}))
				}


				var clientId = o.order

				if (clientId == 1) {
					connection.setLocalDescription()
				}



				sock.addEventListener('message', async e => {
					var s = JSON.parse(e.data)
					if (s.type === 'offer' || s.type === 'answer') {
						connection.setRemoteDescription(s).then(a => console.log("Remote Description set"))

						

                        connection.setLocalDescription()

						console.log(screenSenders)

					}



				})
			}
		})






	})

}