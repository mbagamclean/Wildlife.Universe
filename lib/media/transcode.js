/**
 * Server-side media transcoding helpers.
 *
 * IMAGES: Sharp → AVIF + WebP at original resolution. Metadata stripped,
 * progressive encoding, tuned for "fast load on poor networks". The
 * <picture> tag with multiple <source>s lets each browser pick the best.
 *
 * VIDEOS: ffmpeg-static → VP9/Opus in WebM at original resolution. CRF 32
 * gives ~50% size reduction vs H.264 at perceptually-equivalent quality.
 * Generates a WebP poster from a frame ~1s in. Falls back to storing the
 * original file if ffmpeg fails or the source is too big to transcode
 * within the function timeout.
 *
 * Vercel: requires Pro plan and `export const maxDuration = 300` on the
 * route. The ffmpeg binary ships via the `ffmpeg-static` npm package.
 */
import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import ffmpegPath from 'ffmpeg-static';

// ── Image ──────────────────────────────────────────────────────────────

/**
 * Convert any image buffer into AVIF + WebP, both at the original
 * resolution. Stripped of metadata, progressive-encoded.
 *
 * AVIF compresses ~50% harder than WebP at perceptually equivalent
 * quality so we run it at q60 vs WebP's q82. The browser picks AVIF
 * if it supports it.
 */
export async function transcodeImage(buffer) {
  // Single load pass, two parallel encodes
  const pipeline = sharp(buffer, { failOn: 'truncated' }).rotate();
  const meta = await pipeline.metadata().catch(() => ({}));

  const [avifBuf, webpBuf] = await Promise.all([
    pipeline
      .clone()
      .avif({
        quality: 60,
        effort: 4,         // 0-9; 4 is balanced (higher = slower)
        chromaSubsampling: '4:2:0',
      })
      .toBuffer(),
    pipeline
      .clone()
      .webp({
        quality: 82,
        effort: 4,
        smartSubsample: true,
      })
      .toBuffer(),
  ]);

  return {
    width: meta.width || null,
    height: meta.height || null,
    avif: avifBuf,
    webp: webpBuf,
    originalBytes: buffer.length,
    avifBytes: avifBuf.length,
    webpBytes: webpBuf.length,
  };
}

// ── Video ──────────────────────────────────────────────────────────────

const TRANSCODE_TIMEOUT_MS = 240_000;        // 4 minutes — leave 60s headroom for the 300s Vercel max
const TRANSCODE_SIZE_LIMIT = 120 * 1024 * 1024; // 120 MB input cap for transcoding
                                              // — bigger files are stored as-is to fit Vercel memory/time

/**
 * Convert a video buffer to VP9/Opus WebM at original resolution +
 * generate a WebP poster. Returns the new buffers, the poster, and a
 * flag telling the caller whether to use this output or fall back.
 *
 * Inputs > 120 MB skip transcoding (stored as-is); a poster is still
 * extracted because that's cheap.
 */
export async function transcodeVideo(buffer, originalMime = 'video/mp4') {
  const tooBig = buffer.length > TRANSCODE_SIZE_LIMIT;

  // Always write the source to a temp file — ffmpeg is more reliable
  // with seekable inputs than with pipes for video.
  const tmpDir = os.tmpdir();
  const stamp = Date.now() + '-' + Math.random().toString(36).slice(2, 8);
  const inputPath  = path.join(tmpDir, `wu-in-${stamp}`);
  const outputPath = path.join(tmpDir, `wu-out-${stamp}.webm`);
  const posterPath = path.join(tmpDir, `wu-poster-${stamp}.png`);

  await fs.writeFile(inputPath, buffer);
  let webmBuffer = null;
  let posterBuffer = null;

  try {
    // 1. Extract poster (cheap, ~1s) — done first so even oversize uploads get one
    try {
      await runFfmpeg([
        '-y', '-ss', '00:00:01', '-i', inputPath,
        '-frames:v', '1',
        '-vf', 'scale=iw:ih',
        '-f', 'image2',
        posterPath,
      ], 30_000).catch(() => {
        // Some short videos don't have a frame at 1s. Try the very first frame.
        return runFfmpeg([
          '-y', '-i', inputPath,
          '-frames:v', '1',
          '-f', 'image2',
          posterPath,
        ], 30_000);
      });
      const rawPoster = await fs.readFile(posterPath).catch(() => null);
      if (rawPoster) {
        posterBuffer = await sharp(rawPoster)
          .webp({ quality: 78, effort: 4 })
          .toBuffer();
      }
    } catch {
      // poster failure is non-fatal
    }

    // 2. Transcode to WebM (skip if too big)
    if (!tooBig) {
      try {
        await runFfmpeg([
          '-y', '-i', inputPath,
          // Video: VP9, constant-quality CRF 32, no upper bitrate, multi-threaded
          '-c:v', 'libvpx-vp9',
          '-crf', '32',
          '-b:v', '0',
          '-row-mt', '1',
          '-tile-columns', '2',
          '-deadline', 'good',     // 'realtime' is faster but lower quality
          '-cpu-used', '4',         // 0-5; 4 is a good speed/quality trade-off
          '-pix_fmt', 'yuv420p',
          // Audio: Opus 96kbps stereo
          '-c:a', 'libopus',
          '-b:a', '96k',
          '-ac', '2',
          // Strip metadata
          '-map_metadata', '-1',
          '-movflags', '+faststart',
          outputPath,
        ], TRANSCODE_TIMEOUT_MS);
        webmBuffer = await fs.readFile(outputPath).catch(() => null);
      } catch {
        webmBuffer = null;
      }
    }

    return {
      webm: webmBuffer,                    // null if skipped/failed
      poster: posterBuffer,                // null if extraction failed
      originalBytes: buffer.length,
      webmBytes: webmBuffer?.length || 0,
      posterBytes: posterBuffer?.length || 0,
      transcoded: !!webmBuffer,
      reason: webmBuffer ? null : (tooBig ? 'too_large' : 'transcode_failed'),
    };
  } finally {
    // Cleanup temp files
    fs.unlink(inputPath).catch(() => {});
    fs.unlink(outputPath).catch(() => {});
    fs.unlink(posterPath).catch(() => {});
  }
}

function runFfmpeg(args, timeoutMs) {
  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegPath, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';
    proc.stderr.on('data', (d) => { stderr += d.toString(); });

    const timer = setTimeout(() => {
      proc.kill('SIGKILL');
      reject(new Error(`ffmpeg timeout after ${timeoutMs}ms`));
    }, timeoutMs);

    proc.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
    proc.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exit ${code}: ${stderr.slice(-500)}`));
    });
  });
}
