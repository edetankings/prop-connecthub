export const formatPrice = (price: number): string => {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(price);
};

export const getTrustBadge = (score: number) => {
  if (score >= 80) return { label: "Trusted Agent", color: "trust-high" as const };
  if (score >= 50) return { label: "Trusted Agent", color: "trust-medium" as const };
  return { label: "Trusted Agent", color: "trust-low" as const };
};

