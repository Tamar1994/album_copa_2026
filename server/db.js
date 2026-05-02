import mongoose from 'mongoose';
import dns from 'dns';

// Force a public DNS server so Node.js can resolve MongoDB Atlas SRV records
// (Windows' default DNS resolver sometimes blocks TCP SRV queries from Node)
dns.setServers(['8.8.8.8', '1.1.1.1']);

export async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI environment variable is not set');
  }

  await mongoose.connect(uri, { dbName: 'album_copa_2026' });
  console.log('Connected to MongoDB');
}
