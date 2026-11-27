/**
 * Optional port draft from a model number or datasheet text.
 * The key is XAI_API_KEY on the server. It is never sent to the browser.
 * Nothing is saved until the engineer accepts the draft.
 */
import { createServerFn } from "@tanstack/react-start";
import { env } from "@/lib/env.server";
import { extractPdfText, parseProposal, type DeviceProposal } from "@/lib/assist/proposal";

const PROMPT = `You are filling an AV signal-flow library card for a live-production engineer.
Return one JSON object and nothing else.
Use only jacks you can support from the model number or the supplied text.
If a count is not in the text, omit that jack. Do not invent I/O.
Fields:
{"manufacturer":"","model":"","category":"","notes":"","ports":[{"label":"","direction":"input|output","signal":"HDMI|12G-SDI|3G-SDI|DisplayPort|Ethernet|DVI","connector":""}],"network":[{"name":"LAN","role":"management|media|control","mode":"static","controlProtocol":"","controlPort":null,"mediaTransport":"","multicast":[],"ptpDomain":null,"ptpRole":""}]}
mediaTransport is one of dante, aes67, ndi, st2110, st2022-6, st2022-7, or empty.
Leave IP addresses empty.`;

export const assistStatus = createServerFn({ method: "GET" }).handler(async () => {
  return { enabled: Boolean(env("XAI_API_KEY")) };
});

export const draftDevice = createServerFn({ method: "POST" })
  .validator((input: { model?: string; text?: string; pdfLatin1?: string }) => input)
  .handler(async ({ data }): Promise<{ enabled: boolean; proposal: DeviceProposal | null; error: string }> => {
    const key = env("XAI_API_KEY");
    if (!key) return { enabled: false, proposal: null, error: "" };
    const fromPdf = data.pdfLatin1 ? extractPdfText(data.pdfLatin1.slice(0, 400000)) : "";
    const text = [data.model?.trim(), data.text?.trim(), fromPdf].filter(Boolean).join("\n").slice(0, 12000);
    if (!text) return { enabled: true, proposal: null, error: "Type a model number or attach a datasheet." };
    const model = env("XAI_MODEL") || "grok-4";
    let response: Response;
    try {
      response = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          temperature: 0,
          messages: [
            { role: "system", content: PROMPT },
            { role: "user", content: text },
          ],
        }),
      });
    } catch {
      return { enabled: true, proposal: null, error: "The model could not be reached." };
    }
    if (!response.ok) return { enabled: true, proposal: null, error: "The model did not answer." };
    const body = (await response.json()) as { choices?: { message?: { content?: string } }[] };
    const content = body.choices?.[0]?.message?.content ?? "";
    const parsed = parseProposal(content);
    return { enabled: true, proposal: parsed.proposal, error: parsed.error };
  });
