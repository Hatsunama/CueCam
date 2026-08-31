export type Topic = {
  id: string;
  labels: string[];
  searchSeeds: string[];
  catalogTags: string[];
};

export const TOPICS: Topic[] = [
  {
    id: 'unbox',
    labels: ['unbox', 'unboxing', 'haul', 'package', 'opening', 'review', 'gadget', 'tech', 'phone'],
    searchSeeds: ['开箱', '数码评测'],
    catalogTags: ['开箱', '评测', '数码', '种草', '开箱视频', '科技'],
  },
  {
    id: 'food',
    labels: [
      'food',
      'foodie',
      'recipe',
      'recipes',
      'cook',
      'cooking',
      'bake',
      'baking',
      'latte',
      'matcha',
      'coffee',
      'snack',
      'mukbang',
      'eat',
      'dinner',
      'breakfast',
    ],
    searchSeeds: ['美食教程', '美食测评'],
    catalogTags: ['美食教程', '美食制作', '美食vlog', '吃播', '试吃', '家常菜', '饮品'],
  },
  {
    id: 'asmr',
    labels: ['asmr', 'relax', 'relaxing', 'sleep', 'sleepy', 'satisfy', 'satisfying'],
    searchSeeds: ['ASMR', '助眠'],
    catalogTags: ['asmr', '助眠', '解压', '治愈', '放松', '吃货'],
  },
  {
    id: 'beauty',
    labels: ['grwm', 'makeup', 'make-up', 'skincare', 'beauty', 'glow', 'cosmetic', 'lipstick'],
    searchSeeds: ['妆容', '美妆'],
    catalogTags: ['美妆', '妆容', '化妆', '护肤', '美妆博主', '变妆'],
  },
  {
    id: 'fashion',
    labels: ['ootd', 'outfit', 'outfits', 'fashion', 'clothes', 'dress', 'fitcheck', 'wear'],
    searchSeeds: ['穿搭'],
    catalogTags: ['穿搭', '今日穿搭', '服饰', '日常', '种草', '女装'],
  },
  {
    id: 'vlog',
    labels: ['vlog', 'daily', 'routine', 'dayinmylife', 'life', 'morning', 'night'],
    searchSeeds: ['日常vlog', 'vlog'],
    catalogTags: ['日常vlog', 'vlog', '日常', '生活记录', 'VLOG'],
  },
  {
    id: 'game',
    labels: ['game', 'gaming', 'gameplay', 'stream', 'letsplay', 'esports'],
    searchSeeds: ['游戏实况'],
    catalogTags: ['游戏实况', '游戏', '实况', '电子榨菜', '单机游戏'],
  },
  {
    id: 'dance',
    labels: ['dance', 'dancing', 'choreo', 'kpop', 'cover'],
    searchSeeds: ['舞蹈', '翻跳'],
    catalogTags: ['舞蹈', '翻跳', '打卡挑战', '混剪'],
  },
  {
    id: 'art',
    labels: ['art', 'draw', 'drawing', 'paint', 'painting', 'sketch', 'illustration'],
    searchSeeds: ['手绘', '绘画'],
    catalogTags: ['手绘', '绘画', '画画', '原创手绘', '二次元'],
  },
  {
    id: 'fitness',
    labels: ['gym', 'workout', 'fitness', 'fit', 'exercise', 'weightloss'],
    searchSeeds: ['健身', '减脂'],
    catalogTags: ['健身', '塑形', '瘦身', '减肥', '运动', '减脂'],
  },
  {
    id: 'pets',
    labels: ['cat', 'cats', 'dog', 'dogs', 'pet', 'pets', 'kitten', 'puppy'],
    searchSeeds: ['猫咪', '宠物'],
    catalogTags: ['喵星人', '小猫', '宠物', '萌宠', '猫咪'],
  },
  {
    id: 'study',
    labels: ['study', 'studying', 'school', 'exam', 'homework', 'notes', 'college'],
    searchSeeds: ['学习方法'],
    catalogTags: ['学习方法', '学习', '干货', '考试', '高中'],
  },
  {
    id: 'funny',
    labels: ['funny', 'joke', 'comedy', 'meme', 'skit', 'lol'],
    searchSeeds: ['搞笑'],
    catalogTags: ['搞笑', '沙雕', '日常整活', '魔性'],
  },
  {
    id: 'music',
    labels: ['music', 'song', 'sing', 'singing', 'cover', 'piano', 'guitar'],
    searchSeeds: ['翻唱', '音乐'],
    catalogTags: ['翻唱', '音乐', '原创音乐', '唱歌'],
  },
  {
    id: 'anime',
    labels: ['anime', 'manga', 'cosplay', 'otaku', 'weeb'],
    searchSeeds: ['二次元', '动漫'],
    catalogTags: ['二次元', '动漫', '漫画', 'cosplay'],
  },
  {
    id: 'travel',
    labels: ['travel', 'trip', 'vacation', 'citywalk', 'explore'],
    searchSeeds: ['旅行', '探店'],
    catalogTags: ['旅行', '探店', 'vlog', '风景'],
  },
];

const STOP_TAGS = new Set([
  'fyp',
  'foryou',
  'foryoupage',
  'viral',
  'trending',
  'xyzbca',
  'capcut',
  'tiktok',
  'reels',
  'shorts',
  'explorepage',
]);

export function matchTopics(hashtags: string[], bodyWords: string[]): Topic[] {
  const haystack = new Set(
    [...hashtags, ...bodyWords].map((item) => item.toLowerCase().replace(/[^a-z0-9]/g, '')),
  );
  const scored = TOPICS.map((topic) => {
    let hits = 0;
    for (const label of topic.labels) {
      if (haystack.has(label.replace(/[^a-z0-9]/g, ''))) hits += 1;
    }
    return { topic, hits };
  }).filter((row) => row.hits > 0);
  scored.sort((a, b) => b.hits - a.hits);
  const matched = scored.map((row) => row.topic);
  if (matched.length > 0) return matched.slice(0, 3);
  return [TOPICS.find((topic) => topic.id === 'vlog') ?? TOPICS[0]!];
}

export function searchSeedsFor(topics: Topic[]): string[] {
  const seeds: string[] = [];
  const seen = new Set<string>();
  for (const topic of topics) {
    for (const seed of topic.searchSeeds) {
      if (seen.has(seed)) continue;
      seen.add(seed);
      seeds.push(seed);
    }
  }
  return seeds.slice(0, 3);
}

export function catalogTagsFor(topics: Topic[]): string[] {
  const tags: string[] = [];
  const seen = new Set<string>();
  for (const topic of topics) {
    for (const tag of topic.catalogTags) {
      const key = tag.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      tags.push(tag);
    }
  }
  return tags.slice(0, 10);
}

export function isNoiseEnglishTag(tag: string): boolean {
  return STOP_TAGS.has(tag.toLowerCase().replace(/[^a-z0-9]/g, ''));
}
