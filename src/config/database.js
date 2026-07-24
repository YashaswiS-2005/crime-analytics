import mongoose from 'mongoose';
import config from './env.js';

let connectionAttempted = false;

export function isMongoReady() {
  return mongoose.connection.readyState === 1;
}

export async function connectDatabase() {
  if (isMongoReady()) return mongoose;
  if (connectionAttempted) return isMongoReady() ? mongoose : null;

  connectionAttempted = true;

  if (!config.MONGO_URI) {
    console.warn('MongoDB URI not configured. Local JSON fallback is enabled for development.');
    return null;
  }

  try {
    await mongoose.connect(config.MONGO_URI, {
      dbName: config.MONGODB_DB,
      autoIndex: config.NODE_ENV !== 'production',
      serverSelectionTimeoutMS: 5000,
    });
    console.log('MongoDB connected successfully.');
    return mongoose;
  } catch (error) {
    if (config.NODE_ENV === 'production') throw error;
    console.warn(`MongoDB connection failed. Local JSON fallback is enabled: ${error.message}`);
    return null;
  }
}

export async function disconnectDatabase() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}
