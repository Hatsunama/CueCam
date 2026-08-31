# BiliPop

English tags in. Bilibili hits out.

BiliPop is a tiny Android app for people who do not speak Chinese and still want their posts to land on [Bilibili](https://www.bilibili.com). It does one job:

1. Translates your English description on the phone (no cloud model).
2. Looks up relevant *popular* Bilibili videos for the same topic.
3. Replaces `#fyp #foodie` style tags with the tags native creators are actually using, written in Bilibili's `#标签#` form.

The name is a pun: Bilibili + bubble-gum pop.

## Why the tags are not a dictionary swap

`#unboxing` is not always `开箱`, and `#GRWM` is not a phrase Chinese searchers type. BiliPop maps your post to a topic, searches what's performing on Bilibili, then ranks tags by how often they show up on high-play videos. Campaign junk (`全能打卡挑战`) is dropped.

If Bilibili is unreachable, the on-device catalog still fills in native tags for that topic.

## Run it

```sh
cd bilipop
npm install
npm start
```

On a phone:

```sh
npx expo run:android
```

Web preview (`npm run web`) can show the bubble-gum UI. Bilibili search is blocked in browsers by CORS, so the web preview uses the on-device catalog. Native Android does the live harvest.

Checks:

```sh
npm run check
```

## Privacy

Translation and topic matching stay on device. The only network calls are public Bilibili search/suggest lookups, used to harvest popular tags. There is no account, analytics, or cloud AI.
