import "server-only";

import bcrypt from "bcryptjs";
import crypto from "crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/db";

const SESSION_COOKIE_NAME = "easylearningbd_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;

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
  return secret;
}

function encodeSessionPayload(payload: SessionPayload) {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

function decodeSessionPayload(value: string): SessionPayload | null {
  try {
    return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as SessionPayload;
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
  const valid = crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  if (!valid) return null;

  return decodeSessionPayload(raw);
}

function hashSessionToken(token: string) {
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
  if (payload.expiresAt < Date.now()) return null;

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

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "admin") {
    redirect("/user/dashboard");
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
