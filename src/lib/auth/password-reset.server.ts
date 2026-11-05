/**
 * Password reset mail. With SMTP_* set, the link is emailed. Without it, the
 * link is written to the server log so an operator can still finish a reset.
 */
import net from "node:net";
import tls from "node:tls";
import { emailAndPasswordEnabled } from "./email-password";

type ResetUser = { email: string; name?: string };

export const emailAndPassword = emailAndPasswordEnabled
  ? {
      enabled: true as const,
      revokeSessionsOnPasswordReset: true,
      minPasswordLength: 8,
      async sendResetPassword({ user, url }: { user: ResetUser; url: string }) {
        const sent = await sendResetMail(user.email, url);
        if (!sent) console.info(`[auth] no SMTP configured. Password reset for ${user.email}: ${url}`);
      },
    }
  : null;

export async function sendResetMail(to: string, url: string): Promise<boolean> {
  const host = process.env.SMTP_HOST?.trim();
  const from = process.env.SMTP_FROM?.trim() || process.env.SMTP_USER?.trim();
  if (!host || !from) return false;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER?.trim() ?? "";
  const pass = process.env.SMTP_PASS ?? "";
  const subject = "Reset your Performance Video password";
  const text = `Use this link within one hour to choose a new password:\n\n${url}\n\nIf you did not ask for this, ignore it.`;
  try {
    await smtpSend({ host, port, user, pass, from, to, subject, text });
    return true;
  } catch (error) {
    console.error("[auth] password reset mail failed", error);
    console.info(`[auth] Password reset for ${to}: ${url}`);
    return false;
  }
}

class Reader {
  private buffer = "";
  private pending: number[] = [];
  private waiter: ((code: number) => void) | null = null;

  constructor(private socket: net.Socket | tls.TLSSocket) {
    socket.on("data", (chunk) => this.push(chunk.toString("utf8")));
  }

  private push(text: string) {
    this.buffer += text;
    const lines = this.buffer.split(/\r?\n/);
    this.buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!/^\d{3} /.test(line)) continue;
      const code = Number(line.slice(0, 3));
      if (this.waiter) {
        const resolve = this.waiter;
        this.waiter = null;
        resolve(code);
      } else {
        this.pending.push(code);
      }
    }
  }

  read(): Promise<number> {
    const queued = this.pending.shift();
    if (queued != null) return Promise.resolve(queued);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("SMTP timed out")), 20000);
      this.waiter = (code) => {
        clearTimeout(timer);
        resolve(code);
      };
    });
  }

  async expect(ok: number[]) {
    const code = await this.read();
    if (!ok.includes(code)) throw new Error(`SMTP ${code}`);
  }

  async cmd(line: string, ok: number[]) {
    this.socket.write(`${line}\r\n`);
    await this.expect(ok);
  }
}

async function smtpSend(opts: {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
  to: string;
  subject: string;
  text: string;
}) {
  const implicit = opts.port === 465;
  const plain = implicit
    ? tls.connect({ host: opts.host, port: opts.port, servername: opts.host })
    : net.connect({ host: opts.host, port: opts.port });
  await onceOpen(plain);
  let reader = new Reader(plain);
  await reader.expect([220]);
  await reader.cmd("EHLO performance-video.com", [250]);
  let socket: net.Socket | tls.TLSSocket = plain;
  if (!implicit) {
    await reader.cmd("STARTTLS", [220]);
    plain.removeAllListeners("data");
    socket = tls.connect({ socket: plain, servername: opts.host });
    await onceOpen(socket);
    reader = new Reader(socket);
    await reader.cmd("EHLO performance-video.com", [250]);
  }
  if (opts.user) {
    await reader.cmd("AUTH LOGIN", [334]);
    await reader.cmd(Buffer.from(opts.user, "utf8").toString("base64"), [334]);
    await reader.cmd(Buffer.from(opts.pass, "utf8").toString("base64"), [235]);
  }
  await reader.cmd(`MAIL FROM:<${opts.from}>`, [250]);
  await reader.cmd(`RCPT TO:<${opts.to}>`, [250, 251]);
  await reader.cmd("DATA", [354]);
  const body = [
    `From: ${opts.from}`,
    `To: ${opts.to}`,
    `Subject: ${opts.subject}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=utf-8",
    "",
    opts.text.replace(/^\./gm, ".."),
    ".",
  ].join("\r\n");
  socket.write(`${body}\r\n`);
  await reader.expect([250]);
  await reader.cmd("QUIT", [221]);
  socket.end();
}

function onceOpen(socket: net.Socket | tls.TLSSocket): Promise<void> {
  return new Promise((resolve, reject) => {
    const done = () => {
      socket.off("error", reject);
      resolve();
    };
    if (socket instanceof tls.TLSSocket) socket.once("secureConnect", done);
    else socket.once("connect", done);
    socket.once("error", reject);
  });
}
