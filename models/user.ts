import mongoose, { Schema, Model } from 'mongoose';
import { PlanId } from '@/lib/pricing';

// ─── Usage Metrics Interfaces ──────────────────────────────────────────────────
export interface IUsageDailyMetrics {
  aiChats: number;
  evaluations: number;
  date: string; // YYYY-MM-DD — stale check to auto-reset
}

export interface IUsageMonthlyMetrics {
  mockTests: number;
  month: string; // YYYY-MM — stale check to auto-reset
}

export interface IUsageLifetimeMetrics {
  totalSessions: number;
  totalQuestionsSolved: number;
  totalMockTests: number;
  totalAiChats: number;
  totalFeedbackSubmitted: number;
}

export interface IUsageMetrics {
  daily: IUsageDailyMetrics;
  monthly: IUsageMonthlyMetrics;
  lifetime: IUsageLifetimeMetrics;
}

export interface IBetaAccess {
  joined: boolean;
  joinedAt: Date | null;
  inviteCode: string | null;
  referredBy: string | null;
}

export interface IUserProfile {
  name?: string;
  gender?: 'male' | 'female' | 'other';
  universityId?: mongoose.Types.ObjectId; // Reference to University
  collegeId?: mongoose.Types.ObjectId;    // Reference to College
  courseId?: mongoose.Types.ObjectId;     // Reference to Course
  branchId?: mongoose.Types.ObjectId;     // Reference to Branch (optional for MBA)
  semester?: number;
  university?: string;                    // Dynamic string field for legacy frontend compatibility
  college?: string;                       // Dynamic string field for legacy frontend compatibility
  course?: string;                        // Dynamic string field for legacy frontend compatibility
  branch?: string;                        // Dynamic string field for legacy frontend compatibility
}

export interface IUserEngagement {
  streakCount: number;
  longestStreak: number;
  lastActiveDateStr?: string; // Format: 'YYYY-MM-DD'
  totalXp: number;
  sessionsCompleted: number;
  league: 'beginner' | 'bronze' | 'silver' | 'gold' | 'diamond' | 'elite';
  dailyGoalSolved: number;
  dailyGoalTarget: number;
  dailyGoalsCompletedDates?: string[];
}

export interface IUserPreferences {
  playSounds: boolean;
  autoTimer: boolean;
  delayAnswer: boolean;
  textSize: 'small' | 'medium' | 'large' | 'extra-large';
  theme: 'light' | 'dark';
  themeColor: 'purple' | 'blue' | 'green' | 'orange' | 'pink';
  leaderboardVisible: boolean;
  goalNotificationsEnabled: boolean;
  streakNotificationsEnabled: boolean;
  leaderboardNotificationsEnabled: boolean;
}

export interface IUser extends Omit<mongoose.Document, '_id'> {
  _id: any; // Unique user identifier (supports both ObjectId and string legacy IDs)
  email: string;
  name?: string; // Better Auth standard name field
  emailVerified: boolean; // Better Auth verification status
  image?: string; // Better Auth standard photo/image URL
  username?: string; // Unique username for login
  lastUsernameChangedAt?: Date; // Rate-limiting check for username updates
  displayName?: string; // Legacy field for compatibility
  photoURL?: string; // Legacy field for compatibility
  role: 'student' | 'verifier' | 'moderator' | 'admin';
  accountStatus: 'active' | 'suspended' | 'banned';
  onboardingCompleted: boolean;
  profile?: IUserProfile;
  engagement: IUserEngagement;
  preferences: IUserPreferences;
  bookmarks: string[]; // Question IDs
  incorrectAttempts: string[]; // Question IDs
  coachInsights?: string[];
  coachInsightsGeneratedAt?: Date;
  // Phase J: Pricing & Beta
  plan: PlanId;
  planExpiresAt: Date | null;
  betaAccess: IBetaAccess;
  usageMetrics: IUsageMetrics;
  createdAt: Date;
  updatedAt: Date;
}

const UserProfileSchema = new Schema<IUserProfile>({
  name: { type: String },
  gender: { type: String, enum: ['male', 'female', 'other'] },
  universityId: { type: Schema.Types.ObjectId, ref: 'University' },
  collegeId: { type: Schema.Types.ObjectId, ref: 'College' },
  courseId: { type: Schema.Types.ObjectId, ref: 'Course' },
  branchId: { type: Schema.Types.ObjectId, ref: 'Branch' },
  semester: { type: Number },
});

