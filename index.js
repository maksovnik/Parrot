const videoGrid = document.getElementById("video-grid");

const iceConfig = {
    iceServers: [{
        urls: 'stun:stun.l.google.com:19302'
    }]
}


document.title = "Parrot"


var sock;
var camera;
var remoteStreams = []
var dataconn;

var connected=false;

function send(msg, type) {
    if (sock.readyState != WebSocket.OPEN) {
        return;
    }
    const payload = {
        action: type,
        msg
    }
	console.log(payload)
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
	document.getElementById("call").style.display = '';
    document.getElementById("setup").style.display = 'none';
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

    
    switchDisplay();

    sock = new WebSocket('wss://5tkartjbu1.execute-api.eu-west-3.amazonaws.com/production')


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

	camera = await navigator.mediaDevices.getUserMedia(getAudioOptions())

	document.getElementById('mic').onclick = d=>{
		var enabled = camera.getAudioTracks()[0].enabled;
		document.getElementById('micI').src = enabled ? 
			document.getElementById('micI').src = "icons/micOff.png"
		 : document.getElementById('micI').src = "icons/micOn.png"
		camera.getAudioTracks()[0].enabled = !enabled;
	}
    sock.addEventListener('open', e => open())

}

function deleteVideo(video){
	video.pause();
	video.removeAttribute('src'); // empty source
	video.load();
	videoGrid.removeChild(video.tdiv)
}

function updateVideo(video,stream){
	video.srcObject = stream;
	video.load();
	video.play();

	video.controls = true;
}

function createStream(stream,muted=false){
	remoteStreams.push(stream);

	const video = document.createElement('video')
	const posters = ["https://cdnb.artstation.com/p/assets/images/images/014/861/241/large/jose-miranda-srgb-aang-final-con-brillo-jmt.jpg",
					"https://cdn5.f-cdn.com/ppic/1430815/logo/3508484/creative_colorful_eye-HD.jpg"
]
	video.poster = posters[Math.floor(Math.random() * posters.length)];

	const div = document.createElement('div')

	video.tdiv = div;
	div.id="bo"
	
	video.srcObject = stream;
	video.muted = muted;

	console.log("Stream created")
	video.controls = true;


	videoGrid.append(video)
	div.append(video)
	videoGrid.append(div)
	video.play();

	stream.resetControls = k => {
		video.controls = true;
	}

	stream.onremovetrack = k => {
		if (stream.getTracks().length == 0) {
			console.log("Video deleted")
			deleteVideo(video)
		} else {
			console.log("Video updated")
			updateVideo(video,stream)
		}
	}
}
function onTrack(track,stream,muted=false){
	console.log("Track recieved")
	console.log(stream)

	if (!contains(stream, remoteStreams)) {
		createStream(stream,muted)
	}

	stream.resetControls();

	stream.addTrack(track);
}

function f(id){

	this.on = false;
	this.tracks;
	this.senders = [];
	this.stream;

	this.of = {}

	document.getElementById(id).onclick = async e => {
		if(this.on){
			document.getElementById(id+'I').src = 'icons/' + id + "Off.png";
			this.senders.forEach(sender => connection.removeTrack(sender))
			this.tracks.forEach(track => this.of[id].removeTrack(track))
			this.of[id].onremovetrack();

		}
		else{
			document.getElementById(id+'I').src = 'icons/' + id + "On.png";

			if(id==='camera'){
				this.stream = await navigator.mediaDevices.getUserMedia({"video":true})
				this.of[id] = camera
			}

			if(id==='screen'){
				this.stream = await navigator.mediaDevices.getDisplayMedia({audio: true,video: true})
				this.of[id] = this.stream ;
			}

			this.tracks = this.stream.getTracks()
			this.tracks.forEach(track =>{
				if(id==='camera'){
					this.of[id].addTrack(track)
				}
				onTrack(track,this.of[id],true)
				console.log(track)
				console.log(this.of[id])
				this.senders.push(connection.addTrack(track, this.of[id]))
			})
		}

		this.on = !this.on;
		if(connected){
			connection.setLocalDescription(await connection.createOffer({iceRestart: true}))
		}
		
	}

	
}

function setupChat(){


	dataconn.onmessage = (e,other=true) => {
		var chatbox = document.getElementById("chatbox")

		var p = document.createElement("p")
		p.id = 'trash'
		var message =  e.data;
		if(other){
			p.innerHTML = "Friend:"+message
		}
		else{
			p.innerHTML = "You:"+message
		}
		chatbox.append(p)

		chatbox.scrollTop = chatbox.scrollHeight;
	}



	document.getElementById("messageInput").addEventListener("keyup", event => {
		console.log("hello")
		if (event.code === 'Enter') {
			var messageInput = document.getElementById("messageInput");
			var text = messageInput.value
			messageInput.value = '';
			dataconn.send(text);
			var e = {data: text}
			dataconn.onmessage(e,false);
		}
	  });
}
async function open(){
	console.log('Socket is connected')

	connection = new RTCPeerConnection(iceConfig);
	var room = document.getElementById('room').value
	

	console.log("Microphone enabled")
	

	

	onTrack(camera.getTracks()[0],camera,true)
	var sender = connection.addTrack(camera.getTracks()[0], camera)



	var x = new f('camera');
	var y = new f('screen');

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

	connection.ondatachannel = event =>{
		console.log("Data channel recieved")
		dataconn = event.channel;
		setupChat()
	}


	send({'room': room}, "joinRoom");

	sock.addEventListener('message', async e => {
		var o = JSON.parse(e.data)
		var s = o.message
		if (s === 'roomJoined') {
			connected=true;


			var clientId = o.order

			if (clientId == 1) {
				connection.setLocalDescription()
				dataconn = connection.createDataChannel("dc");
				setupChat()
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