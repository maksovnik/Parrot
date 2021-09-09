
var getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
var local_stream;
var screenStream;
var peer = null;
var currentPeer = null
var screenOn = false
var cameraOn = false;
var Rid = null;
var screenPeer = null;


var dataCon = null;

var screenShareObject = null;

const videoGrid = document.getElementById("video-grid");

var id = Math.random().toString(36).substr(2, 9);

document.getElementById("id").innerHTML = id;


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


function hideModal() {
    document.getElementById("entry-modal").hidden = true
    document.getElementById("control-bar").hidden = false
}

function notify(msg) {
    let notification = document.getElementById("notification")
    notification.innerHTML = msg
    notification.hidden = false
    setTimeout(() => {
        notification.hidden = true;
    }, 3000)
}



function joinCall() {
    console.log("Creating Room")
    Rid = document.getElementById('rID').value;
    peer = new Peer(id);



    


    peer.on('open', (id) => {
        console.log("You have connected with ID: ", id)


        hideModal()
        getUserMedia({ video: true, audio: true }, (stream) => {
            local_stream = stream;
            const video = document.createElement("video");
            video.controls = true;
            stream.getVideoTracks()[0].enabled = cameraOn;

            video.muted = true;
            addVideoStream(video, stream)

            let call = peer.call(Rid, stream)

            //setLocalStream(local_stream)
        }, (err) => {
            console.log(err)
        })
        notify("Waiting for peer....")
    })


    peer.on('call', (call) => {

        console.log("Has joined")
        call.answer(local_stream);

        call.on('close', function () { console.log("LOL!!!") });

        const video = document.createElement("video");
        video.controls = true;

        call.on('stream', (stream) => {
            addVideoStream(video, stream)
        })

        
        dataCon = peer.connect(Rid);


        dataCon.on('open', function() {
            console.log("TESTTTTTTTTTTTTT")
            dataCon.on('data', function(data) {
              console.log('Received', data);
            });
          
            dataCon.send('Hello!');
          });






    })


    console.log(peer.connections)
}


function toggleCamera() {
    if (cameraOn == true) {
        //local_stream.getVideoTracks()[0].enabled = false;
        local_stream.getVideoTracks().forEach(f => f.enabled = false)
        document.getElementById("toggleCamera").innerHTML = 'Enable Camera';
        cameraOn = false;
    }
    else if (cameraOn == false) {
        local_stream.getVideoTracks()[0].enabled = true;
        document.getElementById("toggleCamera").innerHTML = 'Disable Camera';
        cameraOn = true;
    }

}

const toggleScreen = async () => {

    if (screenOn == true) {
        screenClose();
        return;
    }

    try {
        screenStream = await navigator.mediaDevices.getDisplayMedia({ audio: true, video: true })

        screenStream.getVideoTracks()[0].onended = (() => screenClose())

    
        screenShareObject = document.createElement("video");
        screenShareObject.controls = true;


        screenPeer = peer.call(Rid, screenStream);

        screenPeer.on('close', (() => screenClose()))
            
        addVideoStream(screenShareObject, screenStream)



        document.getElementById("share").innerHTML = 'Disable Screen';
        screenOn = true;

    } catch (err) {
        console.error("Error: " + err);
    }


};


function screenClose(){
    for (var i = 0; i < peer.connections.length; i++) {
        if (peer.connections[i] == screenPeer) {
            break;
        }
    }

    console.log(i);
    //dataCon.on('data', function(data){dataCon.send(i);});
    

    dataCon.send('Hello!');
    screenStream.getTracks().forEach(track => track.stop());
    screenShareObject.remove();
    screenOn = false;




    document.getElementById("share").innerHTML = 'Enable Screen';
}