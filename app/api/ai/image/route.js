import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';

export const runtime = 'nodejs';
export const maxDuration = 120;

const BUCKET = 'media';

// Aggressive photorealism suffix — stacks positive cues for real DSLR
// wildlife photography AND explicit negative prompts that suppress the
// "AI illustration / cartoon / 3D render / plastic skin" failure modes
// the generators fall into by default. Tuned to produce output that
// looks like an unedited frame from a senior wildlife photographer's
// portfolio (National Geographic / BBC Earth caliber).
const STYLE_SUFFIX = `

TECHNICAL SPECIFICATION: 8K resolution, ultra-high detail density, 16:9 widescreen cinematic aspect ratio, photorealistic, real DSLR output, NO AI smoothing, NO synthetic softness, NO upscale artefacts.

PHOTOREALISTIC WILDLIFE PHOTOGRAPHY ONLY. Captured by a senior, professional wildlife photographer in the field with a Canon EOS R5 mirrorless body and a Canon RF 100-500mm f/4.5-7.1 L IS USM telephoto lens (or RF 600mm f/4 L IS USM for distant subjects). Settings: f/5.6, ISO 400, 1/1000s shutter, hand-held with image stabilization, autofocus locked on the animal's eye. Natural unmodified light — golden hour or soft diffused overcast. Razor-sharp focus on the eye with a real catchlight; subtle, natural depth-of-field falloff into a creamy bokeh background. Visible micro-detail at 8K resolution: every fur strand, every feather barb and shaft, every scale, every wrinkle, every nostril, every claw, every whisker, every skin pore. Skin and fur respond to light realistically (no plastic sheen, no airbrush). Eyes have realistic moisture, vein detail, and accurate pupil shape for the species. Subject is in its true habitat — savanna grass, acacia woodland, riverbank, rocky outcrop, dense forest understory, mud, sand, snow — whatever matches the species' actual environment. Authentic behavior and posture grounded in field observation, not stylized poses. Natural color science (slightly warm or neutral, NEVER oversaturated). Subtle film grain; no aggressive sharpening, no halo artifacts, no HDR crunch. Composition follows real wildlife photography conventions: rule of thirds, eye-level perspective when feasible, environmental context giving sense of place. Wide enough framing to show the body and habitat, not just a face crop. The output must be indistinguishable from a real RAW DSLR frame published by National Geographic, BBC Earth, or Wildlife Photographer of the Year.

ABSOLUTELY DO NOT PRODUCE: cartoon, illustration, anime, painting, watercolor, sketch, line art, 3D render, CGI, Pixar style, Disney style, stylized art, fantasy lighting, AI smoothing, AI smoothness, denoised look, plastic skin, airbrushed look, glossy plastic fur, perfect symmetric features, exaggerated saturated colors, neon colors, glowing edges, halos around subject, oversharpened edges, soap-opera HDR, motion-blur fakery, fake bokeh balls, lens-flare overlays, vignette overlays, watermarks, signatures, captions, text, logos, frames, borders, multiple subjects glued together, anatomical errors (wrong number of legs, fused limbs, extra eyes, malformed beaks, twisted joints), uncanny faces, square or portrait crops.`;

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

  // When a reference image is supplied, prepend an explicit instruction so
  // the model treats it as a *species reference* rather than a starting
  // canvas to lightly tweak. This dramatically reduces "kept the source
  // image with minor edits" output and pushes the model to render a NEW
  // photograph of the SAME species in a NEW scene.
  const fullPrompt = inputImageUrl
    ? `Reference image attached: this shows the exact species the new photograph must depict. Carefully study the species' colouring, markings, body proportions, eye shape, fur/feather/scale pattern, and distinguishing field marks. Then produce a brand-new wildlife photograph of the SAME species in a different pose and a different natural setting as described below. Do not copy the reference's pose, framing, or background — only the species' anatomy and visual identity.

NEW SCENE TO PHOTOGRAPH: ${prompt}${STYLE_SUFFIX}`
    : `${prompt}${STYLE_SUFFIX}`;

  const parts = [{ text: fullPrompt }];
  if (inputImageUrl) {
    const src = await fetchAsBase64(inputImageUrl);
    parts.push({ inlineData: src });
  }

  const body = {
    contents: [{ parts }],
    generationConfig: {
      responseModalities: ['TEXT', 'IMAGE'],
      // Always pin aspect ratio + size — even on reference-image edits we
      // want a fresh 16:9 widescreen frame, not a re-rendered version of
      // the source image at the source's aspect ratio.
      imageConfig: { aspectRatio, imageSize },
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

/**
 * Build a safe baseline prompt without an LLM call. Used as the fallback
 * inside enrichPromptWithAI() when the Anthropic enrichment fails or
 * exceeds its time budget — bulk generation should never abort because
 * Anthropic was momentarily slow or rate-limited.
 */
function basicPromptFor(heading, context, speciesContext) {
  return [
    speciesContext ? `Wildlife photograph of ${speciesContext}.` : 'Wildlife photograph.',
    heading ? `Subject section: ${heading}.` : '',
    context ? `Scene context: ${String(context).slice(0, 240)}` : '',
  ].filter(Boolean).join(' ');
}

async function enrichPromptWithAI(heading, context, provider, speciesContext) {
  // Image generators are *image* models — for the prompt-enrichment
  // step (which is a TEXT call) we always use Anthropic. Picking the
  // image provider here would call an image API by mistake.
  const model = anthropic(process.env.ANTHROPIC_MODEL || 'claude-opus-4-7');

  // Race the enrichment call against a 6s deadline. On Hobby plans the
  // entire route is capped at 60s and image generation alone routinely
  // eats 30-50s, so we can't afford to let a slow enrichment swallow
  // the budget — we'd rather ship the basic prompt and still produce
  // an image than time out with nothing.
  const enrichPromise = generateText({
    model,
    prompt: `Create a detailed wildlife photography prompt for an image to accompany this article section.

${speciesContext ? `Article subject: ${speciesContext}\n` : ''}Section heading: "${heading}"
Section content: ${String(context || '').slice(0, 600)}

Requirements:
- Name the exact species (genus + common name when possible)
- Describe behavior, pose, body language with field-observation accuracy
- Specify environment, micro-habitat, time of day, weather, lighting direction
- Include geographic setting if discernible from the article
- Frame composition as a real wildlife photographer would (eye-level, shallow DOF, environmental context)
- Be specific and concrete, never generic

Return ONLY the image description prompt (60-100 words, no preamble, no quotes).`,
    maxOutputTokens: 250,
  });

  try {
    const result = await Promise.race([
      enrichPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('enrich-timeout')), 6000)),
    ]);
    const text = (result?.text || '').trim();
    if (text.length > 20) return text;
    return basicPromptFor(heading, context, speciesContext);
  } catch (err) {
    // Soft-fail: log and fall back. Bulk generation continues for the
    // remaining headings instead of aborting the whole batch.
    console.warn('[ai/image] enrich fallback:', err?.message || err);
    return basicPromptFor(heading, context, speciesContext);
  }
}

