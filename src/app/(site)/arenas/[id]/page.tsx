import { redirect } from "next/navigation";

export default async function PublicArenaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/challenges/${encodeURIComponent(id)}`);
}
