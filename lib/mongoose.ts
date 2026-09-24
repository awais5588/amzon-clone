import mongoose from "mongoose";

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/amzonclone";

declare global {
  var _mongooseCache:
    | { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null }
    | undefined;
}

const cache =
  globalThis._mongooseCache ?? { conn: null, promise: null };

if (!globalThis._mongooseCache) {
  globalThis._mongooseCache = cache;
}

export async function connectDB(): Promise<typeof mongoose> {
  if (cache.conn) return cache.conn;
  if (!cache.promise) {
    cache.promise = mongoose
      .connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 })
      .then((m) => m);
  }
  try {
    cache.conn = await cache.promise;
  } catch (err) {
    cache.promise = null;
    console.error("[mongoose] connection failed:", MONGODB_URI, (err as Error).message);
    throw err;
  }
  return cache.conn;
}