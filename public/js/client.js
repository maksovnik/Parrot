const iceConfig = {iceServers: [{urls: 'stun:stun.l.google.com:19302'}]}

var standard = "wss"
var room = ""
var connection;
var socket;

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


    function createStream(stream, muted = false) {
    
        const video = document.createElement('video')
        const posters = ["https://cdnb.artstation.com/p/assets/images/images/014/861/241/large/jose-miranda-srgb-aang-final-con-brillo-jmt.jpg",
            "https://cdn5.f-cdn.com/ppic/1430815/logo/3508484/creative_colorful_eye-HD.jpg"
        ]
        video.poster = posters[Math.floor(Math.random() * posters.length)];
    
        const div = document.createElement('div')
    
        video.tdiv = div;
        div.id = "bo"
    
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
                updateVideo(video, stream)
            }
        }
    }


    connection.ontrack = event => {
        var track = event.track
        var stream = event.streams[0]

        console.log("Track recieved")

        createStream(stream)
        stream.resetControls();
        stream.addTrack(track);

	}

    console.log("setup complete")

    

    
    

}

