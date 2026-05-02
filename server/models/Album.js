import mongoose from 'mongoose';

const albumSchema = new mongoose.Schema(
  {
    albumId: { type: String, required: true, unique: true },
    ownedStickers: { type: [Number], default: [] },
  },
  { timestamps: true },
);

export const Album = mongoose.model('Album', albumSchema);
