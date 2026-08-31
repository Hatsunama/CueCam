import { harvestPopular } from './bilibili';
import { formatBilibiliCaption, parseEnglishPost } from './parse-post';
import { rankTags } from './tag-ranker';
import {
  catalogTagsFor,
  isNoiseEnglishTag,
  matchTopics,
  searchSeedsFor,
} from './topic-brain';
import { keywordsFromEnglish, translateToChinese } from './translator';

export type PopSource = 'live' | 'catalog';

export type PopResult = {
  description: string;
  tags: string[];
  caption: string;
  source: PopSource;
  videosScanned: number;
  topics: string[];
};

export async function popEnglishPost(input: string): Promise<PopResult> {
  const parsed = parseEnglishPost(input);
  const usefulTags = parsed.hashtags.filter((tag) => !isNoiseEnglishTag(tag));
  const keywords = keywordsFromEnglish(parsed.body, usefulTags);
  const topics = matchTopics(usefulTags, keywords);
  const description = translateToChinese(parsed.body);
  const seeds = searchSeedsFor(topics);

  try {
    const harvest = await harvestPopular(seeds);
    const ranked = rankTags(harvest.videos, topics, harvest.suggestions, 8);
    const tags = ranked.map((row) => row.tag);
    const finalTags = tags.length > 0 ? tags : catalogTagsFor(topics);
    return {
      description,
      tags: finalTags,
      caption: formatBilibiliCaption(description, finalTags),
      source: harvest.videos.length > 0 ? 'live' : 'catalog',
      videosScanned: harvest.videos.length,
      topics: topics.map((topic) => topic.id),
    };
  } catch {
    const tags = catalogTagsFor(topics);
    return {
      description,
      tags,
      caption: formatBilibiliCaption(description, tags),
      source: 'catalog',
      videosScanned: 0,
      topics: topics.map((topic) => topic.id),
    };
  }
}
