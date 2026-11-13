export type OutboundMail = { to: string; subject: string; text: string };

export interface Mailer {
  kind: "smtp" | "console";
  send(mail: OutboundMail): Promise<void>;
}

/**
 * SMTP when SMTP_HOST and a from-address are set. Otherwise a console mailer
 * so local and preview runs can finish a reset from the server log.
 */
export function createMailer(
  env: NodeJS.ProcessEnv = process.env,
  log: (line: string) => void = (line) => console.info(line),
): Mailer {
  const host = env.SMTP_HOST?.trim();
  const from = env.SMTP_FROM?.trim() || env.SMTP_USER?.trim();
  if (host && from) {
    const port = Number(env.SMTP_PORT || 587);
    const user = env.SMTP_USER?.trim() ?? "";
    const pass = env.SMTP_PASS ?? "";
    return {
      kind: "smtp",
      async send(mail) {
        const { smtpSend } = await import("./smtp.ts");
        await smtpSend({ host, port, user, pass, from, ...mail });
      },
    };
  }
  return {
    kind: "console",
    async send(mail) {
      log(`[mail] to=${mail.to} subject=${mail.subject}\n${mail.text}`);
    },
  };
}
