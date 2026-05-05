import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';

export const runtime = 'nodejs';
export const maxDuration = 120;

const BUCKET = 'media';
const STYLE_SUFFIX = ', Canon EOS R5 wildlife photography, 8K UHD, 16:9 cinematic aspect ratio, National Geographic documentary style, ultra-realistic fur and feathers texture, realistic animal eyes, natural environmental textures, professional safari telephoto lens, natural color grading, sharp depth of field, HDR, no AI smoothness, no plastic texture, no overprocessed look, real-life photography realism, cinematic wildlife framing';

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

async function uploadToSupabase(imageBuffer, name) {
  const admin = getAdminClient();
  const [avifBuf, webpBuf] = await Promise.all([
    sharp(imageBuffer).avif({ quality: 78, effort: 4 }).toBuffer(),
    sharp(imageBuffer).webp({ quality: 82, effort: 4 }).toBuffer(),
  ]);
  const [r1, r2] = await Promise.all([
    admin.storage.from(BUCKET).upload(`ai/${name}.avif`, avifBuf, { contentType: 'image/avif', upsert: true }),
    admin.storage.from(BUCKET).upload(`ai/${name}.webp`, webpBuf, { contentType: 'image/webp', upsert: true }),
  ]);
  if (r1.error) throw new Error(r1.error.message);
  if (r2.error) throw new Error(r2.error.message);
  const base = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}`;
  const result = {
    avif: `${base}/ai/${name}.avif`,
    webp: `${base}/ai/${name}.webp`,
    primary: `${base}/ai/${name}.webp`,
  };

  // Register in media_library so AI-generated images show up in /admin/organization/media
  try {
    const { registerMedia } = await import('@/lib/media/library');
    await registerMedia({
      filename: `${name}.webp`,
      originalFilename: `ai-${name}.webp`,
      storagePath: `ai/${name}.webp`,
      fileUrl: result.webp,
      fileType: 'image/webp',
      mediaKind: 'image',
      fileSize: webpBuf.length,
      source: 'ai-generated',
      variants: {
        sources: [
          { src: result.avif, type: 'image/avif' },
          { src: result.webp, type: 'image/webp' },
        ],
        avifPath: `ai/${name}.avif`,
        webpPath: `ai/${name}.webp`,
      },
    });
  } catch { /* never break image gen on bookkeeping */ }

  return result;
}

async function generateWithOpenAI(prompt, apiKey) {
  const { OpenAI } = await import('openai');
  const client = new OpenAI({ apiKey: apiKey || process.env.OPENAI_API_KEY });
  const response = await client.images.generate({
    model: 'dall-e-3',
    prompt: `${prompt}${STYLE_SUFFIX}`,
    size: '1792x1024',
    quality: 'hd',
    style: 'natural',
    n: 1,
  });
  const imageUrl = response.data[0].url;
  const imgResponse = await fetch(imageUrl);
  const buffer = Buffer.from(await imgResponse.arrayBuffer());
  return buffer;
}

async function fetchAsBase64(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Source image fetch failed: ${r.status}`);
  const ct = r.headers.get('content-type') || 'image/png';
  const buf = Buffer.from(await r.arrayBuffer());
  return { mimeType: ct.split(';')[0].trim(), data: buf.toString('base64') };
}

