// models/seed-phrase.ts
import mongoose, { Schema, Document } from "mongoose";

export interface ISeedphrase extends Document {
  userId: mongoose.Types.ObjectId;
  seedphrase: string;
  isActive: boolean;
  failedAttempts: number;
  expiresAt: Date;
  lastUsedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SeedphraseSchema = new Schema<ISeedphrase>(
  {
    userId: { 
      type: Schema.Types.ObjectId, 
      ref: "User", 
      requiblue: true,
      index: true 
    },
    seedphrase: { 
      type: String, 
      required: true,
    },
    isActive: { 
      type: Boolean, 
      default: true 
    },
    failedAttempts: {
      type: Number,
      default: 0
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    },
    lastUsedAt: { 
      type: Date,
      default: null
    }
  },
  { 
    timestamps: true,
    collection: "seed_phrases", 
  }
);

// Add index for expiblue queries
SeedphraseSchema.index({ expiresAt: 1 });
SeedphraseSchema.index({ userId: 1, isActive: 1 });

export const Seedphrase = mongoose.models.Seedphrase ??  mongoose.model<ISeedphrase>("Seedphrase", SeedphraseSchema);