import { ImageResponse } from "next/og";
import { APP_ICON_BACKGROUND } from "@/lib/config";

/**
 * App icons (brand: a smiling white house on marigold), generated at build time
 * so there are no binary files in the repo.
 *
 *   /icons/icon-192.png, /icons/icon-512.png   manifest "any" icons
 *   /icons/maskable-512.png                    Android adaptive icon (content inside the safe zone)
 *   /icons/apple-touch-icon.png                iPhone home screen (iOS rounds the corners itself)
 *   /icons/badge-96.png                        Android notification badge (white on transparent)
 */
const ICONS = {
  "icon-192.png": { size: 192, scale: 0.8, background: true },
  "icon-512.png": { size: 512, scale: 0.8, background: true },
  "maskable-512.png": { size: 512, scale: 0.62, background: true },
  "apple-touch-icon.png": { size: 180, scale: 0.8, background: true },
  "badge-96.png": { size: 96, scale: 0.9, background: false },
} as const;

type IconName = keyof typeof ICONS;

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(ICONS).map((name) => ({ name }));
}

/** A simple house (roof, walls, door) as SVG on a 100×100 grid. The door is cut out, so the badge stays one colour. */
function House({ width }: { width: number }) {
  return (
    <svg width={width} height={width} viewBox="0 0 100 100">
      <path
        fill="white"
        fillRule="evenodd"
        d="M50 6 L96 46 L84 46 L84 94 L16 94 L16 46 L4 46 Z M41 94 L41 66 Q41 62 45 62 L55 62 Q59 62 59 66 L59 94 Z"
      />
    </svg>
  );
}

/** The brand mark (from the design handoff) on a 120×120 grid, without its background. */
function BrandHouse({ width }: { width: number }) {
  return (
    <svg width={width} height={width} viewBox="14 14 92 92">
      <path d="M22 58 60 26l38 32" fill="none" stroke="white" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M32 54v34a8 8 0 0 0 8 8h40a8 8 0 0 0 8-8V54" fill="white" />
      <path d="M49 68q4-4 8 0M63 68q4-4 8 0M50 78q10 9 20 0" fill="none" stroke="#9A3412" strokeWidth="3.6" strokeLinecap="round" />
      <path d="M90 22l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" fill="#FDE68A" />
    </svg>
  );
}

export async function GET(_request: Request, { params }: RouteContext<"/icons/[name]">) {
  const { name } = await params;
  const icon = ICONS[name as IconName];
  if (!icon) return new Response("Not found", { status: 404 });
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: icon.background ? APP_ICON_BACKGROUND : "transparent",
        }}
      >
        {icon.background ? <BrandHouse width={icon.size * icon.scale} /> : <House width={icon.size * icon.scale} />}
      </div>
    ),
    { width: icon.size, height: icon.size, headers: { "Cache-Control": "public, max-age=86400" } },
  );
}