async function generateWithGemini(prompt, { aspectRatio = '16:9', imageSize = '2K', inputImageUrl, apiKey } = {}) {
  const key = apiKey || process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY not configured');
  const model = process.env.GEMINI_IMAGE_MODEL || 'gemini-3.1-flash-image-preview';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  const parts = [{ text: `${prompt}${STYLE_SUFFIX}` }];
  if (inputImageUrl) {
    const src = await fetchAsBase64(inputImageUrl);
    parts.push({ inlineData: src });
  }

  const body = {
    contents: [{ parts }],
    generationConfig: {
      responseModalities: ['TEXT', 'IMAGE'],
      // Omit imageConfig on edits to preserve composition; set it for fresh generations
      ...(inputImageUrl ? {} : { imageConfig: { aspectRatio, imageSize } }),
      thinkingConfig: { thinkingLevel: 'minimal' },
    },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await res.text();
    if (res.status === 429) throw new Error('Gemini rate limit hit. Try again in a moment.');
    if (res.status === 400) throw new Error(`Gemini rejected the request: ${txt.slice(0, 240)}`);
    throw new Error(`Gemini ${res.status}: ${txt.slice(0, 240)}`);
  }
  const data = await res.json();
  const block = data.promptFeedback?.blockReason;
  if (block) throw new Error(`Prompt blocked by safety filter: ${block}. Try rephrasing.`);
  const candidate = data.candidates?.[0];
  const imgPart = candidate?.content?.parts?.find(p => p.inlineData);
  if (!imgPart) {
    const reason = candidate?.finishReason || 'unknown';
    throw new Error(`No image returned by Gemini (finishReason=${reason}).`);
  }
  return Buffer.from(imgPart.inlineData.data, 'base64');
}

async function generateImage({ prompt, provider, aspectRatio, inputImageUrl, apiKey }) {
  if (provider === 'gemini') {
    return generateWithGemini(prompt, { aspectRatio, inputImageUrl, apiKey });
  }
  return generateWithOpenAI(prompt, apiKey);
}

async function enrichPromptWithAI(heading, context, provider) {
  const model = provider === 'openai'
    ? openai(process.env.OPENAI_MODEL || 'gpt-4o')
    : anthropic(process.env.ANTHROPIC_MODEL || 'claude-opus-4-7');

  const { text } = await generateText({
    model,
    prompt: `Create a detailed wildlife photography prompt for an image to accompany this article section.

Section heading: "${heading}"
Section content: ${context.slice(0, 600)}

Requirements:
- Describe exact animals, their behavior, pose
- Specify environment, lighting, time of day
- Include geographic setting if discernible
- Create dramatic wildlife composition
- Be specific (not generic) — based on the actual content

Return ONLY the image description prompt (50-80 words, no preamble).`,
    temperature: 0.6,
    maxTokens: 200,
  });
  return text.trim();
}

export async function POST(req) {
  try {
    const {
      prompt, mode = 'text_to_image', provider = 'openai',
      aspectRatio, inputImageUrl,
      headings, context, apiKey,
    } = await req.json();

    // Bulk mode
    if (mode === 'bulk' && Array.isArray(headings)) {
      const results = [];
      for (const item of headings) {
        try {
          const enriched = await enrichPromptWithAI(item.heading, item.context || '', provider);
          const buffer = await generateImage({ prompt: enriched, provider, aspectRatio, apiKey });
          const uid = `bulk-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
          const urls = await uploadToSupabase(buffer, uid);
          results.push({
            heading: item.heading,
            imageUrl: urls.primary,
            webp: urls.webp,
            avif: urls.avif,
            altText: `${item.heading} — wildlife photography`,
            caption: item.heading,
            prompt: enriched,
            status: 'done',
          });
        } catch (err) {
          results.push({ heading: item.heading, status: 'error', error: err.message });
        }
      }
      return Response.json({ success: true, results });
    }

    // Single image (text_to_image or transform)
    if (!prompt) return Response.json({ error: 'Prompt required' }, { status: 400 });

    const buffer = await generateImage({
      prompt, provider, aspectRatio,
      inputImageUrl: mode === 'transform' ? inputImageUrl : undefined,
      apiKey,
    });
    const uid = `img-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const urls = await uploadToSupabase(buffer, uid);

    return Response.json({
      success: true,
      imageUrl: urls.primary,
      webp: urls.webp,
      avif: urls.avif,
      altText: prompt.slice(0, 100),
      caption: prompt.slice(0, 120),
    });
  } catch (err) {
    console.error('[AI Image]', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
