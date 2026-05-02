import { Router } from 'express';
import { Album } from '../models/Album.js';

const router = Router();

/** Get or create the singleton album document */
async function getAlbum() {
  const album = await Album.findOneAndUpdate(
    { albumId: 'main' },
    { $setOnInsert: { ownedStickers: [] } },
    { new: true, upsert: true },
  );
  return album;
}

// GET /api/album
router.get('/', async (_req, res) => {
  try {
    const album = await getAlbum();
    res.json({ ownedStickers: album.ownedStickers });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/album/sticker  { number: 42 }
router.post('/sticker', async (req, res) => {
  const { number } = req.body;
  if (typeof number !== 'number' || !Number.isInteger(number) || number < 1) {
    return res.status(400).json({ error: 'Invalid sticker number' });
  }
  try {
    const album = await Album.findOneAndUpdate(
      { albumId: 'main' },
      { $addToSet: { ownedStickers: number } },
      { new: true, upsert: true },
    );
    res.json({ ownedStickers: album.ownedStickers });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/album/sticker/:number
router.delete('/sticker/:number', async (req, res) => {
  const number = parseInt(req.params.number, 10);
  if (isNaN(number) || number < 1) {
    return res.status(400).json({ error: 'Invalid sticker number' });
  }
  try {
    const album = await Album.findOneAndUpdate(
      { albumId: 'main' },
      { $pull: { ownedStickers: number } },
      { new: true, upsert: true },
    );
    res.json({ ownedStickers: album.ownedStickers });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/album/stickers/bulk  { numbers: [1, 2, 3] }
router.post('/stickers/bulk', async (req, res) => {
  const { numbers } = req.body;
  if (!Array.isArray(numbers)) {
    return res.status(400).json({ error: 'numbers must be an array' });
  }
  const valid = numbers.filter(
    (n) => typeof n === 'number' && Number.isInteger(n) && n >= 1 && n <= 9999,
  );
  try {
    const album = await Album.findOneAndUpdate(
      { albumId: 'main' },
      { $addToSet: { ownedStickers: { $each: valid } } },
      { new: true, upsert: true },
    );
    res.json({ ownedStickers: album.ownedStickers });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
