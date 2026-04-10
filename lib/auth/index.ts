import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { user } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "@/lib/logger";

export const auth = betterAuth({
  appName: "LuxiFit",
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,

  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    autoSignIn: true,
  },

  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // refresh every 24h
  },

  user: {
    additionalFields: {
      role: {
        type: "string",
        required: true,
        defaultValue: "client",
        input: true,
      },
      orgId: {
        type: "string",
        required: false,
        input: true,
        fieldName: "orgId",
      },
      branchId: {
        type: "string",
        required: false,
        input: true,
        fieldName: "branchId",
      },
      coachId: {
        type: "string",
        required: false,
        input: true,
        fieldName: "coachId",
      },
      phone: {
        type: "string",
        required: false,
        input: true,
      },
      isActive: {
        type: "boolean",
        required: false,
        defaultValue: true,
        input: false,
      },
    },
  },

  advanced: {
    cookiePrefix: "luxifit-client",
  },

  databaseHooks: {
    session: {
      create: {
        before: async (session: { userId: string }) => {
          const [u] = await db
            .select()
            .from(user)
            .where(eq(user.id, session.userId))
            .limit(1);

          if (!u) {
            logger.warn("Client login rejected: user not found", {
              userId: session.userId,
            });
            throw new Error("Account not found.");
          }

          if (u.role !== "client") {
            logger.warn("Client login rejected: non-client role", {
              userId: u.id,
              role: u.role,
            });
            throw new Error(
              "This app is for gym members only. Staff should use the admin portal."
            );
          }

          if (!u.isActive) {
            logger.warn("Client login rejected: inactive account", {
              userId: u.id,
            });
            throw new Error(
              "Your account is inactive. Contact your gym."
            );
          }

          logger.info("Client login session created", {
            userId: u.id,
            branchId: u.branchId,
          });

          return { data: session };
        },
      },
    },
  },

  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
