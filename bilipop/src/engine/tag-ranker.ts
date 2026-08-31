import type { HarvestedVideo } from './bilibili';
import type { Topic } from './topic-brain';

const CAMPAIGN =
  /挑战$|申请出战|指南|必备|战[“"「]|打卡挑战|不咕咕|事务所|封神/;

export type RankedTag = {
  tag: string;
  score: number;
  hits: number;
};

function isLikelyUseful(tag: string): boolean {
  const trimmed = tag.trim();
  if (trimmed.length < 2 || trimmed.length > 12) return false;
  if (CAMPAIGN.test(trimmed)) return false;
  if (/^[0-9.]+$/.test(trimmed)) return false;
  return true;
}

function overlapBonus(tag: string, topics: Topic[]): number {
  const lower = tag.toLowerCase();
  let bonus = 0;
  for (const topic of topics) {
    if (topic.searchSeeds.some((seed) => lower.includes(seed.toLowerCase()) || seed.includes(tag))) {
      bonus += 2.4;
    }
    if (topic.catalogTags.some((item) => item.toLowerCase() === lower)) {
      bonus += 1.6;
    }
  }
  return bonus;
}

export function rankTags(
  videos: HarvestedVideo[],
  topics: Topic[],
  suggestions: string[],
  limit = 8,
): RankedTag[] {
  const scores = new Map<string, { score: number; hits: number; display: string }>();

  const bump = (raw: string, amount: number) => {
    if (!isLikelyUseful(raw)) return;
    const key = raw.toLowerCase();
    const current = scores.get(key);
    if (current) {
      current.score += amount;
      current.hits += 1;
      return;
    }
    scores.set(key, { score: amount, hits: 1, display: raw });
  };

  for (const video of videos) {
    const weight = Math.log10((video.plays || 1) + 10);
    for (const tag of video.tags) {
      bump(tag, 1 + weight + overlapBonus(tag, topics));
    }
  }

  for (const suggestion of suggestions) {
    bump(suggestion, 1.8 + overlapBonus(suggestion, topics));
  }

  for (const topic of topics) {
    for (const tag of topic.catalogTags.slice(0, 3)) {
      bump(tag, 0.6);
    }
  }

  return [...scores.values()]
    .map((row) => ({ tag: row.display, score: row.score, hits: row.hits }))
    .sort((a, b) => b.score - a.score || b.hits - a.hits)
    .slice(0, limit);
}
