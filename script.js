const canvas = document.getElementById('canvas1')
const ctx = canvas.getContext('2d')
let textData1 = ""

const video = document.createElement('video')
video.loop = true
//video.src = `/video?id=${Math.floor(Math.random() * 2) + 1}`
video.src = `/video?id=4`

video.addEventListener('loadedmetadata', function() {
  ctx.drawImage(video, 0, 0)
})

function write(text) {
  let words = text.split(" ")
  let line = ""
  let lines = []

  for (let i = 0; i < words.length; i++) {
    if(words[i] !== "*") {
      let testLine = line + words[i] + " "
      let metrics = ctx.measureText(testLine)
      let testWidth = metrics.width
  
      if (testWidth > 460 && i > 0) {
        lines.push(line)
        line = words[i] + " "
      } else {
        line = testLine
      }
    } else {
      lines.push(line)
      line = ""
      lines.push(" ")
    }
  }

  lines.push(line)

  for (let j = 0; j < lines.length; j++) {
    ctx.fillText(lines[j], canvas.width / 2, 50 + j * 28)
    ctx.strokeText(lines[j], canvas.width / 2, 50 + j * 28)
  }
}

function drawFrame() {
  if (video.paused || video.ended) {
    return;
  }
  
  ctx.drawImage(video, 0, 0)
  write(textData1)
  requestAnimationFrame(drawFrame)
}

const videoElement = document.createElement('video')
document.body.appendChild(videoElement)

const canvasStream = canvas.captureStream()
const mediaRecorder = new MediaRecorder(canvasStream)
let chunks = []

function startRecording() {
  document.querySelector("button").textContent = "Loading..."
  document.querySelector("button").disabled = true
  fetch("https://app.shepherdchat.com/api/get-video-verse")
    .then(response => response.json())
    .then(data => {
      fetch(`https://shepherd-hoster.michael8910.repl.co/create-audio?string=${data.verse+". "+data.interpretation+". "+data.tips[0]+". "+data.tips[1]}}`)
        .then(response => response.json())
        .then(audioData => {
          const newAudio = document.createElement("audio")
          newAudio.preload = "metadata"
          newAudio.id = "audioMP3"
          newAudio.src = `https://shepherd-hoster.michael8910.repl.co/audio/${audioData}`
          document.body.appendChild(newAudio)
          newAudio.onloadedmetadata = function () {
            const text = `${data.verse} * ${data.interpretation} * ${data.tips[0]} * ${data.tips[1]}`
            ctx.font ="24px custom-font"
            ctx.fillStyle = "yellow"
            ctx.textAlign = "center"
            ctx.strokeStyle = "black"
            ctx.lineWidth = 1
            textData1 = text
            video.play()
            drawFrame()
            chunks = []
            mediaRecorder.start()

            setTimeout((e) => {
              mediaRecorder.stop()
            }, newAudio.duration * 1000)
          }
        })
    })
}

function saveVideo() {
  const blob = new Blob(chunks, { type: 'video/mp4' })
  const videoUrl = URL.createObjectURL(blob)
  videoElement.src = videoUrl
  videoElement.controls = true
  videoElement.id = "videoMP4"
  videoElement.download = 'canvas-video.mp4'

  merge()
}

async function merge() {
  const formData = new FormData();
  const videoPlayer = document.getElementById('videoMP4');
  const audioPlayer = document.getElementById('audioMP3');

  try {
    const videoDataResponse = await fetch(videoPlayer.src);
    const videoData = await videoDataResponse.arrayBuffer();

    formData.append("video", new Blob([videoData], { type: "video/mp4" }));

    const audioDataResponse = await fetch(audioPlayer.src);
    const audioData = await audioDataResponse.arrayBuffer();

    formData.append("audio", new Blob([audioData], { type: "audio/mp3" }));

    const response = await fetch("https://shepherd-video-generator.onrender.com/merge", {
      method: "POST",
      body: formData,
    });

    // Create a link to download the merged file
    const downloadLink = document.createElement("a");
    downloadLink.href = URL.createObjectURL(new Blob([await response.blob()]));
    downloadLink.download = "merged_output.mp4";
    downloadLink.style.display = "none";

    // Append the link to the DOM and trigger the click event to download the file
    document.body.appendChild(downloadLink);
    downloadLink.click();

    // Clean up the link element
    document.body.removeChild(downloadLink);
  } catch (error) {
    console.error("Error:", error.message);
    // Handle the error in your preferred way
  }
}

mediaRecorder.addEventListener('dataavailable', function (event) {
  chunks.push(event.data)
})

mediaRecorder.addEventListener('stop', saveVideo);