const UserEngagementSchema = new Schema<IUserEngagement>({
  streakCount: { type: Number, default: 0 },
  longestStreak: { type: Number, default: 0 },
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
  dailyGoalsCompletedDates: [{ type: String }],
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
  theme: { type: String, enum: ['light', 'dark'], default: 'dark' },
  themeColor: { 
    type: String, 
    enum: ['purple', 'blue', 'green', 'orange', 'pink'], 
    default: 'purple' 
  },
  leaderboardVisible: { type: Boolean, default: true },
  goalNotificationsEnabled: { type: Boolean, default: true },
  streakNotificationsEnabled: { type: Boolean, default: true },
  leaderboardNotificationsEnabled: { type: Boolean, default: true },
});

// ─── Phase J: Usage & Beta Sub-Schemas ──────────────────────────────────────
const UsageDailySchema = new Schema<IUsageDailyMetrics>({
  aiChats: { type: Number, default: 0 },
  evaluations: { type: Number, default: 0 },
  date: { type: String, default: '' },
}, { _id: false });

const UsageMonthlySchema = new Schema<IUsageMonthlyMetrics>({
  mockTests: { type: Number, default: 0 },
  month: { type: String, default: '' },
}, { _id: false });

const UsageLifetimeSchema = new Schema<IUsageLifetimeMetrics>({
  totalSessions: { type: Number, default: 0 },
  totalQuestionsSolved: { type: Number, default: 0 },
  totalMockTests: { type: Number, default: 0 },
  totalAiChats: { type: Number, default: 0 },
  totalFeedbackSubmitted: { type: Number, default: 0 },
}, { _id: false });

const UsageMetricsSchema = new Schema<IUsageMetrics>({
  daily: { type: UsageDailySchema, default: () => ({}) },
  monthly: { type: UsageMonthlySchema, default: () => ({}) },
  lifetime: { type: UsageLifetimeSchema, default: () => ({}) },
}, { _id: false });

const BetaAccessSchema = new Schema<IBetaAccess>({
  joined: { type: Boolean, default: true },
  joinedAt: { type: Date, default: () => new Date() },
  inviteCode: { type: String, default: null },
  referredBy: { type: String, default: null },
}, { _id: false });

const UserSchema = new Schema<IUser>(
  {
    _id: { type: Schema.Types.ObjectId, required: true }, // Unique user identifier
    email: { type: String, required: true, unique: true },
    name: { type: String }, // Better Auth name
    emailVerified: { type: Boolean, default: false }, // Better Auth verification status
    image: { type: String }, // Better Auth image url
    username: { type: String, unique: true, sparse: true }, // Unique username for login
    lastUsernameChangedAt: { type: Date }, // Track username modifications
    displayName: { type: String }, // Legacy field
    photoURL: { type: String }, // Legacy field
    role: { 
      type: String, 
      enum: ['student', 'verifier', 'moderator', 'admin'], 
      default: 'student' 
    },
    accountStatus: {
      type: String,
      enum: ['active', 'suspended', 'banned'],
      default: 'active'
    },
    onboardingCompleted: { type: Boolean, default: false },
    profile: { type: UserProfileSchema },
    engagement: { type: UserEngagementSchema, default: () => ({}) },
    preferences: { type: UserPreferencesSchema, default: () => ({}) },
    bookmarks: [{ type: String }],
    incorrectAttempts: [{ type: String }],
    coachInsights: [{ type: String }],
    coachInsightsGeneratedAt: { type: Date },
    // Phase J: Pricing & Beta
    plan: {
      type: String,
      enum: ['free', 'pro', 'institution', 'beta_pro'],
      default: 'beta_pro',
    },
    planExpiresAt: { type: Date, default: null },
    betaAccess: { type: BetaAccessSchema, default: () => ({}) },
    usageMetrics: { type: UsageMetricsSchema, default: () => ({}) },
  },
  { timestamps: true }
);

UserSchema.index({ role: 1 });
UserSchema.index({ accountStatus: 1 });
UserSchema.index({ username: 1 }, { unique: true, sparse: true });
UserSchema.index({ 'profile.universityId': 1, 'engagement.totalXp': -1 });
UserSchema.index({ 'profile.collegeId': 1, 'engagement.totalXp': -1 });
UserSchema.index({ 'profile.courseId': 1, 'engagement.totalXp': -1 });
UserSchema.index({ 'profile.branchId': 1, 'engagement.totalXp': -1 });

const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
export default User;
