const iceConfig = {
    iceServers: [{
        urls: 'stun:stun.l.google.com:19302'
    }]
}

peerA = window.location.hash;
document.getElementById('peer').innerHTML = window.location.hash ? "Peer A" : "Peer B"


function setRemoteID(){
    var sdp = JSON.parse(document.getElementById('otherID').value)
    console.log(sdp)
    connection.setRemoteDescription(sdp).then(a => console.log("Remote Description set"))
}


function setupChannel(channel){
    channel.onmessage = e => console.log("messsage received!!!" + e.data)
    channel.onopen = e => {
        console.log("Open!!!!");
        document.getElementById('status').innerHTML = "Status: Connected"

        const pair = connection.sctp.transport.iceTransport.getSelectedCandidatePair();
        console.log(pair.remote.type);

    }
    channel.onclose = e => console.log("closed!!!!!!");
}

async function generate() {
    connection = new RTCPeerConnection(iceConfig);

    connection.onicecandidate = e => {
        var t = JSON.stringify(connection.localDescription)
        document.getElementById('myID').value = t;
        console.log("New ICE Candidate! SDP:" + t)
    }


    if(peerA){
        const sendChannel = connection.createDataChannel("sendChannel");
        setupChannel(sendChannel)


        connection.createOffer().then(o => {
            connection.setLocalDescription(o)
            document.getElementById('connect').onclick = setRemoteID
        })

    }
    else{
        connection.ondatachannel = e => setupChannel(e.channel)
        setRemoteID();
        await connection.createAnswer().then(a => connection.setLocalDescription(a))
    }

}