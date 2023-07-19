import express from "express";
import fs from 'fs';
import multer from 'multer';
import * as url from 'url'
import path from "path";
import ffmpeg from 'fluent-ffmpeg';
const __dirname = url.fileURLToPath(new URL('.', import.meta.url))

const app = express();
const storage = multer.diskStorage({
    destination: "uploads/",
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      const fileType = getFileTypeFromMimetype(file.mimetype);
      cb(null, file.fieldname + "-" + uniqueSuffix + "." + fileType);
    },
  });
  
  const getFileTypeFromMimetype = (mimetype) => {
    if (mimetype === "audio/mp3") {
      return "mp3";
    } else if (mimetype === "video/mp4") {
      return "mp4";
    } else if(mimetype == "video/webm") {
      return "webm"
    } else {
      throw new Error("Invalid file type. Only .mp3 and .mp4 files are allowed.");
    }
  };
  
  const fileFilter = (req, file, cb) => {
    // Allow only .mp3 and .mp4 files based on the mimetype
    const allowedMimeTypes = ["audio/mp3", "video/mp4"];
  
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only .mp3 and .mp4 files are allowed."));
    }
  };
  
  const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
  });
  

app.listen(1000);
console.log("Listening at http://localhost:1000");

app.get("/", (req, res) => {
    res.sendFile(__dirname+"/index.html");
});

app.get("/script.js", (req, res) => {
    res.sendFile(__dirname+"/script.js");
});

app.get("/video", (req, res) => { 
    res.sendFile(__dirname+`/Videos/${req.query.id}.mp4`);
});

app.get("/font", (req, res) => {
    res.sendFile(__dirname+"/font.ttf");
});

function convertToMP4(inputFilePath, outputFilePath, callback) {
    ffmpeg(inputFilePath)
      .output(outputFilePath)
      .on('end', () => {
        console.log('Conversion to MP4 completed successfully.');
        callback(null);
      })
      .on('error', (err) => {
        console.error('Error during conversion:', err.message);
        callback(err);
      })
      .run();
  }

app.post("/merge", upload.fields([{ name: "video", maxCount: 1 }, { name: "audio", maxCount: 1 }]), (req, res) => {
    console.log(req.files)
    const videoFile = req.files["video"][0];
    const audioFile = req.files["audio"][0];
  
    const videoPath = path.join(__dirname, videoFile.path);
    const audioPath = path.join(__dirname, audioFile.path);
    convertToMP4(videoPath, __dirname+"conversions/converted.mp4", (e) => {
        ffmpeg()
            .input(__dirname+"conversions/converted.mp4")
            .input(audioPath)
            .outputOptions(['-c:v copy', '-c:a aac', '-map 0:v:0', '-map 1:a:0'])
            .on('error', (err) => {
                console.error('An error occurred:', err.message);
                res.status(500).send("Error occurred during conversion.");
            })
            .on('end', () => {
                console.log('Conversion succeeded!');
                res.download(path.join(__dirname, "output.mp4"), "output.mp4", (err) => {
                    if (err) {
                    console.error('Download error:', err.message);
                    res.status(500).send("Error occurred during download.");
                } else {
                    console.log('Download succeeded!');
                }
                });
            })
            .saveToFile(path.join(__dirname, "output.mp4"), "./temp");
    })
})
  