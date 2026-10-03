import mongoose from "mongoose";

export async function connectDB(): Promise<void> {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI as string);
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (err: any) {
    console.error(`MongoDB connection error: ${err.message}`);
    process.exit(1);
  }
}
