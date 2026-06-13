import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  emailVerified: boolean;
  image?: string;
  role: string;
  avatar: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String },
    email: { type: String },
    emailVerified: { type: Boolean, default: false },
    image: {type: String},
    role: { type: String, enum: ["user", "admin", "super_admin", "creator", "support"], default: "user" },
    avatar: { type: String, default: "" },
  },
  {
    timestamps: true,
    collection: "user",
  }
);

export const User = mongoose.models.User ?? mongoose.model<IUser>("User", UserSchema);