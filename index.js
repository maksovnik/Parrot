const videoGrid = document.getElementById("video-grid");

const iceConfig = {
    iceServers: [{
        urls: 'stun:stun.l.google.com:19302'
    }]
}


document.title = "Parrot"

var startTime;
var endTime;

var i1;
var i2;


var l1;
var l2;


var sock;
var camera;
var remoteStreams = []
var dataconn;

var newCandidates = []

var connected=false;


var id;

function send(msg, type) {
    if (sock.readyState != WebSocket.OPEN) {
        return;
    }
    const payload = {
        action: type,
        msg
    }
	var json = JSON.stringify(payload)
	console.log("Message sent")

    sock.send(json)
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
	var delay = stats.get(selectedLocalCandidate).candidateType
    return result
}

function contains(x, y) {
    if (y.indexOf(x) === -1) {
        return false;
    } else {
        return true
    }
}

async function getRtp(){
	connection.getStats(null).then(stats => {
		var statsOutput = "";
	
		stats.forEach(report => {
			if(report.type === 'candidate-pair'){
				if(report.nominated){
					var s = report.currentRoundTripTime
					if(s!=undefined){
						console.log("Latency:"+s*1000+"ms")
					}
				
				}
			}
			if(report.type === 'remote-inbound-rtp'){
				console.log("Inbound:"+report.roundTripTime*1000+'ms')
			}
		});
	
	  });
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

	dataconn.onopen = e=>{
		console.log("Data Conn opened")
		connected=true;
		sock.close();


		// var msg = {type:"message",data:text}

		if(id==1){
			l1 = performance.now();
			dataconn.send("");
		}


	}

	dataconn.onmessage = async (e,other=true) => {

		if(id==2){
			dataconn.send("");
		}

		if(id==1){
			l2 = performance.now()
			console.log(`BIG IMPORTANT:${l2-l1}ms`)
		}
		
		
		var chatbox = document.getElementById("chatbox")

		var p = document.createElement("p")
		p.id = 'trash'
		var data = JSON.parse(e.data)
		var message = JSON.parse(e.data).data;
		if(data.type === 'message'){
			
			if(other){
				p.innerHTML = "Friend:"+message
			}
			else{
				p.innerHTML = "You:"+message
			}
			chatbox.append(p)
	
			chatbox.scrollTop = chatbox.scrollHeight;
		}

		if(data.type === 'sdp'){

			var endTime = performance.now()
			
			console.log(`Signalling Delay:${endTime - startTime}ms`)

			connection.setRemoteDescription(message).then(a => console.log("Remote Description set"))
			
			console.log(message)
			if(message.type==='offer'){
				console.log("Ran");
				connection.setLocalDescription(await connection.createAnswer())
			}
			

		}

	}



	document.getElementById("messageInput").addEventListener("keyup", event => {
		if (event.code === 'Enter') {
			var messageInput = document.getElementById("messageInput");
			var text = messageInput.value
			messageInput.value = '';
			var msg = {type:"message",data:text}
			dataconn.send(JSON.stringify(msg));
			var event = {data:JSON.stringify(msg)}
			dataconn.onmessage(event,false);
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
			// debugger;
			await getRtp()
			
		}
	}

	connection.onicecandidate = e => {
		
		if(e.candidate!=null){
			newCandidates.push(1)
		}
		if(connection.iceGatheringState==='gathering'){
			console.log("New ICE Candidate!")
		}
		
	}



	connection.onicegatheringstatechange = e => {


		if (connection.iceGatheringState === 'gathering') {
			console.log("Gathering ICE")
			i1 = performance.now();
		}
		
		if (connection.iceGatheringState === 'complete') {
			i2 = performance.now();

			console.log(`ice Delay:${i2-i1}ms`)


			if(newCandidates.length==0){
				return;
			}

			console.log("Ice Gathering complete")

			var sdp = connection.localDescription.toJSON()
			console.log()
			if(connected){
				var message = {type:"sdp",data:sdp}
				var package = JSON.stringify(message)
				console.log("Sending message")
				startTime = performance.now()
				dataconn.send(package)
			}
			else{
				send(sdp, 'signal')
			}
			

			newCandidates = [];
		}

		
	}

	connection.ontrack = event => {onTrack(event.track,event.streams[0])}

	connection.ondatachannel = event =>{
		console.log("Data channel recieved")
		dataconn = event.channel;
		setupChat()
	}


	send({'room': room}, "joinRoom");

	sock.addEventListener('message', e => {
		
		var o = JSON.parse(e.data)
		var s = o.message
		if (s === 'roomJoined') {
		
			var clientId = o.order
			id = clientId;

			if (clientId == 1) {
				dataconn = connection.createDataChannel("dc");
				connection.setLocalDescription()
				setupChat()
			}
			

			sock.addEventListener('message', e => {
				var s = JSON.parse(e.data)
				if(s.type=='offer'||s.type=='answer'){
					connection.setRemoteDescription(s).then(a => console.log("Remote Description set"))
					if(clientId==2){
						connection.setLocalDescription()
					}
					
				}
			})
		}
	})
}