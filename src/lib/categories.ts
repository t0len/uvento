import type { Dictionary } from "@/lib/i18n/dictionaries";

export function categoryLabel(t: Dictionary, category: { slug: string; name: string }) {
  if (category.slug in t.categories) {
    return t.categories[category.slug as keyof typeof t.categories];
  }
  return category.name;
}
