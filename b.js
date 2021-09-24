
var connection = new RTCPeerConnection();

var dataconn = connection.createDataChannel("dc");

connection.onicegatheringstatechange = e =>{
	console.log("State Changed")
	if(connection.iceGatheringState==='complete'){
		console.log("Finished")
		document.getElementById('room').value = JSON.stringify(connection.localDescription)
	}
}

connection.onicecandidate = e=>{
	console.log("New ice candidate")
}

document.getElementById("go").onclick = e=>{
	var other = document.getElementById("other").value
	connection.setRemoteDescription(JSON.parse(other))
	connection.setLocalDescription();
}


connection.onconnectionstatechange = async e=>{
	console.log(connection.connectionState)
	if(connection.connectionState==='connected'){
		await getRtp()
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
