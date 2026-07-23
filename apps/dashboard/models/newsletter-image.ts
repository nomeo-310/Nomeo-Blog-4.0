// models/newsletter-image.ts
import mongoose, { Schema, Document } from "mongoose";

/**
 * NewsletterImage — images uploaded via the campaign editor.
 * Stored in Cloudinary; this document tracks metadata and which
 * campaigns have used the image.
 */
export interface INewsletterImage {
  filename:     string;
  originalName: string;
  url:          string;
  publicId:     string;  // Cloudinary public_id for deletion
  size:         number;
  width?:       number;
  height?:      number;
  mimeType:     string;
  alt?:         string;
  uploadedBy:   mongoose.Types.ObjectId;
  /** Campaigns that have used this image */
  usedInCampaigns: mongoose.Types.ObjectId[];
  createdAt:    Date;
  updatedAt:    Date;
}

export interface INewsletterImageDocument extends INewsletterImage, Document {}

const NewsletterImageSchema = new Schema<INewsletterImageDocument>(
  {
    filename:        { type: String, required: true, unique: true },
    originalName:    { type: String, required: true },
    url:             { type: String, required: true },
    publicId:        { type: String, required: true },
    size:            { type: Number, required: true },
    width:           Number,
    height:          Number,
    mimeType:        { type: String, required: true },
    alt:             String,
    uploadedBy:      { type: Schema.Types.ObjectId, ref: "User", required: true },
    usedInCampaigns: [{ type: Schema.Types.ObjectId, ref: "Campaign" }],
  },
  { timestamps: true, collection: "newsletter_images" }
);

NewsletterImageSchema.index({ uploadedBy: 1 });
NewsletterImageSchema.index({ createdAt: -1 });

export const NewsletterImage =
  mongoose.models.NewsletterImage ||
  mongoose.model<INewsletterImageDocument>("NewsletterImage", NewsletterImageSchema);