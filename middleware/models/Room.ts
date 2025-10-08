import { Schema, model, Document, Types } from "mongoose";

export interface IRoom extends Document {
  name: string;
  roomId: string;
  participants: string[];
}

const RoomSchema = new Schema<IRoom>({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  roomId: {
    type: String,
    required: true,
    unique: true,
  },
  participants: {
    type: [String],
    required: true,
  },
});

export const RoomModel = model<IRoom>("Room", RoomSchema);
