import { appIcon } from "@/lib/app-icon";

export const contentType = "image/png";

// 32 = browser tab, 192 / 512 = installed app (see manifest.ts).
const SIZES = [32, 192, 512];

export function generateImageMetadata() {
  return SIZES.map((px) => ({
    id: String(px),
    size: { width: px, height: px },
    contentType,
  }));
}

export default async function Icon({ id }: { id: Promise<string | number> }) {
  return appIcon(Number(await id), 0.18);
}
