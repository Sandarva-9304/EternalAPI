import mongoose, { Document, Schema, Model } from "mongoose";
export interface IUser extends Document {
  uid: string;
  username: string;
  avatar: string;
  friends?: Object[];
  friendrequests?: Object[];
  groups?: Object[];
}
const UserSchema: Schema = new Schema<IUser>(
  {
    uid: { type: String, required: true, unique: true },
    username: { type: String, required: true },
    avatar: { type: String, required: true },
    friends: [{ type: Object, required: false }],
    friendrequests: [{ type: Object, required: false }],
    groups: [{ type: Object, required: false }],
  },
  { timestamps: true }
);

export const UserModel: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);