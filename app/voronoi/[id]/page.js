import { getVoronoiCells } from "@/lib/kv";
import VoronoiClient from "./VoronoiClient";
import { notFound } from "next/navigation";

export async function generateMetadata({ params }) {
  const { id } = await params;
  return {
    title: `Voronoi ${id} - SimpleRedirect`,
    description: `Interactive Voronoi PDF viewer for ${id}`,
  };
}

export default async function VoronoiPage({ params }) {
  const { id } = await params;

  if (!id.match(/^v[1-5]$/)) {
    notFound();
  }

  const cells = await getVoronoiCells(id);

  return <VoronoiClient id={id} cells={cells} />;
}
