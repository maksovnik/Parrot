
var getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
var local_stream;
var screenStream;
var peer = null;
var currentPeer = null
var screenSharing = false

otherId=null;

const videoGrid = document.getElementById("video-grid");


navigator.mediaDevices.getUserMedia({
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
  });


function addVideoStream(video, stream) {
    video.srcObject = stream;
    video.addEventListener("loadedmetadata", () => {
      video.play();
    });
    videoGrid.append(video);
  }


function createRoom() {
    console.log("Creating Room")

    peer = new Peer("M")
    otherId = "J";


    peer.on('open', (id) => {
        console.log("Peer Connected with ID: ", id)
        hideModal()
        getUserMedia({ video: true, audio: true }, (stream) => {
            local_stream = stream;
            const video = document.createElement("video");
            video.controls = true;
            video.muted=true;
            addVideoStream(video,stream)

            //setLocalStream(local_stream)
        }, (err) => {
            console.log(err)
        })
        notify("Waiting for peer....")
    })

    
    peer.on('call', (call) => {
        call.answer(local_stream);

        const video = document.createElement("video");
        video.controls = true;

        call.on('stream', (stream) => {
            addVideoStream(video,stream)
        })
    })
}




function hideModal() {
    document.getElementById("entry-modal").hidden = true
}

function notify(msg) {
    let notification = document.getElementById("notification")
    notification.innerHTML = msg
    notification.hidden = false
    setTimeout(() => {
        notification.hidden = true;
    }, 3000)
}

function joinRoom() {
    console.log("Joining Room")

    hideModal()
    peer = new Peer("J")
    otherId = "M"
    peer.on('open', (id) => {
        console.log("Connected with Id: " + id)
        getUserMedia({ video: true, audio: true }, (stream) => {
            local_stream = stream;
            //setLocalStream(local_stream)

            let video = document.createElement("video");
            video.controls = true;
            video.muted=true;
            addVideoStream(video,stream)

            notify("Joining peer")
            let call = peer.call("M", stream)

            video = document.createElement("video");
            video.controls = true;

            call.on('stream', (stream) => {
                //setRemoteStream(stream);
                addVideoStream(video,stream)
            })
            currentPeer = call;
        }, (err) => {
            console.log(err)
        })

    })


    peer.on('call', (call) => {
        call.answer(local_stream);

        const video = document.createElement("video");
        video.controls = true;

        call.on('stream', (stream) => {
            addVideoStream(video,stream)
        })
    })
}


const startScreenShare = async () => {
    let captureStream = null;
  
    try {
      captureStream = await navigator.mediaDevices.getDisplayMedia({audio: true, video: true})

      console.log("1");
    
      console.log(otherId)
      const video = document.createElement("video");
    video.controls = true;

    
      peer.call(otherId, captureStream);
      addVideoStream(video,captureStream)
      console.log("2");
    } catch (err) {
      console.error("Error: " + err);
    }


  };

function stopScreenSharing() {
    if (!screenSharing) return;
    let videoTrack = local_stream.getVideoTracks()[0];
    if (peer) {
        let sender = currentPeer.peerConnection.getSenders().find(function (s) {
            return s.track.kind == videoTrack.kind;
        })
        sender.replaceTrack(videoTrack)
    }
    screenStream.getTracks().forEach(function (track) {
        track.stop();
    });
    screenSharing = false
}