import { Redis } from "@upstash/redis";

let redis = null;

function getRedis() {
  if (!redis) {
    redis = new Redis({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
    });
  }
  return redis;
}

const TOTAL_CODES = 20;

/**
 * Get all 20 redirect mappings.
 * Returns an object like { "1": "https://example.com", "2": null, ... }
 */
export async function getAllLinks() {
  const db = getRedis();
  const pipeline = db.pipeline();

  for (let i = 1; i <= TOTAL_CODES; i++) {
    pipeline.get(`redirect:${i}`);
  }

  const results = await pipeline.exec();
  const links = {};

  for (let i = 1; i <= TOTAL_CODES; i++) {
    links[i] = results[i - 1] || null;
  }

  return links;
}

/**
 * Get a single redirect destination by ID.
 */
export async function getLink(id) {
  const db = getRedis();
  return await db.get(`redirect:${id}`);
}

/**
 * Set a redirect destination for a given ID.
 */
export async function setLink(id, url) {
  const db = getRedis();
  if (!url || url.trim() === "") {
    await db.del(`redirect:${id}`);
    return null;
  }
  await db.set(`redirect:${id}`, url.trim());
  return url.trim();
}

/**
 * Increment scan count for a QR code.
 */
export async function incrementScanCount(id) {
  const db = getRedis();
  return await db.incr(`scans:${id}`);
}

/**
 * Get scan counts for all QR codes.
 */
export async function getAllScanCounts() {
  const db = getRedis();
  const pipeline = db.pipeline();

  for (let i = 1; i <= TOTAL_CODES; i++) {
    pipeline.get(`scans:${i}`);
  }

  const results = await pipeline.exec();
  const counts = {};

  for (let i = 1; i <= TOTAL_CODES; i++) {
    counts[i] = parseInt(results[i - 1]) || 0;
  }

  return counts;
}

export async function setVoronoiCellData(voronoiId, cellId, data) {
  const db = getRedis();
  if (!data || (!data.url && !data.name)) {
    await db.del(`voronoi:${voronoiId}:cell:${cellId}`);
    await db.del(`voronoi:${voronoiId}:cell:${cellId}:file`);
    return null;
  }
  await db.set(`voronoi:${voronoiId}:cell:${cellId}`, JSON.stringify(data));
  return data;
}

export async function setVoronoiCellFile(voronoiId, cellId, base64) {
  const db = getRedis();
  await db.set(`voronoi:${voronoiId}:cell:${cellId}:file`, base64);
}

export async function getVoronoiCellFile(voronoiId, cellId) {
  const db = getRedis();
  return await db.get(`voronoi:${voronoiId}:cell:${cellId}:file`);
}

export async function getVoronoiCells(voronoiId) {
  const db = getRedis();
  const pipeline = db.pipeline();

  for (let i = 1; i <= 10; i++) {
    pipeline.get(`voronoi:${voronoiId}:cell:${i}`);
  }

  const results = await pipeline.exec();
  const cells = {};

  for (let i = 1; i <= 10; i++) {
    const raw = results[i - 1];
    if (raw) {
      try {
        cells[i] = typeof raw === "string" ? JSON.parse(raw) : raw;
      } catch {
        cells[i] = { url: raw, name: `Cell ${i}` };
      }
    } else {
      cells[i] = null;
    }
  }

  return cells;
}

export { TOTAL_CODES };
