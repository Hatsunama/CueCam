import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

import { md5 } from './md5';
import { formatBilibiliCaption, parseEnglishPost } from './parse-post';
import { popEnglishPost } from './pop-tags';
import { rankTags } from './tag-ranker';
import { matchTopics, searchSeedsFor } from './topic-brain';
import { translateToChinese } from './translator';

describe('md5', () => {
  it('matches Node crypto for WBI strings', () => {
    const sample = 'keyword=%E5%BC%80%E7%AE%B1&order=click&page=1&wts=1710000000';
    assert.equal(md5(sample), createHash('md5').update(sample).digest('hex'));
  });
});

describe('parseEnglishPost', () => {
  it('pulls hashtags out of the caption body', () => {
    const parsed = parseEnglishPost(
      'Tried this viral matcha latte at home!\n\n#matcha #recipe #asmr #foodie #fyp',
    );
    assert.equal(parsed.body.includes('matcha latte'), true);
    assert.equal(parsed.body.includes('#matcha'), false);
    assert.deepEqual(parsed.hashtags, ['matcha', 'recipe', 'asmr', 'foodie', 'fyp']);
  });
});

describe('translateToChinese', () => {
  it('translates a social caption on device', () => {
    const chinese = translateToChinese('I tried this new matcha latte at home. Save this for later!');
    assert.match(chinese, /抹茶/);
    assert.match(chinese, /拿铁/);
    assert.match(chinese, /在家/);
    assert.match(chinese, /收藏/);
    assert.match(chinese, /。|！/);
    assert.equal(/#/.test(chinese), false);
    assert.match(chinese, /先收藏/);
  });

  it('maps gameplay slang to bilibili-native wording', () => {
    const chinese = translateToChinese('New gameplay video of this boss fight. Like and subscribe!');
    assert.match(chinese, /游戏实况/);
    assert.match(chinese, /Boss战/);
    assert.match(chinese, /点赞关注/);
  });
});

describe('topic brain', () => {
  it('maps english food and asmr tags to chinese search seeds', () => {
    const topics = matchTopics(['matcha', 'recipe', 'asmr', 'fyp'], ['latte', 'home']);
    const ids = topics.map((topic) => topic.id);
    assert.equal(ids.includes('food'), true);
    assert.equal(ids.includes('asmr'), true);
    const seeds = searchSeedsFor(topics);
    assert.equal(seeds.some((seed) => seed.includes('美食') || seed === 'ASMR'), true);
  });
});

describe('rankTags', () => {
  it('prefers tags that show up on popular matching videos', () => {
    const topics = matchTopics(['unboxing', 'tech'], ['phone']);
    const ranked = rankTags(
      [
        {
          bvid: 'BV1',
          title: 'phone unbox',
          plays: 2_000_000,
          tags: ['开箱', '数码', '评测', '全能打卡挑战'],
        },
        {
          bvid: 'BV2',
          title: 'another unbox',
          plays: 900_000,
          tags: ['开箱', '手机', '科技猎手'],
        },
      ],
      topics,
      ['开箱视频'],
      5,
    );
    const tags = ranked.map((row) => row.tag);
    assert.equal(tags[0], '开箱');
    assert.equal(tags.includes('全能打卡挑战'), false);
  });
});

describe('formatBilibiliCaption', () => {
  it('uses the native closing-hash style', () => {
    assert.equal(
      formatBilibiliCaption('在家做抹茶拿铁', ['美食教程', '饮品']),
      '在家做抹茶拿铁\n\n#美食教程##饮品#',
    );
  });
});

describe('popEnglishPost', () => {
  it('returns chinese text and replacement tags', async () => {
    const result = await popEnglishPost(
      'Tried this viral matcha latte at home and it slapped. Save this for later!\n\n#matcha #recipe #asmr #foodie #fyp',
    );
    assert.equal(result.description.length > 0, true);
    assert.match(result.description, /抹茶|拿铁|在家/);
    assert.equal(result.tags.length > 0, true);
    assert.equal(result.caption.includes('#'), true);
    assert.equal(result.topics.includes('food') || result.topics.includes('asmr'), true);
  });
});
