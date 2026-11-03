const LOCALE = "es-MX";

export function formatDate(value: string | null | undefined, fallback = "—"): string {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return new Intl.DateTimeFormat(LOCALE, { day: "numeric", month: "short", year: "numeric" }).format(date);
}

export function formatPrice(amount: number, currency = "MXN"): string {
  if (!Number.isFinite(amount) || amount <= 0) return "Gratis";
  return new Intl.NumberFormat(LOCALE, { style: "currency", currency }).format(amount);
}

export function initialsFrom(name: string, fallback = "?"): string {
  return name.split(/\s+/).filter(Boolean).map((part) => part[0]).slice(0, 2).join("").toUpperCase() || fallback;
}

export function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}
