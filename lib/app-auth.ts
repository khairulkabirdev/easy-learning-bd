import "server-only";

import bcrypt from "bcryptjs";
import crypto from "crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/db";

const SESSION_COOKIE_NAME = "easylearningbd_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;
const PASSWORD_RESET_TTL_MS = 1000 * 60 * 30;

type SessionPayload = {
  sessionId: string;
  userId: string;
  expiresAt: number;
};

function getSessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET is not configured.");
  }
  if (secret.length < 32) {
    throw new Error("SESSION_SECRET must be at least 32 characters.");
  }
  return secret;
}

function encodeSessionPayload(payload: SessionPayload) {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

function decodeSessionPayload(value: string): SessionPayload | null {
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Partial<SessionPayload>;
    if (
      typeof parsed.sessionId !== "string" ||
      typeof parsed.userId !== "string" ||
      typeof parsed.expiresAt !== "number" ||
      !Number.isFinite(parsed.expiresAt)
    ) {
      return null;
    }

    return {
      sessionId: parsed.sessionId,
      userId: parsed.userId,
      expiresAt: parsed.expiresAt,
    };
  } catch {
    return null;
  }
}

function signValue(value: string) {
  return crypto.createHmac("sha256", getSessionSecret()).update(value).digest("hex");
}

function createSignedCookieValue(payload: SessionPayload) {
  const raw = encodeSessionPayload(payload);
  const sig = signValue(raw);
  return `${raw}.${sig}`;
}

function verifySignedCookieValue(cookieValue: string) {
  const [raw, sig] = cookieValue.split(".");
  if (!raw || !sig) return null;

  const expected = signValue(raw);
  const suppliedBuffer = Buffer.from(sig);
  const expectedBuffer = Buffer.from(expected);
  if (suppliedBuffer.length !== expectedBuffer.length) return null;

  const valid = crypto.timingSafeEqual(suppliedBuffer, expectedBuffer);
  if (!valid) return null;

  return decodeSessionPayload(raw);
}

function hashSessionToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function hashPasswordResetToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function generateOpaqueToken() {
  return crypto.randomBytes(32).toString("hex");
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash);
}

