import express from 'express';
import multer from 'multer';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { mergeMedia } from './media.js';

const directory = fileURLToPath(new URL('.', import.meta.url));
const types = { 'video/mp4': 'mp4', 'video/webm': 'webm', 'audio/mpeg': 'mp3', 'audio/mp3': 'mp3' };

export function createApp({ merge = mergeMedia, uploadRoot = tmpdir(), maxFileSize = 100 * 1024 * 1024 } = {}) {
  const app = express();
  app.disable('x-powered-by');
  let active = 0;
  for (const [route, filename] of [['/', 'index.html'], ['/script.js', 'script.js'], ['/font', 'font.ttf']]) {
    app.get(route, (req, res) => res.sendFile(path.join(directory, filename)));
  }
  app.get('/video', (req, res) => {
    if (typeof req.query.id !== 'string' || !/^[1-4]$/.test(req.query.id)) {
      return res.status(400).send('Invalid video ID.');
    }
    res.sendFile(`${req.query.id}.mp4`, { root: path.join(directory, 'Videos'), dotfiles: 'deny' });
  });

  const upload = multer({
    storage: multer.diskStorage({
      destination: (req, file, done) => done(null, req.workDirectory),
      filename: (req, file, done) => done(null, `${randomUUID()}.${types[file.mimetype]}`),
    }),
    limits: { fileSize: maxFileSize, files: 2, fields: 0, parts: 2, fieldNameSize: 20 },
    fileFilter: (req, file, done) => {
      const allowed = file.fieldname === 'video' ? ['video/mp4', 'video/webm'] : ['audio/mpeg', 'audio/mp3'];
      if (!allowed.includes(file.mimetype)) {
        return done(Object.assign(new Error('Unsupported media type.'), { status: 415 }));
      }
      done(null, true);
    },
  }).fields([{ name: 'video', maxCount: 1 }, { name: 'audio', maxCount: 1 }]);

  app.post('/merge', async (req, res) => {
    if (active >= 2) return res.status(503).send('Video processing is busy. Try again shortly.');
    active++;
    const controller = new AbortController();
    const abort = () => { if (!res.writableEnded) controller.abort(); };
    res.on('close', abort);
    let workDirectory;
    try {
      workDirectory = await mkdtemp(path.join(uploadRoot, 'video-merge-'));
      req.workDirectory = workDirectory;
      await new Promise((resolve, reject) => upload(req, res, error => error ? reject(error) : resolve()));
      if (!req.files?.video?.[0] || !req.files?.audio?.[0]) {
        return res.status(400).send('One video and one audio file are required.');
      }
      const output = path.join(workDirectory, 'output.mp4');
      await merge(req.files.video[0].path, req.files.audio[0].path, output, controller.signal);
      await new Promise((resolve, reject) => {
        res.download(output, 'output.mp4', error => error ? reject(error) : resolve());
      });
    } catch (error) {
      if (!res.headersSent && !res.destroyed) {
        const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : error instanceof multer.MulterError ? 400 : error.status || 500;
        res.status(status).send(status === 500 ? 'Video processing failed.' : error.message);
      }
    } finally {
      res.removeListener('close', abort);
      if (workDirectory) await rm(workDirectory, { recursive: true, force: true });
      active--;
    }
  });
  return app;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 3000);
  const host = process.env.HOST || '127.0.0.1';
  const server = createApp().listen(port, host, () => console.log(`Listening at http://${host}:${port}`));
  server.requestTimeout = 120_000;
}
