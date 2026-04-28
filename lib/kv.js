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

export { TOTAL_CODES };
