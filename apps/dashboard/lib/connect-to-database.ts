import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI!;

let cached = (global as any).mongoose || { conn: null, promise: null };

export async function connectDB() {
  if (cached.conn) {
    console.log("Using existing MongoDB connection");
    return cached.conn;
  }

  if (!cached.promise) {
    console.log("Creating new MongoDB connection...");
    cached.promise = mongoose.connect(MONGODB_URI).then((m) => {
      console.log("MongoDB connected successfully!");
      console.log(`Database: ${m.connection.name}`);
      console.log(`Host: ${m.connection.host}`);
      console.log(`Port: ${m.connection.port}`);
      return m;
    }).catch((error) => {
      console.error("MongoDB connection failed:", error);
      throw error;
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}