import mongoose from 'mongoose';

const albumSchema = new mongoose.Schema(
  {
    albumId: { type: String, required: true, unique: true, default: 'main' },
    ownedStickers: { type: [Number], default: [] },
  },
  { timestamps: true },
);

export const Album = mongoose.model('Album', albumSchema);
