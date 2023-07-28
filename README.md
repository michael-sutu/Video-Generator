# Shepherd-Video-V2

### Setup
Clone the GitHub repo and install all the needed dependencies. 
Download and setup ffmpeg `https://phoenixnap.com/kb/ffmpeg-windows`.

### Useage
Run `node index.js`.
Go to `http://localhost:1000`.
Click "Start Generating".
Wait for final mp4 file to be downloaded.

### Extra
Close out of all other tabs to get a better result video and for it to generate faster. 
The video generation process might take some time. 

### How it Works
The text is gotten from the api and a random video file is picked. A canvas is created which is being recorded. The video file is played and its contents are being written to the background of the canvas while the text is being written on top. Then the mp3 file is generated from elevenlabs. The canvas's mp4 and the mp3 file are then sent to the backend to be merged together with ffmpeg, then the result is downloaded. 

### Ideas on How to Make Better
Generate the mp3 file in the backend while the canvas is being recorded.
See if there is any way with ffmpeg to write a png image onto a video. This way you can make an image out of the text and just write it over the video file without anything having to be written over on to the canvas. 
