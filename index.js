const videoGrid = document.getElementById("video-grid");
const localVideoGrid = document.getElementById("localvideo-grid");

const iceConfig = {
    iceServers: [{
        urls: 'stun:stun.l.google.com:19302'
    }]
}


document.title = "Parrot"


var sock;
var camera;
var screen;

var remoteStreams = []
var streamToVideo = {}


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

async function getConnectionMethod() {
    const stats = await connection.getStats()
    let selectedLocalCandidate;
    for (const {
            type,
            state,
            localCandidateId
        } of stats.values())
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

function switchDisplay() {
    document.getElementById("camera").style.display = '';
    document.getElementById("screen").style.display = '';

}

function switchone(){
	document.getElementById("generate").style.display = 'none';
    document.getElementById("label").style.display = 'none';
    document.getElementById("room").style.display = 'none';
}

async function getScreen(){
	return await navigator.mediaDevices.getDisplayMedia({
		audio: true,
		video: true
	})

}

async function getCamera (){
	return await navigator.mediaDevices.getUserMedia({"video":true})
}

function updateButton(value,id){
	document.getElementById(id).innerHTML = value +" "+ id
}

function createSource(id,func) {
	this.on = false
	this.senders = []

	document.getElementById(id).onclick = async e => {
		

		if (this.on == false) {
			var source = await func();
			updateButton('Disable',id)

			var tracks = source.getTracks()
			tracks.forEach(track => {
				if(id==='camera'){
					source = camera;
					
				}
				source.addTrack(track)
				var sender = connection.addTrack(track, source)
				this.senders.push(sender)
				updateVideo(streamToVideo[source],source)

				//convert to lambda that runs delete method if deleted for
				// example onDelete => removetrack(sender)
			})


		} else {
			updateButton('Enable',id)
			this.senders.forEach(s => connection.removeTrack(s))
			if(id=='camera'){
				await camera.removeTrack(camera.getVideoTracks()[0])
				updateVideo(streamToVideo[camera],camera)
			}
			if(id=='screen'){
				screen.getTracks().forEach(track =>{
					screen.removeTrack(track)
				})
				deleteVideo(streamToVideo[screen])
			}

			


		}
		this.on = !this.on;

		if(connection.connectionState==='connected'){
			connection.setLocalDescription(await connection.createOffer({iceRestart: true}))
		}



		
	}
}


function getAudioOptions(){
	return {audio:{
		autoGainControl: false,
		channelCount: 2,
		echoCancellation: false,
		latency: 0,
		noiseSuppression: false,
		sampleRate: 48000,
		sampleSize: 16,
		volume: 1.0}
	}
}

async function connect() {

    var room = document.getElementById('room').value
    

    sock = new WebSocket('ws://127.0.0.1:8765')


    sock.addEventListener('close', e => console.log('Socket is closed'))

    sock.addEventListener('error', e => console.error('Socket is in error', e))

    sock.addEventListener('message', e => {
        try {
            var data = JSON.parse(e.data) 
        } catch (e) {
            var data=e.data
        }
		console.log('New Message:', data)

    })


    sock.addEventListener('open', e => open())

}

function deleteVideo(video){
	video.pause();
	video.removeAttribute('src'); // empty source
	video.load();
	video.remove();
}

function updateVideo(video,stream){
	video.srcObject = stream;
	video.load();
	video.play();

	video.controls = true;
}

function createStream(stream){
	remoteStreams.push(stream);

	const div = document.createElement('div')
	div.className = "lol"
	const video = document.createElement('video')

	
	video.srcObject = stream;

	console.log(video)
	video.controls = true;

	streamToVideo[stream] = video;

	div.append(video)
	videoGrid.append(div)
	video.play();

	stream.onremovetrack = k => {
		if (stream.getTracks().length == 0) {
			deleteVideo(video)
		} else {
			updateVideo(video,stream)
		}
	}
}
function onTrack(track,stream){
	console.log("Track recieved")
	console.log(stream)

	if (!contains(stream, remoteStreams)) {
		createStream(stream)
	}

	streamToVideo[stream].controls = true;

	stream.addTrack(track);
}


async function open(){
	console.log('Socket is connected')
	switchone();

	connection = new RTCPeerConnection(iceConfig);

	var d = new createSource('camera',getCamera);
	var c = new createSource('screen',getScreen);
	console.log("Microphone enabled")
	camera = await navigator.mediaDevices.getUserMedia(getAudioOptions())

	connection.addTrack(camera.getTracks()[0], camera)

	onTrack(camera.getAudioTracks()[0],camera)

	connection.onconnectionstatechange = async e => {
		if (connection.connectionState === 'connected') {
			console.log("Connected via:" + await getConnectionMethod())
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

	connection.ontrack = event => {onTrack(event.track,event.streams[0])}


	send({'room': room}, "joinRoom");
	switchDisplay();
	sock.addEventListener('message', async e => {
		var o = JSON.parse(e.data)
		var s = o.message
		if (s === 'roomJoined') {

			



			var clientId = o.order

			if (clientId == 1) {
				connection.setLocalDescription()
			}

			sock.addEventListener('message', async e => {
				var s = JSON.parse(e.data)
				if (s.type === 'offer' || s.type === 'answer') {
					connection.setRemoteDescription(s).then(a => console.log("Remote Description set"))
					connection.setLocalDescription()
				}
			})
		}
	})
}