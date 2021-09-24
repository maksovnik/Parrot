const iceConfig = {
    iceServers: [{
        urls: 'stun:stun.l.google.com:19302'
    }]
}

var connection = new RTCPeerConnection(iceConfig);




var dataconn = connection.createDataChannel("dc");

connection.onicegatheringstatechange = e =>{
	console.log("State Changed")
	if(connection.iceGatheringState==='complete'){
		console.log("Finished")
		document.getElementById('room').value = JSON.stringify(connection.localDescription)
	}
}


document.getElementById("go").onclick = e=>{
	var other = document.getElementById("other").value
	connection.setRemoteDescription(JSON.parse(other))
}

connection.onconnectionstatechange = async e=>{
	console.log(connection.connectionState)
	if(connection.connectionState==='connected'){
		await getRtp()
	}
}

connection.onicecandidate = e=>{
	console.log("New ice candidate")
}


connection.setLocalDescription();

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