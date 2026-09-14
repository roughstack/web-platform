import { NextResponse } from "next/server";

import { loadArenaCatalog } from "@/lib/arena/catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const arenas = await loadArenaCatalog();
    return NextResponse.json(
      { arenas },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Failed to load arena catalog", error);
    return NextResponse.json(
      { error: "Arena catalog is unavailable" },
      { status: 500 },
    );
  }
}
