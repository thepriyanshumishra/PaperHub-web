import mongoose, { Schema, Model } from 'mongoose';

export interface IUserProfile {
  name?: string;
  college?: string;
  course?: string;
  branch?: string;
  semester?: number;
}

export interface IUserEngagement {
  streakCount: number;
  lastActiveDateStr?: string; // Format: 'YYYY-MM-DD'
  totalXp: number;
  sessionsCompleted: number;
}

export interface IUser {
  _id: string; // Firebase UID string
  email: string;
  displayName?: string;
  photoURL?: string;
  role: 'student' | 'verifier' | 'moderator' | 'admin';
  onboardingCompleted: boolean;
  profile: IUserProfile;
  engagement: IUserEngagement;
  createdAt?: Date;
  updatedAt?: Date;
}

const UserProfileSchema = new Schema<IUserProfile>({
  name: { type: String },
  college: { type: String },
  course: { type: String },
  branch: { type: String },
  semester: { type: Number },
});

const UserEngagementSchema = new Schema<IUserEngagement>({
  streakCount: { type: Number, default: 0 },
  lastActiveDateStr: { type: String },
  totalXp: { type: Number, default: 0 },
  sessionsCompleted: { type: Number, default: 0 },
});

const UserSchema = new Schema<IUser>(
  {
    _id: { type: String, required: true }, // Map directly to Firebase UID string
    email: { type: String, required: true, unique: true },
    displayName: { type: String },
    photoURL: { type: String },
    role: { 
      type: String, 
      enum: ['student', 'verifier', 'moderator', 'admin'], 
      default: 'student' 
    },
    onboardingCompleted: { type: Boolean, default: false },
    profile: { type: UserProfileSchema, default: () => ({}) },
    engagement: { type: UserEngagementSchema, default: () => ({}) },
  },
  { timestamps: true }
);

const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
export default User;
