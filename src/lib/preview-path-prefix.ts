import type { LocationRewrite } from "@tanstack/react-router";

/**
 * Path-based preview hosts serve the dev server under `/{port_id}/` and strip
 * that prefix before forwarding, so SSR sees `/` while the browser URL keeps the
 * prefix. TanStack Start resets `basepath` on hydration, so a `rewrite` keeps
 * client routing and generated links aligned with the public URL.
 */
const PATH_BASED_PREVIEW_HOSTS = new Set([
  "preview.grok.genai.mil",
  "preview.grok.mil",
  "preview.grokgsac.com",
]);

const PORT_ID_PREFIX = /^\/hds-[a-z0-9]+-\d+-[a-z0-9]+(?=\/|$)/i;

export function previewPathPrefix(hostname: string, pathname: string): string | undefined {
  if (!PATH_BASED_PREVIEW_HOSTS.has(hostname.toLowerCase())) return undefined;
  return PORT_ID_PREFIX.exec(pathname)?.[0];
}

export function prefixRewrite(prefix: string): LocationRewrite {
  return {
    input: ({ url }) => {
      if (url.pathname === prefix) url.pathname = "/";
      else if (url.pathname.startsWith(`${prefix}/`))
        url.pathname = url.pathname.slice(prefix.length);
      return url;
    },
    output: ({ url }) => {
      url.pathname = `${prefix}${url.pathname}`;
      return url;
    },
  };
}

export function previewPathRewrite(): LocationRewrite | undefined {
  if (typeof window === "undefined") return undefined;
  const prefix = previewPathPrefix(window.location.hostname, window.location.pathname);
  return prefix ? prefixRewrite(prefix) : undefined;
}

export function publicBase(): string {
  const value = import.meta.env.VITE_PUBLIC_BASE;
  if (typeof value !== "string") return "";
  const trimmed = value.trim().replace(/\/$/, "");
  if (!trimmed || trimmed === "/") return "";
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

/** A root-relative path, prefixed when the droplet serves the app under `/diagram`. */
export function publicHref(path: string): string {
  const base = publicBase();
  if (!base) return path;
  if (path === "/") return base;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export function appPathRewrite(): LocationRewrite | undefined {
  const preview = previewPathRewrite();
  if (preview) return preview;
  const base = publicBase();
  return base ? prefixRewrite(base) : undefined;
}
