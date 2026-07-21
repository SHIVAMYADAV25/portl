import en from "../locales/en.json";
import hi from "../locales/hi.json";
import kn from "../locales/kn.json";

type Dict = { [key: string]: string | Dict };

function flatten(obj: Dict, prefix = ""): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") {
      out[path] = value;
    } else {
      Object.assign(out, flatten(value, path));
    }
  }
  return out;
}

function placeholders(value: string): string[] {
  return [...value.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]).sort();
}

const flatEn = flatten(en as Dict);
const flatHi = flatten(hi as Dict);
const flatKn = flatten(kn as Dict);

describe("locale files stay in sync", () => {
  it("hi.json has exactly the same keys as en.json", () => {
    expect(Object.keys(flatHi).sort()).toEqual(Object.keys(flatEn).sort());
  });

  it("kn.json has exactly the same keys as en.json", () => {
    expect(Object.keys(flatKn).sort()).toEqual(Object.keys(flatEn).sort());
  });

  it("no key has an empty string value in any locale", () => {
    for (const [locale, dict] of [
      ["en", flatEn],
      ["hi", flatHi],
      ["kn", flatKn],
    ] as const) {
      const empty = Object.entries(dict).filter(([, v]) => v.trim() === "");
      expect({ locale, empty }).toEqual({ locale, empty: [] });
    }
  });

  it("every {{placeholder}} in en.json is present in the matching hi.json and kn.json string", () => {
    const mismatches: string[] = [];
    for (const key of Object.keys(flatEn)) {
      const enPlaceholders = placeholders(flatEn[key]);
      if (enPlaceholders.length === 0) continue;
      for (const [locale, dict] of [
        ["hi", flatHi],
        ["kn", flatKn],
      ] as const) {
        const otherPlaceholders = placeholders(dict[key]);
        if (JSON.stringify(enPlaceholders) !== JSON.stringify(otherPlaceholders)) {
          mismatches.push(`${locale}.${key}: expected [${enPlaceholders}], got [${otherPlaceholders}]`);
        }
      }
    }
    expect(mismatches).toEqual([]);
  });
});
