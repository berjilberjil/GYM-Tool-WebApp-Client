import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  decimal,
  integer,
  date,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ============================================
// ENUMS
// ============================================

export const userRoleEnum = pgEnum("user_role", [
  "owner",
  "manager",
  "coach",
  "client",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "paid",
  "pending",
  "overdue",
]);

export const paymentMethodEnum = pgEnum("payment_method", [
  "cash",
  "upi",
  "card",
  "bank_transfer",
]);

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "active",
  "expired",
  "cancelled",
]);

export const goalTypeEnum = pgEnum("goal_type", [
  "fat_loss",
  "muscle_gain",
  "strength",
  "endurance",
  "general",
]);

export const goalStatusEnum = pgEnum("goal_status", [
  "active",
  "achieved",
  "abandoned",
]);

export const chatRoomTypeEnum = pgEnum("chat_room_type", ["direct", "group"]);

// ============================================
// BETTER AUTH CORE TABLES
// ============================================

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  role: userRoleEnum("role").notNull().default("client"),
  orgId: text("org_id"),
  branchId: text("branch_id"),
  coachId: text("coach_id"),
  phone: varchar("phone", { length: 20 }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ============================================
// BUSINESS TABLES
// ============================================

export const organization = pgTable("organization", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  logo: text("logo"),
  ownerId: text("owner_id")
    .notNull()
    .references(() => user.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const branch = pgTable("branch", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  location: text("location"),
  phone: varchar("phone", { length: 20 }),
  managerId: text("manager_id").references(() => user.id),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const feePlan = pgTable("fee_plan", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  durationDays: integer("duration_days").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const clientSubscription = pgTable("client_subscription", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: text("client_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  planId: uuid("plan_id")
    .notNull()
    .references(() => feePlan.id),
  branchId: uuid("branch_id")
    .notNull()
    .references(() => branch.id),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  status: subscriptionStatusEnum("status").notNull().default("active"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const payment = pgTable("payment", {
  id: uuid("id").primaryKey().defaultRandom(),
  subscriptionId: uuid("subscription_id").references(
    () => clientSubscription.id
  ),
  clientId: text("client_id")
    .notNull()
    .references(() => user.id),
  branchId: uuid("branch_id")
    .notNull()
    .references(() => branch.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  status: paymentStatusEnum("status").notNull().default("pending"),
  dueDate: date("due_date").notNull(),
  paidDate: date("paid_date"),
  method: paymentMethodEnum("method"),
  recordedBy: text("recorded_by").references(() => user.id),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const progressEntry = pgTable("progress_entry", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: text("client_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  weightKg: decimal("weight_kg", { precision: 5, scale: 2 }),
  bodyFatPct: decimal("body_fat_pct", { precision: 5, scale: 2 }),
  chest: decimal("chest", { precision: 5, scale: 2 }),
  waist: decimal("waist", { precision: 5, scale: 2 }),
  hips: decimal("hips", { precision: 5, scale: 2 }),
  arms: decimal("arms", { precision: 5, scale: 2 }),
  thighs: decimal("thighs", { precision: 5, scale: 2 }),
  photoUrls: text("photo_urls").array(),
  notes: text("notes"),
  recordedAt: timestamp("recorded_at").notNull().defaultNow(),
});

export const goal = pgTable("goal", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: text("client_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  type: goalTypeEnum("type").notNull(),
  target: text("target").notNull(),
  status: goalStatusEnum("status").notNull().default("active"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ============================================
// CHAT / PRESENCE / EMAIL TRACKING
// ============================================

export const chatRoom = pgTable("chat_room", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  branchId: uuid("branch_id").references(() => branch.id, {
    onDelete: "cascade",
  }),
  type: chatRoomTypeEnum("type").notNull(),
  name: varchar("name", { length: 120 }),
  createdBy: text("created_by")
    .notNull()
    .references(() => user.id),
  lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const chatParticipant = pgTable("chat_participant", {
  id: uuid("id").defaultRandom().primaryKey(),
  roomId: uuid("room_id")
    .notNull()
    .references(() => chatRoom.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  joinedAt: timestamp("joined_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  lastReadAt: timestamp("last_read_at", { withTimezone: true }),
});

export const chatMessage = pgTable("chat_message", {
  id: uuid("id").defaultRandom().primaryKey(),
  roomId: uuid("room_id")
    .notNull()
    .references(() => chatRoom.id, { onDelete: "cascade" }),
  senderId: text("sender_id")
    .notNull()
    .references(() => user.id),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const userPresence = pgTable("user_presence", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 20 }).default("offline").notNull(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const emailEvent = pgTable("email_event", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
  emailId: varchar("email_id", { length: 100 }),
  toEmail: varchar("to_email", { length: 255 }).notNull(),
  subject: varchar("subject", { length: 255 }),
  sentAt: timestamp("sent_at", { withTimezone: true }).defaultNow().notNull(),
  openedAt: timestamp("opened_at", { withTimezone: true }),
  clickedAt: timestamp("clicked_at", { withTimezone: true }),
});

// ============================================
// RELATIONS
// ============================================

export const userRelations = relations(user, ({ one, many }) => ({
  org: one(organization, {
    fields: [user.orgId],
    references: [organization.id],
  }),
  branch: one(branch, {
    fields: [user.branchId],
    references: [branch.id],
  }),
  coach: one(user, {
    fields: [user.coachId],
    references: [user.id],
    relationName: "coachClients",
  }),
  clients: many(user, { relationName: "coachClients" }),
  sessions: many(session),
  accounts: many(account),
  payments: many(payment),
  progressEntries: many(progressEntry),
  goals: many(goal),
  subscriptions: many(clientSubscription),
}));

export const organizationRelations = relations(organization, ({ one, many }) => ({
  owner: one(user, {
    fields: [organization.ownerId],
    references: [user.id],
  }),
  branches: many(branch),
  feePlans: many(feePlan),
}));

export const branchRelations = relations(branch, ({ one, many }) => ({
  org: one(organization, {
    fields: [branch.orgId],
    references: [organization.id],
  }),
  manager: one(user, {
    fields: [branch.managerId],
    references: [user.id],
  }),
  payments: many(payment),
  subscriptions: many(clientSubscription),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const feePlanRelations = relations(feePlan, ({ one, many }) => ({
  org: one(organization, {
    fields: [feePlan.orgId],
    references: [organization.id],
  }),
  subscriptions: many(clientSubscription),
}));

export const clientSubscriptionRelations = relations(
  clientSubscription,
  ({ one, many }) => ({
    client: one(user, {
      fields: [clientSubscription.clientId],
      references: [user.id],
    }),
    plan: one(feePlan, {
      fields: [clientSubscription.planId],
      references: [feePlan.id],
    }),
    branch: one(branch, {
      fields: [clientSubscription.branchId],
      references: [branch.id],
    }),
    payments: many(payment),
  })
);

export const paymentRelations = relations(payment, ({ one }) => ({
  subscription: one(clientSubscription, {
    fields: [payment.subscriptionId],
    references: [clientSubscription.id],
  }),
  client: one(user, {
    fields: [payment.clientId],
    references: [user.id],
  }),
  branch: one(branch, {
    fields: [payment.branchId],
    references: [branch.id],
  }),
  recorder: one(user, {
    fields: [payment.recordedBy],
    references: [user.id],
  }),
}));

export const progressEntryRelations = relations(progressEntry, ({ one }) => ({
  client: one(user, {
    fields: [progressEntry.clientId],
    references: [user.id],
  }),
}));

export const goalRelations = relations(goal, ({ one }) => ({
  client: one(user, {
    fields: [goal.clientId],
    references: [user.id],
  }),
}));
