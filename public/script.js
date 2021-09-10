

var peer = null;
const videoGrid = document.getElementById("video-grid");
var sstream
var connected = false

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

console.log("4")


  console.log("Creating Room")

  navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
  }).then(gotMedia).catch(() => { })


  function gotMedia(stream) {

    console.log("1")
    peer = new SimplePeer({
      initiator: location.hash === '#init',
      stream: stream,
      trickle: false
    })  

    sstream = stream
    peer.on('signal', function (data) {
      console.log("Signal Recieved")
      console.log(data)
      document.getElementById('myID').value = JSON.stringify(data)

    })


    document.getElementById('connect').addEventListener('click', function () {
      console.log("Connect button clicked")
      var otherId = JSON.parse(document.getElementById('otherID').value)
      peer.signal(otherId)
    })

    document.getElementById('send').addEventListener('click', function () {
      console.log("Send Button pressed")
      var yourMessage = document.getElementById('message').value
      peer.send(yourMessage)
    })

    peer.on('data', function (data) {
      console.log("Data recieved")
      document.getElementById('msgBox').textContent += data + '\n'
    })

    peer.on('stream', function (stream) {
      addStream(stream)
    })

    peer.on('connect', function () {
      connected=true
    })

    peer.on('negotiate', function () {
      console.log("negotiate")
    })

    

    console.log("HAHAA")
    peer.on('track', (track, stream) => {
      console.log("Track recieved")
    })

    
  }


function addStream(stream){
  console.log("Stream being added")
  var video = document.createElement('video')

  video.srcObject = stream
  video.controls = true;
  video.play()
  videoGrid.append(video)
}

  const toggleScreen = async () => {

      var screenStream = await navigator.mediaDevices.getDisplayMedia({ audio: true, video: true })
          
      console.log(screenStream.getVideoTracks())
      peer.addTrack(screenStream.getVideoTracks()[0],sstream)
      console.log("hello")

};


function toggleCamera(){
  console.log(sstream.getVideoTracks())
}