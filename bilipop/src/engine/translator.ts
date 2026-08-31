import { PHRASES, WORDS } from './dictionary';

const MAX_PHRASE_WORDS = 6;
const TOKEN_PATTERN = /https?:\/\/\S+|[A-Za-z]+(?:'[A-Za-z]+)?|\d+(?:\.\d+)?|[\u4e00-\u9fff]+|\p{Extended_Pictographic}(?:\uFE0F)?|[\s]+|[^\s]/gu;

function normalizeToken(token: string): string {
  return token.toLowerCase().replace(/’/g, "'");
}

function stemLookup(word: string): string | undefined {
  const direct = WORDS[word];
  if (direct !== undefined) return direct;
  if (word.endsWith('ies') && word.length > 4) {
    const stemmed = `${word.slice(0, -3)}y`;
    if (WORDS[stemmed] !== undefined) return WORDS[stemmed];
  }
  if (word.endsWith('ing') && word.length > 5) {
    const stem = word.slice(0, -3);
    if (WORDS[stem] !== undefined) return WORDS[stem];
    if (WORDS[`${stem}e`] !== undefined) return WORDS[`${stem}e`];
  }
  if (word.endsWith('ed') && word.length > 4) {
    const stem = word.slice(0, -2);
    if (WORDS[stem] !== undefined) return WORDS[stem];
    if (WORDS[`${stem}e`] !== undefined) return WORDS[`${stem}e`];
  }
  if (word.endsWith('s') && word.length > 3) {
    const stem = word.slice(0, -1);
    if (WORDS[stem] !== undefined) return WORDS[stem];
  }
  return undefined;
}

function tokenize(text: string): string[] {
  return text.match(TOKEN_PATTERN) ?? [];
}

function isWord(token: string): boolean {
  return /^[A-Za-z]+(?:'[A-Za-z]+)?$/.test(token);
}

const PUNCTUATION: Record<string, string> = {
  '.': '。',
  '!': '！',
  '?': '？',
  ',': '，',
  ';': '；',
  ':': '：',
};

const FRONT_BITS = ['在家', '在学校', '今天', '今晚', '明天'];

function frontLocatives(sentence: string): string {
  const trimmed = sentence.trim();
  if (!trimmed) return trimmed;
  for (const bit of FRONT_BITS) {
    if (trimmed.includes(bit) && !trimmed.startsWith(bit)) {
      return `${bit}${trimmed.replace(bit, '')}`;
    }
  }
  return trimmed;
}

function glue(parts: string[]): string {
  let out = '';
  for (const part of parts) {
    if (!part) continue;
    if (!out) {
      out = part;
      continue;
    }
    const left = out[out.length - 1] ?? '';
    const right = part[0] ?? '';
    const leftLatin = /[A-Za-z0-9]/.test(left);
    const rightLatin = /[A-Za-z0-9]/.test(right);
    const rightPunct = /[.,!?;:，。！？、]/.test(right);
    if (rightPunct) {
      out += part;
    } else if (leftLatin && rightLatin) {
      out += ` ${part}`;
    } else {
      out += part;
    }
  }
  return out.replace(/[ \t]+\n/g, '\n').replace(/\n[ \t]+/g, '\n').trim();
}

function translateChunk(english: string): string {
  const tokens = tokenize(english);
  const out: string[] = [];
  let index = 0;
  while (index < tokens.length) {
    const token = tokens[index];
    if (token === undefined) break;
    if (/^\s+$/.test(token)) {
      if (token.includes('\n')) out.push(token.replace(/[^\n]/g, ''));
      index += 1;
      continue;
    }
    if (!isWord(token)) {
      out.push(PUNCTUATION[token] ?? token);
      index += 1;
      continue;
    }

    let matched = false;
    const max = Math.min(MAX_PHRASE_WORDS, tokens.length - index);
    for (let width = max; width >= 2; width -= 1) {
      const slice = tokens.slice(index, index + width);
      if (!slice.every((item, sliceIndex) => sliceIndex % 2 === 1 || isWord(item))) {
        continue;
      }
      const words = slice.filter((item) => !/^\s+$/.test(item)).map(normalizeToken);
      if (words.length < 2) continue;
      const key = words.join(' ');
      const phrase = PHRASES[key];
      if (phrase !== undefined) {
        if (phrase) out.push(phrase);
        index += width;
        matched = true;
        break;
      }
    }
    if (matched) continue;

    const word = normalizeToken(token);
    const mapped = stemLookup(word);
    if (mapped !== undefined) {
      if (mapped) out.push(mapped);
    } else if (/^[A-Z]/.test(token) || token.length <= 3) {
      out.push(token);
    }
    index += 1;
  }
  return glue(out);
}

export function translateToChinese(english: string): string {
  if (!english.trim()) return '';
  return english
    .split(/\n/)
    .map((line) => frontLocatives(translateChunk(line)))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function keywordsFromEnglish(body: string, hashtags: string[]): string[] {
  const tags = hashtags.map((tag) => tag.toLowerCase());
  const words = body
    .toLowerCase()
    .replace(/[^a-z0-9\s']/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 2 && WORDS[word] !== '');
  return [...new Set([...tags, ...words])];
}
