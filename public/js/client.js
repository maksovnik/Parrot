const iceConfig = {iceServers: [{urls: 'stun:stun.l.google.com:19302'}]}

var standard = "wss"
var room = ""
var connection;
var socket;

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
    console.log("setup complete")

    

    
    

}

