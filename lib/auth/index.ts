import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { user } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "@/lib/logger";
import { sendEmail } from "@/lib/email";

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
    sendResetPassword: async ({ user, url }) => {
      if (!process.env.RESEND_API_KEY) {
        logger.warn("RESEND_API_KEY missing. Password reset link (dev only)", {
          userId: user.id,
          email: user.email,
          url,
        });
        return;
      }

      await sendEmail({
        to: user.email,
        subject: "Reset your LuxiFit password",
        userId: user.id,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #111827;">
            <h2 style="margin-bottom: 8px;">Reset your password</h2>
            <p style="margin-top: 0; color: #374151;">We received a request to reset your LuxiFit account password.</p>
            <p>
              <a href="${url}" style="display: inline-block; background: #0057FF; color: #ffffff; text-decoration: none; padding: 10px 16px; border-radius: 999px; font-weight: 600;">
                Reset Password
              </a>
            </p>
            <p style="color: #6b7280; font-size: 14px;">If you did not request this, you can safely ignore this email.</p>
          </div>
        `,
      });
    },
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
