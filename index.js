const videoGrid = document.getElementById("video-grid");

const iceConfig = {
	iceServers: [{
		urls: 'stun:stun.l.google.com:19302'
	}]
}

var sock;

cameraOn = false;
document.title = "Parrot"

var sender;

var video;

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

function contains(x, y) {
	if (y.indexOf(x) === -1) {
		return false;
	} else {
		return true
	}
}

async function generate() {

	var room = document.getElementById('room').value


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
				console.log("Connected")
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




		connection.ontrack = async event => {

			console.log("Track recieved")
			var track = event.track;
			stream = event.streams[0]

			if (!contains(stream, remoteStreams)) {
				remoteStreams.push(stream);
                
				video = document.createElement('video')

				video.srcObject = stream;
				video.controls = true;

				video.play();

				videoGrid.append(video)

                stream.onremovetrack = k =>{
                    video.srcObject = stream;
                    video.play();
                }


			}

			stream.addTrack(track);
            console.log(stream.getTracks().length)
		}


		send({
			'room': room
		}, "joinRoom");





		sock.addEventListener('message', async e => {
			var o = JSON.parse(e.data)
			var s = o.message
			if (s === 'roomJoined') {
                
                document.getElementById('camera').onclick = async e=>{
                    if(cameraOn==false){
                        cameraOn = true;
                        var stream = await navigator.mediaDevices.getUserMedia({"video":true})
                        sender = connection.addTrack(stream.getVideoTracks()[0],camera)

                    }
                    else{
                        cameraOn = false;
                        await connection.removeTrack(sender);
                        connection.restartIce()
                    }
                    await connection.setLocalDescription(connection.createOffer())

                }


				var clientId = o.order

				if (clientId == 1) {
					connection.setLocalDescription()
				}



				sock.addEventListener('message', async e => {
					var s = JSON.parse(e.data)
					if (s.type === 'offer' || s.type === 'answer') {
						connection.setRemoteDescription(s).then(a => console.log("Remote Description set"))

						if (clientId == 2) {
							connection.setLocalDescription()
						}


					}



				})
			}
		})






	})

}