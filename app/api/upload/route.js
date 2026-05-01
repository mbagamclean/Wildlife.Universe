import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import ffmpeg from 'fluent-ffmpeg';

// Force Node.js runtime (not Edge) for fs, sharp, ffmpeg access
export const runtime = 'nodejs';

// Allow large file uploads (200 MB)
export const maxDuration = 300; // 5 minute timeout for video encoding

const getUploadsDir = async () => {
  const dir = path.join(process.cwd(), 'public', 'uploads');
  try {
    await fs.access(dir);
  } catch {
    await fs.mkdir(dir, { recursive: true });
  }
  return dir;
};

// Process image
const processImage = async (buffer, filename) => {
  const uploadsDir = await getUploadsDir();
  const avifPath = path.join(uploadsDir, `${filename}.avif`);
  const webpPath = path.join(uploadsDir, `${filename}.webp`);

  const image = sharp(buffer);

  await Promise.all([
    // Primary: AVIF
    image
      .avif({ quality: 75, effort: 4 })
      .toFile(avifPath),
    // Fallback: WebP
    image
      .webp({ quality: 80, effort: 4 })
      .toFile(webpPath)
  ]);

  return {
    type: 'image',
    sources: [
      { src: `/uploads/${filename}.avif`, type: 'image/avif' },
      { src: `/uploads/${filename}.webp`, type: 'image/webp' },
    ],
  };
};

// Process video
const processVideo = (rawPath, filename) => {
  return new Promise(async (resolve, reject) => {
    const uploadsDir = await getUploadsDir();
    const webmPath = path.join(uploadsDir, `${filename}.webm`);
    const mp4Path = path.join(uploadsDir, `${filename}.mp4`);

    let doneCount = 0;
    const sources = [
      { src: `/uploads/${filename}.webm`, type: 'video/webm' },
      { src: `/uploads/${filename}.mp4`, type: 'video/mp4' },
    ];

    const checkDone = () => {
      doneCount++;
      if (doneCount === 2) {
        fs.unlink(rawPath).catch(() => {}); // Clean up raw temp file
        resolve({ type: 'video', sources });
      }
    };

    // Encode to WebM (VP9)
    ffmpeg(rawPath)
      .outputOptions([
        '-c:v libvpx-vp9',
        '-crf 30',
        '-b:v 0',      // use crf only
        '-quality good',
        '-c:a libopus',
        '-b:a 128k',   // reasonable audio bitrate
        '-cpu-used 2', // Speed tradeoff (0-5, 2 is good balance for server encode)
        '-threads 4'
      ])
      .save(webmPath)
      .on('end', checkDone)
      .on('error', (err) => reject(new Error('WebM encoding failed: ' + err.message)));

    // Encode to MP4 (H.264)
    ffmpeg(rawPath)
      .outputOptions([
        '-c:v libx264',
        '-preset veryfast', // speed over compression here to keep things moving
        '-crf 26',          // good fallback compression
        '-c:a aac',
        '-b:a 128k',
        '-movflags +faststart' // optimize for web streaming
      ])
      .save(mp4Path)
      .on('end', checkDone)
      .on('error', (err) => reject(new Error('MP4 encoding failed: ' + err.message)));
  });
};

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');

    if (!isVideo && !isImage) {
      return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 });
    }

    // Size Validations (200MB video, 20MB image)
    const sizeMB = file.size / (1024 * 1024);
    if (isVideo && sizeMB > 200) {
      return NextResponse.json({ error: 'Video exceeds 200MB limit' }, { status: 400 });
    }
    if (isImage && sizeMB > 20) {
      return NextResponse.json({ error: 'Image exceeds 20MB limit' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    let result;

    if (isImage) {
      result = await processImage(buffer, uniqueName);
    } else {
      // Save raw video locally first for ffmpeg processing
      const uploadsDir = await getUploadsDir();
      const rawPath = path.join(uploadsDir, `raw-${uniqueName}`);
      await fs.writeFile(rawPath, buffer);
      
      result = await processVideo(rawPath, uniqueName);
    }

    return NextResponse.json({ success: true, result });
  } catch (err) {
    console.error('Upload error:', err);
    return NextResponse.json({ error: err.message || 'Server error during upload' }, { status: 500 });
  }
}