export async function createSession(userId: string) {
  const sessionId = crypto.randomUUID();
  const token = generateOpaqueToken();
  const tokenHash = hashSessionToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await prisma.authSession.deleteMany({
    where: { expiresAt: { lte: new Date() } },
  });

  await prisma.authSession.create({
    data: {
      id: sessionId,
      userId,
      tokenHash,
      expiresAt,
      lastUsedAt: new Date(),
    },
  });

  const cookieValue = createSignedCookieValue({
    sessionId,
    userId,
    expiresAt: expiresAt.getTime(),
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, `${cookieValue}.${token}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });

  return { sessionId, expiresAt };
}

export async function deleteSession() {
  const cookieStore = await cookies();
  const existing = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (existing) {
    const token = existing.split(".").at(-1);
    const payload = verifySignedCookieValue(existing.split(".").slice(0, -1).join("."));

    if (payload && token) {
      await prisma.authSession.deleteMany({
        where: {
          id: payload.sessionId,
          userId: payload.userId,
          tokenHash: hashSessionToken(token),
        },
      });
    }
  }

  cookieStore.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: new Date(0),
    path: "/",
  });
}

export async function getCurrentSession() {
  const cookieStore = await cookies();
  const rawCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!rawCookie) return null;

  const parts = rawCookie.split(".");
  const token = parts.at(-1);
  const signedPayload = parts.slice(0, -1).join(".");
  if (!token) return null;

  const payload = verifySignedCookieValue(signedPayload);
  if (!payload) return null;
  if (payload.expiresAt < Date.now()) {
    await prisma.authSession.deleteMany({
      where: { id: payload.sessionId, userId: payload.userId },
    });
    return null;
  }

  const session = await prisma.authSession.findFirst({
    where: {
      id: payload.sessionId,
      userId: payload.userId,
      tokenHash: hashSessionToken(token),
      expiresAt: { gt: new Date() },
    },
    include: {
      user: true,
    },
  });

  if (!session) return null;

  if (Date.now() - session.lastUsedAt.getTime() > 15 * 60 * 1000) {
    await prisma.authSession.update({
      where: { id: session.id },
      data: { lastUsedAt: new Date() },
    });
  }

  return session;
}

export async function getCurrentUser() {
  const session = await getCurrentSession();
  return session?.user ?? null;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth/login");
  }
  return user;
}

export async function requireStudent() {
  const user = await requireUser();
  if (user.role !== "student") {
    redirect(user.role === "teacher" ? "/teacher/dashboard" : "/admin/dashboard");
  }
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "admin") {
    redirect(user.role === "teacher" ? "/teacher/dashboard" : "/user/dashboard");
  }
  return user;
}

export async function requireTeacher() {
  const user = await requireUser();
  if (user.role !== "teacher") {
    redirect(user.role === "admin" ? "/admin/dashboard" : "/user/dashboard");
  }
  return user;
}

export async function loginWithPassword(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
  });

  if (!user) {
    return { ok: false as const, error: "Invalid email or password." };
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return { ok: false as const, error: "Invalid email or password." };
  }

  await createSession(user.id);

  return {
    ok: true as const,
    role: user.role,
  };
}

export async function registerWithPassword(input: {
  name: string;
  email: string;
  password: string;
  role: "student" | "teacher";
  phone: string;
  institutionName?: string;
  classId?: string;
  organizationId: string;
}) {
  const email = input.email.toLowerCase().trim();
  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existing) {
    return { ok: false as const, error: "An account with this email already exists." };
  }

  if (input.role === "student") {
    if (!input.classId) {
      return { ok: false as const, error: "Please choose your class." };
    }

    const classItem = await prisma.class.findFirst({
      where: {
        id: input.classId,
        organizationId: input.organizationId,
        status: "published",
      },
      select: { id: true },
    });

    if (!classItem) {
      return { ok: false as const, error: "Selected class is not available." };
    }
  }

  const passwordHash = await hashPassword(input.password);

  let user;
  try {
    user = await prisma.user.create({
      data: {
        name: input.name.trim(),
        email,
        passwordHash,
        role: input.role,
        phone: input.phone,
        institutionName: input.role === "teacher" ? input.institutionName?.trim() || null : null,
        classId: input.role === "student" ? input.classId : null,
        organizationId: input.organizationId,
      },
    });
  } catch (error) {
    const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
    if (code === "P2002") {
      return { ok: false as const, error: "An account with this email already exists." };
    }
    throw error;
  }

  await createSession(user.id);

  return { ok: true as const, role: user.role };
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function reportPasswordResetDeliveryIssue(message: string, error?: unknown) {
  if (error) console.error(`[password-reset] ${message}`, error);
  else console.error(`[password-reset] ${message}`);
}

export async function requestPasswordReset(email: string) {
  const normalizedEmail = email.toLowerCase().trim();
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true, name: true, email: true, organizationId: true },
  });

  // Always return the same public result so this endpoint cannot be used to enumerate accounts.
  if (!user) return { ok: true as const };

  const settings = await prisma.authEmailSetting.findUnique({
    where: { organizationId: user.organizationId },
  });

  if (!settings?.resetEmailEnabled || !settings.senderEmail || !settings.appBaseUrl) {
    reportPasswordResetDeliveryIssue(`Reset email is unavailable for organization ${user.organizationId}.`);
    return { ok: true as const };
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    reportPasswordResetDeliveryIssue("RESEND_API_KEY is not configured.");
    return { ok: true as const };
  }

  const token = generateOpaqueToken();
  let resetUrl: URL;
  try {
    resetUrl = new URL("/auth/reset-password", settings.appBaseUrl);
    if (!["http:", "https:"].includes(resetUrl.protocol)) throw new Error("Unsupported app URL protocol.");
  } catch (error) {
    reportPasswordResetDeliveryIssue("The configured appBaseUrl is invalid.", error);
    return { ok: true as const };
  }
  resetUrl.searchParams.set("token", token);

  await prisma.passwordResetToken.deleteMany({
    where: { userId: user.id, OR: [{ expiresAt: { lte: new Date() } }, { usedAt: { not: null } }] },
  });

  const resetRecord = await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: hashPasswordResetToken(token),
      expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS),
    },
    select: { id: true },
  });

  const from = settings.senderName
    ? `${settings.senderName} <${settings.senderEmail}>`
    : settings.senderEmail;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: user.email,
        subject: "Reset your EasyLearningBD password",
        html: `<p>Hello ${escapeHtml(user.name)},</p><p>Use this link to reset your password. It expires in 30 minutes.</p><p><a href="${escapeHtml(resetUrl.toString())}">Reset password</a></p>`,
        text: `Hello ${user.name},\n\nUse this link to reset your password. It expires in 30 minutes:\n${resetUrl.toString()}`,
      }),
    });

    if (!response.ok) {
      await prisma.passwordResetToken.deleteMany({ where: { id: resetRecord.id } });
      reportPasswordResetDeliveryIssue(`Email provider returned HTTP ${response.status}.`);
    }
  } catch (error) {
    await prisma.passwordResetToken.deleteMany({ where: { id: resetRecord.id } });
    reportPasswordResetDeliveryIssue("Failed to send password reset email.", error);
  }

  return { ok: true as const };
}

export async function resetPasswordWithToken(token: string, password: string) {
  const tokenHash = hashPasswordResetToken(token);
  const resetToken = await prisma.passwordResetToken.findFirst({
    where: {
      tokenHash,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    select: { id: true, userId: true },
  });

  if (!resetToken) {
    return { ok: false as const, error: "This reset link is invalid or expired." };
  }

  const passwordHash = await hashPassword(password);
  const applied = await prisma.$transaction(async (tx) => {
    const claimed = await tx.passwordResetToken.updateMany({
      where: {
        id: resetToken.id,
        tokenHash,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: { usedAt: new Date() },
    });

    if (claimed.count !== 1) return false;

    await tx.user.update({
      where: { id: resetToken.userId },
      data: { passwordHash },
    });
    await tx.authSession.deleteMany({ where: { userId: resetToken.userId } });
    await tx.passwordResetToken.deleteMany({
      where: { userId: resetToken.userId, id: { not: resetToken.id } },
    });
    return true;
  });

  if (!applied) {
    return { ok: false as const, error: "This reset link is invalid or expired." };
  }

  return { ok: true as const };
}

export async function logout() {
  await deleteSession();
  redirect("/auth/login");
}

export async function assertTrustedMutationOrigin() {
  const currentHeaders = await headers();
  const origin = currentHeaders.get("origin");
  const host = currentHeaders.get("host");

  if (!origin || !host) {
    throw new Error("Untrusted request origin.");
  }

  const originUrl = new URL(origin);
  if (originUrl.host !== host) {
    throw new Error("Untrusted request origin.");
  }
}
