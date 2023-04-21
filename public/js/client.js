const iceConfig = {iceServers: [{urls: 'stun:stun.l.google.com:19302'}]}

var connection;
var socket;
var cameraOn = false;

var currentStreams = {}
var dataChannel = {readyState:"closed"}


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



function sendPackage(pkg){
    if(dataChannel.readyState === "open"){
        console.log("Sending via DC")
        dataChannel.send(JSON.stringify(pkg))
    }
    else{
        console.log("Sending via WS")
        socket.send(JSON.stringify(pkg))
    }
}
function switchDisplay() {
	document.getElementById("call").style.display = '';
	document.getElementById("setup").remove()
    console.log("Display Switching")
}

function handleMessage(string){

    pkg = JSON.parse(string)
    if(pkg.type=="offer"){
        connection.setRemoteDescription(pkg)
        connection.setLocalDescription()
    }

    if(pkg.type=="answer"){
        connection.setRemoteDescription(pkg)
    }

    if(pkg.type=="joined"){
        switchDisplay()
    }
    if(pkg.type=="roomFull"){
        connection.setLocalDescription() 
    }
    if(pkg.type=="message"){
        console.log("received")
        var chatbox = document.getElementById("chatbox")
        chatbox.innerHTML += '<br>Them:'+pkg.message;
        chatbox.scrollTop = chatbox.scrollHeight;
    }
}

function connect(standard = "wss"){
    room = document.getElementById("room").value
    socket = new WebSocket(standard + '://' + location.host);

    socket.addEventListener('open', function(event) {
        console.log('WebSocket connection opened');
        console.log(room)
        
        begin();
        
        socket.addEventListener('message', function(event) {
            handleMessage(event.data.toString())
        });

        sendPackage({type:"joinRoom",room:room})
      });

    socket.addEventListener("error", (event) => {
        connect("ws")
    });

}

function ontrack(track,stream,localMute=false,created=false){
    if(!(stream.id in currentStreams)){
        currentStreams[stream.id] = {stream:stream}

        var container = document.createElement('div')
        container.classList.add("container")
        var controls = document.createElement('div')
        var slider = document.createElement('input')
        slider.type="range"
        slider.value=100

        slider.classList.add("volume-slider")

        var closeButton = document.createElement('img')

        closeButton.src = '/icons/close.png'


    
        var fsButton = document.createElement('img')


        var video = document.createElement('video')

        closeButton.onclick = async e =>{
            stream.getTracks().forEach(track => {
                    connection.removeTrack(track.sender)
                    track.stop()
                }
                );
            container.remove()
            if(connection.connectionState === 'connected'){
                connection.setLocalDescription(await connection.createOffer({iceRestart: true}))
            }
        }


        video.autoplay=true
        video.srcObject = stream
        video.poster = "/icons/test.jpg"
        stream.video = video
        stream.container = container


        fsButton.src = '/icons/fullscreen.png'

        fsButton.onclick = e =>{
            video.requestFullscreen();
        }

        video.ondblclick = e=>{
            video.requestFullscreen();
        }

        controls.classList.add("controls")

        slider.addEventListener("change", function(e) {
            video.volume = e.currentTarget.value / 100;
            console.log(e.currentTarget.value / 100)
        })

        if(localMute){
            slider.value=0
            video.volume=0
        }

        if(created){
            controls.append(closeButton)
        }
        
        controls.append(slider)
        controls.append(fsButton)
        container.append(video)
        container.append(controls)
        document.getElementById("video-grid").append(container)

    }
    console.log("Track recieved")
}


function getRtp() {
	connection.getStats(null).then(stats => {
		var statsOutput = "";

		stats.forEach(async report => {
			if (report.type === 'candidate-pair') {
				if (report.nominated) {
					var s = report.currentRoundTripTime
					if (s != undefined) {
                        var latency = s*1000
						//console.log("CRTT:" + s * 1000 + "ms")
                        document.getElementById("crtt").innerHTML = "CRTT: "+latency+"ms"
					}

				}
			}
			if (report.type === 'remote-inbound-rtp') {
				var latency = report.roundTripTime * 1000
				//console.log("Inbound:" + latency + 'ms')
                document.getElementById("inbound").innerHTML = "Inbound: "+latency+"ms"
               
			}
		});

	});
}


async function begin(){
    connection = new RTCPeerConnection(iceConfig);
    var camera = await navigator.mediaDevices.getUserMedia(audioOptions)

    dataChannel = connection.createDataChannel({negotiated: true, id: 0})

    dataChannel.onopen = e=>{
        console.log("Data channel open")


        document.getElementById("connection").style.color = "green";
        document.getElementById("connection").innerHTML="Connected"
        var intID = setInterval(function() {
            getRtp()
          }, 500);
          


    }

    connection.ondatachannel = d=>{
        dataChannel = d.channel
    
        console.log("Working")
        var input = document.getElementById("messageInput")
        input.addEventListener("keyup", e =>{
            if (e.code === 'Enter') {
                pkg = {type:"message",message:input.value}
                sendPackage(pkg)

                var chatbox = document.getElementById("chatbox")
                chatbox.innerHTML += '<br>Me:'+input.value;
                chatbox.scrollTop = chatbox.scrollHeight;


                input.value = ""
                


            }
        });

    }

    dataChannel.onmessage = d =>{
        handleMessage(d.data)
    }




    console.log("yes")

    ontrack(camera.getAudioTracks()[0],camera,true)
    document.getElementById('camera').onclick = async e => {

        if(cameraOn){
            cameraOn = false
            document.getElementById('cameraI').src = "icons/cameraOff.png"
            connection.removeTrack(remoteCam)
            camera.removeTrack(camera.getVideoTracks()[0])
            camera.video.load()
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

        console.log(connection.connectionState )
        if(connection.connectionState === 'connected'){
            connection.setLocalDescription(await connection.createOffer({iceRestart: true}))
        }


    }


    document.getElementById('addScreen').onclick = async e => {
        screen = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: audioOptions
        })
        
        var video = screen.getVideoTracks()[0]
        var audio = screen.getAudioTracks()[0]

        video.sender = connection.addTrack(screen.getAudioTracks()[0],screen)
        audio.sender = connection.addTrack(screen.getVideoTracks()[0],screen)


        ontrack(audio,screen,true,true)
        ontrack(video,screen,true,true)

        


        if(connection.connectionState === 'connected'){
            connection.setLocalDescription(await connection.createOffer({iceRestart: true}))
        }
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

            sendPackage(sdp)
            
		}
    }

    connection.ontrack = event => {
        var track = event.track
        var stream = event.streams[0]
        
        stream.onremovetrack = track =>{
            console.log("Track removed")
            stream.video.load()
            if(stream.getTracks().length==0){
                console.log("test")
                stream.container.remove()
            }
            
        }
        ontrack(track,stream)
	}

    console.log("setup complete")

}