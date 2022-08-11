



    // if(id == "screen"){
    //     document.getElementById('clrscreen').onclick = async e => {
    //         this.screenSenders.forEach(sender => connection.removeTrack(sender))
    //         this.tracks.forEach(track => this.of[id].removeTrack(track))
    //         this.of[id].onremovetrack();
    //     }
    // }

	// document.getElementById(id).onclick = async e => {
	// 	if (this.camOn && id == 'camera') {
	// 		//document.getElementById(id + 'I').src = 'icons/' + id + "Off.png";
	// 		this.senders.forEach(sender => connection.removeTrack(sender))
	// 		this.tracks.forEach(track => this.of[id].removeTrack(track))
	// 		this.of[id].onremovetrack();

	// 	} else {
	// 		//document.getElementById(id + 'I').src = 'icons/' + id + "On.png";

	// 		if (id === 'camera') {
	// 			this.stream = await navigator.mediaDevices.getUserMedia({
	// 				video: true,
	// 				audio: {
	// 					autoGainControl: false,
	// 					channelCount: 2,
	// 					echoCancellation: false,
	// 					latency: 0,
	// 					noiseSuppression: false,
	// 					sampleRate: 48000,
	// 					sampleSize: 16,
	// 					volume: 1.0
	// 				}
	// 			})
	// 			this.of[id] = camera
	// 		}

	// 		if (id === 'screen') {
	// 			this.stream = await navigator.mediaDevices.getDisplayMedia({
	// 				video: true,
	// 				audio: {
	// 					autoGainControl: false,
	// 					channelCount: 2,
	// 					echoCancellation: false,
	// 					latency: 0,
	// 					noiseSuppression: false,
	// 					sampleRate: 48000,
	// 					sampleSize: 16,
	// 					volume: 1.0
	// 				}
					
	// 			})
	// 			this.of[id] = this.stream;
	// 		}

	// 		this.tracks = this.stream.getTracks()
	// 		this.tracks.forEach(track => {
	// 			if (id === 'camera') {
	// 				this.of[id].addTrack(track)
	// 			}
	// 			onTrack(track, this.of[id], true)
	// 			this.senders.push(connection.addTrack(track, this.of[id]))
	// 		})
	// 	}

		
	// 	if (connected) {
	// 		connection.setLocalDescription(await connection.createOffer({
	// 			iceRestart: true
	// 		}))
	// 	}

	// }
