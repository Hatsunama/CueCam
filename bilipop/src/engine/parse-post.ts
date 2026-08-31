const HASHTAG_PATTERN = /#([A-Za-z0-9_]+)/g;

export type ParsedPost = {
  body: string;
  hashtags: string[];
};

export function parseEnglishPost(input: string): ParsedPost {
  const raw = input.replace(/\r\n/g, '\n').trim();
  const hashtags: string[] = [];
  const seen = new Set<string>();
  for (const match of raw.matchAll(HASHTAG_PATTERN)) {
    const tag = match[1];
    if (!tag) continue;
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    hashtags.push(tag);
  }

  const lines = raw.split('\n');
  const kept: string[] = [];
  for (const line of lines) {
    const stripped = line.replace(HASHTAG_PATTERN, ' ').replace(/\s+/g, ' ').trim();
    const tagOnly = line.trim().length > 0 && stripped.length === 0;
    if (tagOnly) continue;
    kept.push(line.replace(HASHTAG_PATTERN, '').replace(/[ \t]+/g, ' ').trimEnd());
  }

  return {
    body: kept.join('\n').replace(/\n{3,}/g, '\n\n').trim(),
    hashtags,
  };
}

export function formatBilibiliCaption(description: string, tags: string[]): string {
  const hashLine = tags.map((tag) => `#${tag}#`).join('');
  if (!description) return hashLine;
  if (!hashLine) return description;
  return `${description}\n\n${hashLine}`;
}
