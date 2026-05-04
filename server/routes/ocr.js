import { Router } from 'express';

const router = Router();

/**
 * POST /api/ocr
 * Body: { imageBase64: string }  — JPEG/PNG as base64, no data-URI prefix
 * Returns: { text: string }
 *
 * Calls Google Cloud Vision TEXT_DETECTION.
 * Protected by verifyToken (applied in server/index.js).
 */
router.post('/', async (req, res) => {
  const { imageBase64 } = req.body;

  if (!imageBase64 || typeof imageBase64 !== 'string' || imageBase64.length > 2_000_000) {
    return res.status(400).json({ error: 'imageBase64 inválido ou muito grande' });
  }

  const apiKey = process.env.GOOGLE_VISION_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Vision API não configurada no servidor' });
  }

  let visionRes;
  try {
    visionRes = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [{
            image: { content: imageBase64 },
            features: [{ type: 'TEXT_DETECTION', maxResults: 1 }],
          }],
        }),
      },
    );
  } catch (err) {
    console.error('[OCR] Falha na chamada ao Vision API:', err);
    return res.status(502).json({ error: 'Erro ao contactar o Vision API', detail: String(err) });
  }

  if (!visionRes.ok) {
    const body = await visionRes.text();
    console.error('[OCR] Vision API respondeu', visionRes.status, body.slice(0, 400));
    return res.status(502).json({ error: `Vision API ${visionRes.status}`, detail: body.slice(0, 300) });
  }

  const json = await visionRes.json();
  const text = json.responses?.[0]?.textAnnotations?.[0]?.description ?? '';
  res.json({ text });
});

/**
 * POST /api/ocr/page
 * Body: { imageBase64: string }  — full page JPEG/PNG as base64, up to 5 MB
 * Returns: { text: string }      — all text detected across the page
 *
 * Uses DOCUMENT_TEXT_DETECTION which is optimised for multiple text regions
 * (ideal for a table of stickers laid flat with codes visible).
 */
router.post('/page', async (req, res) => {
  const { imageBase64 } = req.body;

  if (!imageBase64 || typeof imageBase64 !== 'string' || imageBase64.length > 5_000_000) {
    return res.status(400).json({ error: 'imageBase64 inválido ou muito grande' });
  }

  const apiKey = process.env.GOOGLE_VISION_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Vision API não configurada no servidor' });
  }

  let visionRes;
  try {
    visionRes = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [{
            image: { content: imageBase64 },
            features: [{ type: 'DOCUMENT_TEXT_DETECTION', maxResults: 1 }],
          }],
        }),
      },
    );
  } catch (err) {
    console.error('[OCR-page] Falha na chamada ao Vision API:', err);
    return res.status(502).json({ error: 'Erro ao contactar o Vision API', detail: String(err) });
  }

  if (!visionRes.ok) {
    const body = await visionRes.text();
    console.error('[OCR-page] Vision API respondeu', visionRes.status, body.slice(0, 400));
    return res.status(502).json({ error: `Vision API ${visionRes.status}`, detail: body.slice(0, 300) });
  }

  const json = await visionRes.json();
  // DOCUMENT_TEXT_DETECTION returns fullTextAnnotation; fallback to textAnnotations
  const text =
    json.responses?.[0]?.fullTextAnnotation?.text ??
    json.responses?.[0]?.textAnnotations?.[0]?.description ??
    '';
  console.log('[OCR-page] texto detectado:', JSON.stringify(text.slice(0, 200)));
  res.json({ text });
});

export default router;
