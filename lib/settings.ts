import { readStore, writeStore } from "@/lib/store";

export async function getSettings(): Promise<any> {
  return readStore<any>("settings", {});
}

export async function saveSettings(settings: any) {
  await writeStore("settings", settings);
}

export function deepMerge(target: any, source: any): any {
  if (!source || typeof source !== "object") return target;

  const output = { ...target };

  for (const key of Object.keys(source)) {
    if (
      source[key] &&
      typeof source[key] === "object" &&
      !Array.isArray(source[key])
    ) {
      output[key] = deepMerge(target?.[key] || {}, source[key]);
    } else {
      output[key] = source[key];
    }
  }

  return output;
}

