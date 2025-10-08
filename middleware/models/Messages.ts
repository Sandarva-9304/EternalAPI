import mongoose, { Document, Schema, Model } from "mongoose";

// 1. Message Interface + Mongoose Document
export interface IMessage extends Document {
  id: string;
  from: string;
  to?: string;
  text: string;
  room?: string;
  chatKey?: string;
  timestamp?: Date;
}

const MessageSchema: Schema = new Schema<IMessage>(
  {
    id: { type: String, required: true, unique: true },
    from: { type: String, required: true },
    to: { type: String, required: false },
    text: { type: String, required: true },
    room: { type: String, required: false },
    chatKey: { type: String, required: false },
    timestamp: { type: Date, required: true },
  },
  { timestamps: true }
);

export const MessageModel: Model<IMessage> =
  mongoose.models.Message || mongoose.model<IMessage>("Message", MessageSchema);