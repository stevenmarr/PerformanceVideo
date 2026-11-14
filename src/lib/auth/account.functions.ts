import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { fromSql } from "@/lib/queryable";
import { sessionMiddleware } from "@/lib/auth/middleware";
import {
  changeOwnEmail,
  changeOwnPassword,
  completePasswordReset,
  issuePasswordReset,
  resolveLoginEmail,
} from "@/lib/auth/account-store";
import { RESET_GENERIC_MESSAGE, RESET_INVALID_MESSAGE } from "@/lib/auth/reset-policy";
import { createMailer } from "@/lib/mail/mailer";
import { publicHref } from "@/lib/preview-path-prefix";

async function requestBits(): Promise<{ origin: string; ip: string; guard: () => void }> {
  const { getRequest } = await import("@tanstack/react-start/server");
  const { assertSameSiteRequest } = await import("@/lib/auth/isolation.server");
  const request = getRequest();
  const origin = (() => {
    if (!request) return "http://localhost:8080";
    const url = new URL(request.url);
    const proto = request.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
    const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? url.host;
    return `${proto}://${host}`;
  })();
  const ip = request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  return { origin, ip, guard: assertSameSiteRequest };
}

async function deliverReset(origin: string, email: string, token: string): Promise<void> {
  const url = `${origin}${publicHref("/reset-password")}?token=${encodeURIComponent(token)}`;
  const mailer = createMailer();
  try {
    await mailer.send({
      to: email,
      subject: "Reset your Performance Video password",
      text: `Use this link within one hour to choose a new password:\n\n${url}\n\nIf you did not ask for this, ignore it.`,
    });
  } catch (error) {
    console.error("[mail] password reset failed");
    if (process.env.NODE_ENV !== "production") {
      console.info(`[mail] dev fallback reset link for ${email}: ${url}`);
    }
    console.error(error);
  }
}

export const requestPasswordReset = createServerFn({ method: "POST" })
  .validator((email: string) => String(email ?? ""))
  .handler(async ({ data: email }) => {
    const bits = await requestBits();
    bits.guard();
    const sql = await getSql();
    const delivery = await issuePasswordReset(fromSql(sql), { email, ip: bits.ip });
    if (delivery) await deliverReset(bits.origin, delivery.email, delivery.token);
    return { ok: true as const, message: RESET_GENERIC_MESSAGE };
  });

export const finishPasswordReset = createServerFn({ method: "POST" })
  .validator((input: { token: string; password: string }) => ({
    token: String(input?.token ?? ""),
    password: String(input?.password ?? ""),
  }))
  .handler(async ({ data }) => {
    const bits = await requestBits();
    bits.guard();
    const sql = await getSql();
    const result = await completePasswordReset(fromSql(sql), data);
    if (!result.ok) return { ok: false as const, error: RESET_INVALID_MESSAGE };
    return { ok: true as const, error: null };
  });

export const accountStatus = createServerFn({ method: "GET" })
  .middleware([sessionMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql<{
      email: string;
      username: string;
      role: string;
      must_change_password: boolean;
    }>`
      select email, coalesce(username, '') as username, coalesce(role, 'user') as role,
             coalesce(must_change_password, false) as must_change_password
      from "user" where id = ${context.userId}
    `;
    const row = rows[0];
    return {
      email: row?.email ?? "",
      username: row?.username ?? "",
      role: row?.role === "admin" ? "admin" : "user",
      mustChangePassword: Boolean(row?.must_change_password),
    };
  });

export const changePassword = createServerFn({ method: "POST" })
  .middleware([sessionMiddleware])
  .validator((input: { currentPassword: string; newPassword: string }) => ({
    currentPassword: String(input?.currentPassword ?? ""),
    newPassword: String(input?.newPassword ?? ""),
  }))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const result = await changeOwnPassword(fromSql(sql), { userId: context.userId, ...data });
    if (!result.ok) return { ok: false as const, error: result.error };
    return { ok: true as const, error: null };
  });

export const changeEmail = createServerFn({ method: "POST" })
  .middleware([sessionMiddleware])
  .validator((input: { email: string; currentPassword: string }) => ({
    email: String(input?.email ?? ""),
    currentPassword: String(input?.currentPassword ?? ""),
  }))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const result = await changeOwnEmail(fromSql(sql), { userId: context.userId, ...data });
    if (!result.ok) return { ok: false as const, error: result.error };
    return { ok: true as const, error: null };
  });

export const resolveLoginIdentifier = createServerFn({ method: "POST" })
  .validator((identifier: string) => String(identifier ?? ""))
  .handler(async ({ data }) => {
    const bits = await requestBits();
    bits.guard();
    const sql = await getSql();
    const email = await resolveLoginEmail(fromSql(sql), data);
    return { email };
  });
