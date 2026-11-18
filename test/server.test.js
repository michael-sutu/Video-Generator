import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtemp, readdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createApp } from '../index.js';
const exec = promisify(execFile);

function form(video = 'video', audio = 'audio') {
  const data = new FormData();
  if (video !== null) data.append('video', new Blob([video], { type: 'video/webm' }), 'untrusted.webm');
  if (audio !== null) data.append('audio', new Blob([audio], { type: 'audio/mpeg' }), 'untrusted.mp3');
  return data;
}
async function serve(t, options = {}) {
  const root = await mkdtemp(path.join(tmpdir(), 'video-test-'));
  const server = createApp({ uploadRoot: root, ...options }).listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(async () => {
    await new Promise(resolve => server.close(resolve));
    await rm(root, { recursive: true, force: true });
  });
  return { url: `http://127.0.0.1:${server.address().port}`, root };
}
async function cleaned(root) {
  for (let i = 0; i < 100; i++) {
    if (!(await readdir(root)).length) return;
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  assert.deepEqual(await readdir(root), []);
}

test('video selection rejects traversal, repeated IDs and non-catalog files', async t => {
  const { url } = await serve(t);
  for (const query of ['id=..%2Fconversions%2Fconverted', 'id=1&id=2', 'id=99', 'id[]=1']) {
    assert.equal((await fetch(`${url}/video?${query}`)).status, 400);
  }
  const response = await fetch(`${url}/video?id=1`);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /video\/mp4/);
  await response.body.cancel();
});

test('missing, unsupported, unexpected and oversized uploads fail and are removed', async t => {
  const { url, root } = await serve(t, { maxFileSize: 8 });
  assert.equal((await fetch(`${url}/merge`, { method: 'POST', body: form('v', null) })).status, 400);
  const invalid = new FormData();
  invalid.append('video', new Blob(['<html>'], { type: 'text/html' }), 'evil.mp4');
  assert.equal((await fetch(`${url}/merge`, { method: 'POST', body: invalid })).status, 415);
  const unexpected = form('v', 'a');
  unexpected.append('extra', 'field');
  assert.equal((await fetch(`${url}/merge`, { method: 'POST', body: unexpected })).status, 400);
  assert.equal((await fetch(`${url}/merge`, { method: 'POST', body: form('way too many bytes', 'a') })).status, 413);
  await cleaned(root);
});

test('simultaneous jobs use separate inputs and output files', async t => {
  const outputs = new Set();
  const { url, root } = await serve(t, { merge: async (video, audio, output) => {
    outputs.add(output);
    assert.equal(path.dirname(video), path.dirname(output));
    assert.equal(path.dirname(audio), path.dirname(output));
    await new Promise(resolve => setTimeout(resolve, 20));
    await writeFile(output, await readFile(audio));
  } });
  const results = await Promise.all(['first', 'second'].map(async marker => {
    const response = await fetch(`${url}/merge`, { method: 'POST', body: form('v', marker) });
    assert.equal(response.status, 200);
    return response.text();
  }));
  assert.deepEqual(results, ['first', 'second']);
  assert.equal(outputs.size, 2);
  await cleaned(root);
});

test('processing failure returns one generic response and cleans files', async t => {
  const { url, root } = await serve(t, { merge: async () => { throw new Error('private file information'); } });
  const response = await fetch(`${url}/merge`, { method: 'POST', body: form() });
  assert.equal(response.status, 500);
  assert.equal(await response.text(), 'Video processing failed.');
  await cleaned(root);
});

test('real local FFmpeg converts uploaded WebM and MP3 to downloadable MP4', async t => {
  const fixtures = await mkdtemp(path.join(tmpdir(), 'ffmpeg-fixtures-'));
  t.after(() => rm(fixtures, { recursive: true, force: true }));
  const video = path.join(fixtures, 'video.webm');
  const audio = path.join(fixtures, 'audio.mp3');
  await exec('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', 'color=c=blue:s=64x64:d=1', '-c:v', 'libvpx', '-threads', '1', video]);
  await exec('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=1', audio]);
  const { url, root } = await serve(t);
  const response = await fetch(`${url}/merge`, { method: 'POST', body: form(await readFile(video), await readFile(audio)) });
  assert.equal(response.status, 200);
  const output = path.join(fixtures, 'result.mp4');
  await writeFile(output, Buffer.from(await response.arrayBuffer()));
  const { stdout } = await exec('ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_name,codec_type', '-of', 'json', output]);
  const streams = JSON.parse(stdout).streams;
  assert.ok(streams.some(stream => stream.codec_type === 'video' && stream.codec_name === 'h264'));
  assert.ok(streams.some(stream => stream.codec_type === 'audio' && stream.codec_name === 'aac'));
  await cleaned(root);
});
