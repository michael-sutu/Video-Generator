import { spawn } from 'node:child_process';

// Arguments are passed directly, never through a shell. Restrict FFmpeg's input
// formats and protocols so uploaded playlists cannot fetch network resources.
export function mergeMedia(video, audio, output, signal) {
  return new Promise((resolve, reject) => {
    const inputOptions = ['-protocol_whitelist', 'file,pipe', '-format_whitelist', 'mov,matroska,webm,mp3'];
    const child = spawn(process.env.FFMPEG_PATH || 'ffmpeg', [
      '-hide_banner', '-loglevel', 'error', '-nostdin', '-y', '-threads', '1',
      ...inputOptions, '-i', video, ...inputOptions, '-i', audio,
      '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'libx264', '-threads', '1',
      '-preset', 'veryfast', '-c:a', 'aac', '-shortest', '-t', '600',
      '-fs', String(200 * 1024 * 1024), '-movflags', '+faststart', output,
    ], { stdio: 'ignore', signal, timeout: 120_000, killSignal: 'SIGKILL' });
    child.once('error', reject);
    child.once('exit', code => code === 0 ? resolve() : reject(new Error('FFmpeg failed')));
  });
}
