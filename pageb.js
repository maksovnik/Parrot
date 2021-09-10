
var myID = document.getElementById('myID')
document.getElementById('generate').addEventListener('click', async function () {

    var offer = JSON.parse(document.getElementById('otherID').value);
    const remoteConnection = new RTCPeerConnection()

    remoteConnection.onicecandidate = e =>  {
        console.log(" NEW ice candidate!! on local connection reprinting SDP " )
        var answer = JSON.stringify(remoteConnection.localDescription)
        console.log(answer)
        myID.value = answer
    }

    
    remoteConnection.ondatachannel= e => {

        const receiveChannel = e.channel;
        receiveChannel.onmessage =e =>  console.log("messsage received!!!"  + e.data )
        receiveChannel.onopen = e => {
            console.log("open!!!!")
            const pair = remoteConnection.sctp.transport.iceTransport.getSelectedCandidatePair();
            console.log(pair.remote.type);
        };
        receiveChannel.onclose =e => console.log("closed!!!!!!");
        remoteConnection.channel = receiveChannel;

    }


    remoteConnection.setRemoteDescription(offer).then(a=>console.log("done"))

    //create answer

    await remoteConnection.createAnswer().then(a => remoteConnection.setLocalDescription(a))

    //send the anser to the client 
  })


