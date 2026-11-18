# Video Generator

Video Generator is a versatile web application that automates the creation of videos by combining randomly selected backgrounds with text pulled from an API. It provides an easy-to-use platform for generating unique videos with custom text overlays, suitable for content creation, marketing, and more.

## Features

- **Automated Video Creation:** Combine text and backgrounds to create unique videos.
- **Custom Text Overlays:** Fetch text from an API to overlay on video backgrounds.
- **Flexible File Handling:** Support for multiple video and audio formats with conversion capabilities.
- **Web Interface:** Simple web interface for uploading background and text data.

## Getting Started

### Prerequisites

- Node.js installed on your system.
- FFmpeg installed for video processing.

### Installation

1. Clone the repository to your local machine:
    ```bash
    git clone https://github.com/michael-sutu/Video-Generator.git
    ```
2. Navigate to the project directory:
    ```bash
    cd Video-Generator
    ```
3. Install the required dependencies:
    ```bash
    npm install
    ```

### Running the Application

1. Start the application:
    ```bash
    npm start
    ```
2. Open your web browser and navigate to:
    ```plaintext
    http://127.0.0.1:3000
    ```
3. Use the web interface to upload your videos and audio files or to merge them with custom text overlays.

## Usage

- **Uploading Files:** Use the web interface to upload background videos and optional audio files. Ensure the files adhere to the supported formats (.mp4 for videos, .mp3 for audio).
- **Generating Videos:** After uploading, the system automatically fetches text from a predefined API and overlays it onto the chosen background video.
- **Downloading:** Once the video is generated, you can download it directly from the web interface.

## File Structure

- `uploads/`: Temporary storage for uploaded video and audio files.
- `conversions/`: Temporary storage for video conversions.
- `Videos/`: Storage for final video outputs.
- `index.html`: Frontend HTML file for the web interface.
- `script.js`: Frontend JavaScript for handling UI interactions.

## Technologies

- **Express.js:** For setting up the server and handling HTTP requests.
- **Multer:** For handling file uploads.
- **FFmpeg:** For video processing and conversion.
- **Node.js:** Backend JavaScript runtime environment.

## Upload and runtime limits

Use Node 22 or later and an up-to-date FFmpeg installation with libx264 and AAC support. Run `npm ci --ignore-scripts --no-audit`, `npm test`, and `npm start`. Set `HOST=0.0.0.0` only when intentionally exposing the service; `PORT` defaults to 3000.

The merge API accepts one MP4/WebM video and one MP3 audio file, at most 100 MiB each. Two jobs can run at once; each has a separate temporary directory removed after success or failure. Processing stops after 120 seconds, 10 minutes of output, or 200 MiB of output. Uploaded files are parsed only as media, with network input protocols disabled. The media test uses the local FFmpeg executable and requires no external services.
