import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { username } from "better-auth/plugins";
import { MongoClient } from "mongodb";
import { createAuthMiddleware } from "better-auth/api";
import { sendVerificationEmail, sendResetPasswordEmail } from "@/lib/email";

if (!process.env.MONGODB_URI) {
  throw new Error("MONGODB_URI is not set in environment variables.");
}

const client = new MongoClient(process.env.MONGODB_URI);

export const auth = betterAuth({
  database: mongodbAdapter(client.db(), {
    // Use plural collection names to match Mongoose's default pluralization convention.
    // This ensures Better Auth reads/writes to 'users', 'sessions', 'accounts', 'verifications'
    // instead of the default singular names ('user', 'session', 'account', 'verification').
    // Without this, credentials are written to 'user' but profiles are read from 'users'.
    usePlural: true,
  }),
  secondaryStorage: {
    get: async (key: string) => {
      const { redis } = require("@/lib/redis");
      return redis ? await redis.get(key) : null;
    },
    set: async (key: string, value: string, ttl?: number) => {
      const { redis } = require("@/lib/redis");
      if (redis) {
        if (ttl) {
          await redis.set(key, value, "EX", ttl);
        } else {
          await redis.set(key, value);
        }
      }
    },
    delete: async (key: string) => {
      const { redis } = require("@/lib/redis");
      if (redis) {
        await redis.del(key);
      }
    },
  },
  secret: process.env.BETTER_AUTH_SECRET || "dummy-secret-for-build-only-change-in-production",
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    sendResetPassword: async (data) => {
      await sendResetPasswordEmail(data.user.email, data.url);
    },
  },
  emailVerification: {
    sendOnSignUp: false,
    sendVerificationEmail: async (data) => {
      await sendVerificationEmail(data.user.email, data.url);
    },
  },
  plugins: [
    username()
  ],
  rateLimit: {
    // Disabled the overly restrictive global rate limit that was applying to get-session
    // Better Auth rateLimit applies to all endpoints by default, so max: 5 locked users out immediately.
    window: 15 * 60,
    max: 1000,
    enabled: false,
    storage: "secondary-storage",
  },
  hooks: {
    after: createAuthMiddleware(async (ctx) => {
      if (ctx.path === "/sign-out" || ctx.path === "/change-password" || ctx.path === "/reset-password") {
        const req = ctx.request;
        if (req) {
          const authHeader = req.headers.get("authorization");
          let token = null;
          if (authHeader && authHeader.startsWith("Bearer ")) {
            token = authHeader.split(" ")[1];
          } else {
            const cookieHeader = req.headers.get("cookie");
            if (cookieHeader) {
              const match = cookieHeader.match(/better-auth\.session_token=([^;]+)/);
              if (match) {
                token = match[1];
              }
            }
          }
          if (token) {
            try {
              const { redis } = require("@/lib/redis");
              if (redis) {
                const cached = await redis.get(`paperhub:session:${token}`);
                if (cached) {
                  const parsed = JSON.parse(cached);
                  const userId = parsed?.session?.userId || parsed?.user?._id;
                  if (userId) {
                    if (ctx.path === "/change-password" || ctx.path === "/reset-password") {
                      // Invalidate ALL sessions for this user on password change/reset
                      const tokens = await redis.smembers(`paperhub:user:sessions:${userId}`);
                      if (tokens && tokens.length > 0) {
                        const keysToDelete = tokens.map((t: string) => `paperhub:session:${t}`);
                        await redis.del(...keysToDelete);
                      }
                      await redis.del(`paperhub:user:sessions:${userId}`);
                    } else {
                      // Just remove this single session on sign-out
                      await redis.srem(`paperhub:user:sessions:${userId}`, token);
                      await redis.del(`paperhub:session:${token}`);
                    }
                  } else {
                    await redis.del(`paperhub:session:${token}`);
                  }
                } else {
                  await redis.del(`paperhub:session:${token}`);
                }
              }
            } catch (err) {
              console.warn("[betterAuth Hooks] Failed to invalidate Redis session cache:", err);
            }
          }
        }
      }
    })
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "student",
      },
      onboardingCompleted: {
        type: "boolean",
        defaultValue: false,
      },
      plan: {
        type: "string",
        defaultValue: "beta_pro",
      },
    },
  },
});
