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
  league: 'beginner' | 'bronze' | 'silver' | 'gold' | 'diamond' | 'elite';
  dailyGoalSolved: number;
  dailyGoalTarget: number;
}

export interface IUserPreferences {
  playSounds: boolean;
  autoTimer: boolean;
  delayAnswer: boolean;
  textSize: 'small' | 'medium' | 'large' | 'extra-large';
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
  preferences: IUserPreferences;
  bookmarks: string[]; // Question IDs
  incorrectAttempts: string[]; // Question IDs
  personalNotes: Map<string, string>; // Map of questionId -> note
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
  league: { 
    type: String, 
    enum: ['beginner', 'bronze', 'silver', 'gold', 'diamond', 'elite'], 
    default: 'beginner' 
  },
  dailyGoalSolved: { type: Number, default: 0 },
  dailyGoalTarget: { type: Number, default: 30 },
});

const UserPreferencesSchema = new Schema<IUserPreferences>({
  playSounds: { type: Boolean, default: true },
  autoTimer: { type: Boolean, default: true },
  delayAnswer: { type: Boolean, default: false },
  textSize: { 
    type: String, 
    enum: ['small', 'medium', 'large', 'extra-large'], 
    default: 'medium' 
  },
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
    preferences: { type: UserPreferencesSchema, default: () => ({}) },
    bookmarks: [{ type: String }],
    incorrectAttempts: [{ type: String }],
    personalNotes: { 
      type: Map, 
      of: String, 
      default: () => new Map() 
    },
  },
  { timestamps: true }
);

const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
export default User;