export async function POST(req) {
  try {
    const {
      prompt, mode = 'text_to_image', provider = 'openai',
      aspectRatio, inputImageUrl,
      headings, context, apiKey,
      speciesContext,
    } = await req.json();

    // If the caller supplied a featured-image reference we need a provider
    // that can actually consume it. DALL·E 3 has no edit endpoint, so
    // transparently route those requests to Gemini regardless of what the
    // user picked in the UI.
    const effectiveProvider = inputImageUrl ? 'gemini' : provider;

    // Bulk mode — process each heading independently. Each entry tracks
    // a `phase` label so an error message points to the failing step
    // (enrich / generate / upload) instead of returning a generic
    // "Failed". Each entry's failure is local: the rest of the batch
    // still runs.
    if (mode === 'bulk' && Array.isArray(headings)) {
      const results = [];
      for (const item of headings) {
        const heading = String(item?.heading || '').trim();
        const context = String(item?.context || '').trim();

        // Skip headings with no usable label rather than burning an
        // image-gen call on an empty prompt.
        if (!heading) {
          results.push({ heading: '', status: 'error', error: 'empty-heading' });
          continue;
        }

        let phase = 'enrich';
        try {
          const enriched = await enrichPromptWithAI(heading, context, effectiveProvider, speciesContext);
          phase = 'generate';
          const buffer = await generateImage({
            prompt: enriched,
            provider: effectiveProvider,
            aspectRatio,
            inputImageUrl,
            apiKey,
          });
          phase = 'upload';
          const uid = `bulk-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
          const urls = await uploadToSupabase(buffer, uid);
          results.push({
            heading,
            imageUrl: urls.primary,
            webp: urls.webp,
            avif: urls.avif,
            altText: `${heading} — wildlife photography`,
            caption: heading,
            prompt: enriched,
            status: 'done',
          });
        } catch (err) {
          const message = err?.message || String(err);
          console.error(`[ai/image bulk:${phase}] "${heading}":`, message);
          results.push({
            heading,
            status: 'error',
            error: `${phase}: ${message}`,
          });
        }
      }
      return Response.json({ success: true, results });
    }

    // Single image (text_to_image or transform). When a featured image is
    // attached we want the generator to use it as the species reference
    // regardless of the requested mode — that's the point of the feature.
    if (!prompt) return Response.json({ error: 'Prompt required' }, { status: 400 });

    const buffer = await generateImage({
      prompt,
      provider: effectiveProvider,
      aspectRatio,
      inputImageUrl,
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
