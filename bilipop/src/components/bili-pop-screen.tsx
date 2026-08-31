import { useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';

import { popEnglishPost, type PopResult } from '@/engine/pop-tags';
import { colors, radii } from '@/theme';

const SAMPLE = `Tried this viral matcha latte at home and it slapped. Save this for later!

#matcha #recipe #asmr #foodie #fyp`;

const displayFont = Platform.select({
  ios: 'AvenirNext-Heavy',
  android: 'sans-serif-black',
  default: 'system-ui',
});

const bodyFont = Platform.select({
  ios: 'AvenirNext-Medium',
  android: 'sans-serif-medium',
  default: 'system-ui',
});

const CHIP_COLORS = [colors.mint, colors.lemon, colors.sky, colors.grape, colors.bubble];

export function BiliPopScreen() {
  const [draft, setDraft] = useState(SAMPLE);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PopResult | null>(null);

  const popIt = async () => {
    const text = draft.trim();
    if (!text || busy) return;
    setBusy(true);
    setCopied(false);
    setError(null);
    try {
      const popped = await popEnglishPost(text);
      setResult(popped);
    } catch (caught) {
      setResult(null);
      setError(caught instanceof Error ? caught.message : 'Could not pop this post.');
    } finally {
      setBusy(false);
    }
  };

  const copyCaption = async () => {
    if (!result) return;
    await Clipboard.setStringAsync(result.caption);
    setCopied(true);
  };

  return (
    <View style={styles.root}>
      <View style={[styles.blob, styles.blobMint]} />
      <View style={[styles.blob, styles.blobLemon]} />
      <View style={[styles.blob, styles.blobSky]} />
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.kicker}>bubble gum for bilibili</Text>
          <Text style={styles.title}>BiliPop</Text>
          <Text style={styles.subtitle}>
            Paste an English post. Tiny on-device brain translates it, then swaps hashtags for
            whatever is actually popping with Chinese creators.
          </Text>

          <View style={styles.card}>
            <Text style={styles.label}>your english post</Text>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="paste caption + hashtags"
              placeholderTextColor={colors.inkSoft}
              multiline
              textAlignVertical="top"
              style={styles.input}
            />
            <Pressable onPress={() => setDraft(SAMPLE)} style={styles.sample}>
              <Text style={styles.sampleText}>load sample</Text>
            </Pressable>
          </View>

          <Pressable
            onPress={() => {
              void popIt();
            }}
            disabled={busy || draft.trim().length === 0}
            style={({ pressed }) => [
              styles.popButton,
              pressed && styles.popPressed,
              (busy || draft.trim().length === 0) && styles.popDisabled,
            ]}
          >
            {busy ? (
              <ActivityIndicator color={colors.cream} />
            ) : (
              <Text style={styles.popText}>POP IT</Text>
            )}
          </Pressable>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          {result ? (
            <View style={styles.result}>
              <Text style={styles.label}>ready for bilibili</Text>
              <Text style={styles.description}>{result.description || '（无文字，只有标签）'}</Text>
              <View style={styles.chips}>
                {result.tags.map((tag, index) => (
                  <View
                    key={tag}
                    style={[
                      styles.chip,
                      { backgroundColor: CHIP_COLORS[index % CHIP_COLORS.length] },
                    ]}
                  >
                    <Text style={styles.chipText}>#{tag}#</Text>
                  </View>
                ))}
              </View>
              <Text style={styles.meta}>
                {result.source === 'live'
                  ? `from ${result.videosScanned} popular videos`
                  : 'from the on-device catalog (bilibili was unreachable)'}
              </Text>
              <Pressable
                onPress={() => {
                  void copyCaption();
                }}
                style={({ pressed }) => [styles.copyButton, pressed && styles.popPressed]}
              >
                <Text style={styles.copyText}>{copied ? 'copied!' : 'copy caption'}</Text>
              </Pressable>
            </View>
          ) : (
            <Text style={styles.hint}>one job. no accounts. translation stays on the phone.</Text>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.cotton,
  },
  safe: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 48,
    gap: 16,
  },
  blob: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.7,
  },
  blobMint: {
    width: 180,
    height: 180,
    backgroundColor: colors.mint,
    top: -40,
    right: -30,
  },
  blobLemon: {
    width: 120,
    height: 120,
    backgroundColor: colors.lemon,
    top: 120,
    left: -40,
  },
  blobSky: {
    width: 160,
    height: 160,
    backgroundColor: colors.sky,
    bottom: 40,
    right: -50,
  },
  kicker: {
    fontFamily: bodyFont,
    color: colors.inkSoft,
    fontSize: 13,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  title: {
    fontFamily: displayFont,
    color: colors.ink,
    fontSize: 56,
    lineHeight: 58,
  },
  subtitle: {
    fontFamily: bodyFont,
    color: colors.inkSoft,
    fontSize: 16,
    lineHeight: 22,
  },
  card: {
    backgroundColor: colors.cream,
    borderRadius: radii.card,
    padding: 16,
    borderWidth: 3,
    borderColor: colors.ink,
  },
  label: {
    fontFamily: displayFont,
    color: colors.bubbleDeep,
    fontSize: 14,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  input: {
    minHeight: 140,
    fontFamily: bodyFont,
    color: colors.ink,
    fontSize: 16,
    lineHeight: 22,
  },
  sample: {
    alignSelf: 'flex-start',
    marginTop: 8,
    backgroundColor: colors.lemon,
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 2,
    borderColor: colors.ink,
  },
  sampleText: {
    fontFamily: bodyFont,
    color: colors.ink,
    fontSize: 13,
  },
  popButton: {
    backgroundColor: colors.bubbleDeep,
    borderRadius: radii.pill,
    minHeight: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.ink,
  },
  popPressed: {
    transform: [{ scale: 0.98 }],
  },
  popDisabled: {
    opacity: 0.5,
  },
  popText: {
    fontFamily: displayFont,
    color: colors.cream,
    fontSize: 28,
    letterSpacing: 1,
  },
  result: {
    backgroundColor: colors.cream,
    borderRadius: radii.card,
    padding: 16,
    borderWidth: 3,
    borderColor: colors.ink,
    gap: 12,
  },
  description: {
    fontFamily: bodyFont,
    color: colors.ink,
    fontSize: 18,
    lineHeight: 26,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 2,
    borderColor: colors.ink,
  },
  chipText: {
    fontFamily: bodyFont,
    color: colors.chipInk,
    fontSize: 14,
  },
  meta: {
    fontFamily: bodyFont,
    color: colors.inkSoft,
    fontSize: 13,
  },
  copyButton: {
    backgroundColor: colors.mint,
    borderRadius: radii.pill,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.ink,
  },
  copyText: {
    fontFamily: displayFont,
    color: colors.ink,
    fontSize: 18,
  },
  hint: {
    fontFamily: bodyFont,
    color: colors.inkSoft,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  error: {
    fontFamily: bodyFont,
    color: colors.bubbleDeep,
    fontSize: 14,
    textAlign: 'center',
  },
});
