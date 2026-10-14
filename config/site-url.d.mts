export const DEFAULT_SITE_URL: string;
export function normalizeSiteUrl(value?: string): string;
export function resolveSiteUrl(env?: { VITE_SITE_URL?: string; SITE_URL?: string }): string;
export function absoluteSiteUrl(path?: string, base?: string): string;
