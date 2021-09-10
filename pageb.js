
var local = document.getElementById('local')
const iceConfiguration = {
    iceServers: [
        {
            urls: 'stun:stun.l.google.com:19302'
        }
    ]
}


async function generate(){
    remoteConnection = new RTCPeerConnection(iceConfiguration); 

    remoteConnection.onicecandidate = e =>  {
        console.log("New ICE Candidate!! SDP " )
        var answer = JSON.stringify(remoteConnection.localDescription)
        document.getElementById('myID').value = answer
    }

    

    
    var stream = new MediaStream()
    remoteConnection.ontrack = event => {
        console.log("Stream recieved")
        stream.addTrack(event.track)
    }



    console.log("Completed")


    remoteConnection.ondatachannel= e => {

        const receiveChannel = e.channel;
        receiveChannel.onmessage =e =>  console.log("messsage received!!!"  + e.data )
        receiveChannel.onopen = e => {
            console.log("open!!!!")
            const pair = remoteConnection.sctp.transport.iceTransport.getSelectedCandidatePair();
            console.log(pair.remote.type);

            local.srcObject = stream;
            local.play();
        };
        receiveChannel.onclose =e => console.log("closed!!!!!!");
        remoteConnection.channel = receiveChannel;



    }


    var offer = JSON.parse(document.getElementById('otherID').value);
    remoteConnection.setRemoteDescription(offer).then(a=>console.log("done"))

    //create answer

    await remoteConnection.createAnswer().then(a => remoteConnection.setLocalDescription(a))

    //send the anser to the client 
  }


