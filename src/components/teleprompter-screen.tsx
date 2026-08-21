import Slider from '@react-native-community/slider';
import { CameraView } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import * as KeepAwake from 'expo-keep-awake';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import {
  Keyboard,
  KeyboardAvoidingView,
  LayoutChangeEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCameraRecordingSession } from '@/hooks/use-camera-recording-session';
import {
  PromptFrame,
  SCRIPT_CHARACTER_LIMIT,
  TeleprompterSettings,
} from '@/services/teleprompter-storage';
import { useTeleprompterPersistence } from '@/hooks/use-teleprompter-persistence';

const COLORS = {
  accent: '#E8FF5B',
  coral: '#FF6B55',
  ink: '#F8F8F2',
  muted: '#A5A6A0',
  panel: '#181916',
  panelSoft: '#242520',
  black: '#090A08',
};

const MIN_PROMPT_WIDTH = 220;
const MIN_PROMPT_HEIGHT = 180;
const PROMPT_SCREEN_MARGIN = 14;
const SCROLL_MARKER_HEIGHT = 44;

function clamp(value: number, minimum: number, maximum: number) {
  'worklet';
  return Math.min(Math.max(value, minimum), maximum);
}

function getDefaultPromptFrame(
  screenWidth: number,
  screenHeight: number,
  landscape: boolean,
  topInset: number,
  bottomInset: number,
): PromptFrame {
  const x = landscape ? screenWidth * 0.15 : 18;
  const y = landscape ? topInset + 66 : Math.max(topInset + 86, screenHeight * 0.19);
  const bottom = landscape
    ? bottomInset + 76
    : Math.max(bottomInset + 126, screenHeight * 0.17);

  return {
    x,
    y,
    width: screenWidth - x * 2,
    height: screenHeight - y - bottom,
  };
}

function fitFrameToScreen(frame: PromptFrame, screenWidth: number, screenHeight: number): PromptFrame {
  const maximumWidth = Math.max(MIN_PROMPT_WIDTH, screenWidth - PROMPT_SCREEN_MARGIN * 2);
  const maximumHeight = Math.max(MIN_PROMPT_HEIGHT, screenHeight - PROMPT_SCREEN_MARGIN * 2);
  const nextWidth = clamp(frame.width, MIN_PROMPT_WIDTH, maximumWidth);
  const nextHeight = clamp(frame.height, MIN_PROMPT_HEIGHT, maximumHeight);

  return {
    x: clamp(frame.x, PROMPT_SCREEN_MARGIN, screenWidth - nextWidth - PROMPT_SCREEN_MARGIN),
    y: clamp(frame.y, PROMPT_SCREEN_MARGIN, screenHeight - nextHeight - PROMPT_SCREEN_MARGIN),
    width: nextWidth,
    height: nextHeight,
  };
}

function IconButton({
  label,
  symbol,
  active = false,
  disabled = false,
  onPress,
}: {
  label: string;
  symbol: string;
  active?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.iconButton,
        active && styles.iconButtonActive,
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}>
      <Text style={[styles.iconSymbol, active && styles.iconSymbolActive]}>{symbol}</Text>
      <Text style={[styles.iconLabel, active && styles.iconLabelActive]}>{label}</Text>
    </Pressable>
  );
}

function SettingSlider({
  label,
  value,
  minimumValue,
  maximumValue,
  step,
  valueLabel,
  onValueChange,
}: {
  label: string;
  value: number;
  minimumValue: number;
  maximumValue: number;
  step: number;
  valueLabel: string;
  onValueChange: (value: number) => void;
}) {
  return (
    <View style={styles.settingGroup}>
      <View style={styles.settingLabelRow}>
        <Text style={styles.settingLabel}>{label}</Text>
        <Text style={styles.settingValue}>{valueLabel}</Text>
      </View>
      <Slider
        accessibilityLabel={label}
        minimumValue={minimumValue}
        maximumValue={maximumValue}
        step={step}
        value={value}
        onValueChange={onValueChange}
        minimumTrackTintColor={COLORS.accent}
        maximumTrackTintColor="#505148"
        thumbTintColor={COLORS.accent}
      />
    </View>
  );
}

function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function TeleprompterScreen() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const promptRef = useRef<ScrollView>(null);
  const inlineScriptInputRef = useRef<TextInput>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastFrameRef = useRef<number | null>(null);
  const offsetRef = useRef(0);
  const contentHeightRef = useRef(0);
  const viewportHeightRef = useRef(0);
  const manualScrollActiveRef = useRef(false);
  const manualScrollEndTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const frameX = useSharedValue(0);
  const frameY = useSharedValue(0);
  const frameWidth = useSharedValue(0);
  const frameHeight = useSharedValue(0);
  const gestureStartX = useSharedValue(0);
  const gestureStartY = useSharedValue(0);
  const gestureStartWidth = useSharedValue(0);
  const gestureStartHeight = useSharedValue(0);
  const cropPulse = useSharedValue(0);
  const guideInteraction = useSharedValue(0);
  const scrollProgress = useSharedValue(0);

  const {
    script,
    setScript,
    settings,
    setSettings,
    storedFrames,
    setStoredFrames,
  } = useTeleprompterPersistence();
  const [setupOpen, setSetupOpen] = useState(true);
  const [frameEditing, setFrameEditing] = useState(false);
  const [inlineEditing, setInlineEditing] = useState(false);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);

  const finishInlineEditing = useCallback(() => {
    setInlineEditing(false);
    Keyboard.dismiss();
  }, []);

  const {
    beginRecording,
    cameraPermission,
    cameraReady,
    cameraRef,
    countdownValue,
    facing,
    flipCamera,
    handleCameraMountError,
    handleCameraReady,
    isRecording,
    isSwitchingCamera,
    microphonePermission,
    recordingSeconds,
    requestRecordingPermissions,
    savedNotice,
    stopRecording,
  } = useCameraRecordingSession({
    canRecord: Boolean(script.trim()),
    countdownSeconds: settings.countdown,
    onPrepare: () => {
      setIsScrolling(false);
      finishInlineEditing();
    },
    onPermissionsGranted: () => {
      setSetupOpen(false);
      setFrameEditing(false);
    },
    onRecordingStarted: () => setIsScrolling(true),
    onRecordingFinished: () => setIsScrolling(false),
  });

  const orientationKey = isLandscape ? 'landscape' : 'portrait';
  const defaultPromptFrame = useMemo(
    () => getDefaultPromptFrame(width, height, isLandscape, insets.top, insets.bottom),
    [height, insets.bottom, insets.top, isLandscape, width],
  );
  const promptFrame = useMemo(
    () => fitFrameToScreen(storedFrames[orientationKey] ?? defaultPromptFrame, width, height),
    [defaultPromptFrame, height, orientationKey, storedFrames, width],
  );

  const estimatedWpm = Math.round(settings.speed * 3.3);
  const scriptWords = useMemo(() => script.trim().split(/\s+/).filter(Boolean).length, [script]);
  const estimatedMinutes = Math.max(1, Math.ceil(scriptWords / Math.max(estimatedWpm, 1)));

  useEffect(() => {
    return () => {
      KeepAwake.deactivateKeepAwake('cuecam-session').catch(() => undefined);
      if (animationFrameRef.current !== null) cancelAnimationFrame(animationFrameRef.current);
      if (manualScrollEndTimeoutRef.current !== null) {
        clearTimeout(manualScrollEndTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    frameX.value = promptFrame.x;
    frameY.value = promptFrame.y;
    frameWidth.value = promptFrame.width;
    frameHeight.value = promptFrame.height;
  }, [frameHeight, frameWidth, frameX, frameY, promptFrame]);

  useEffect(() => {
    if (!inlineEditing) return;
    const frame = requestAnimationFrame(() => inlineScriptInputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [inlineEditing]);

  useEffect(() => {
    guideInteraction.value = withTiming(frameEditing ? 1 : 0, { duration: 180 });
    if (frameEditing) {
      cropPulse.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 650 }),
          withTiming(0, { duration: 650 }),
        ),
        -1,
      );
    } else {
      cancelAnimation(cropPulse);
      cropPulse.value = 0;
    }
    return () => cancelAnimation(cropPulse);
  }, [cropPulse, frameEditing, guideInteraction]);

  const commitPromptFrame = useCallback(
    (nextFrame: PromptFrame) => {
      const fittedFrame = fitFrameToScreen(nextFrame, width, height);
      setStoredFrames((current) => ({ ...current, [orientationKey]: fittedFrame }));
    },
    [height, orientationKey, setStoredFrames, width],
  );

  const promptFrameStyle = useAnimatedStyle(() => ({
    width: frameWidth.value,
    height: frameHeight.value,
    transform: [{ translateX: frameX.value }, { translateY: frameY.value }],
  }));

  const cropBorderStyle = useAnimatedStyle(() => ({
    opacity: 0.6 + cropPulse.value * 0.4,
    transform: [{ scale: 1 + cropPulse.value * 0.003 }],
  }));

  const guideBarStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: 1 + guideInteraction.value * 2 }],
  }));

  const scrollMarkerStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY:
          scrollProgress.value * Math.max(0, viewportHeight - SCROLL_MARKER_HEIGHT - 20),
      },
    ],
  }));

  const moveGesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(frameEditing)
        .minDistance(2)
        .onBegin(() => {
          gestureStartX.value = frameX.value;
          gestureStartY.value = frameY.value;
        })
        .onUpdate((event) => {
          frameX.value = clamp(
            gestureStartX.value + event.translationX,
            PROMPT_SCREEN_MARGIN,
            width - frameWidth.value - PROMPT_SCREEN_MARGIN,
          );
          frameY.value = clamp(
            gestureStartY.value + event.translationY,
            PROMPT_SCREEN_MARGIN,
            height - frameHeight.value - PROMPT_SCREEN_MARGIN,
          );
        })
        .onEnd(() => {
          runOnJS(commitPromptFrame)({
            x: frameX.value,
            y: frameY.value,
            width: frameWidth.value,
            height: frameHeight.value,
          });
        }),
    [
      commitPromptFrame,
      frameEditing,
      frameHeight,
      frameWidth,
      frameX,
      frameY,
      gestureStartX,
      gestureStartY,
      height,
      width,
    ],
  );

  const resizeGestures = useMemo(() => {
    const createResizeGesture = (
      horizontalEdge: 'left' | 'right',
      verticalEdge: 'top' | 'bottom',
    ) =>
      Gesture.Pan()
        .enabled(frameEditing)
        .minDistance(1)
        .onBegin(() => {
          gestureStartX.value = frameX.value;
          gestureStartY.value = frameY.value;
          gestureStartWidth.value = frameWidth.value;
          gestureStartHeight.value = frameHeight.value;
        })
        .onUpdate((event) => {
          if (horizontalEdge === 'right') {
            frameWidth.value = clamp(
              gestureStartWidth.value + event.translationX,
              MIN_PROMPT_WIDTH,
              width - gestureStartX.value - PROMPT_SCREEN_MARGIN,
            );
          } else {
            const nextX = clamp(
              gestureStartX.value + event.translationX,
              PROMPT_SCREEN_MARGIN,
              gestureStartX.value + gestureStartWidth.value - MIN_PROMPT_WIDTH,
            );
            frameX.value = nextX;
            frameWidth.value = gestureStartWidth.value + gestureStartX.value - nextX;
          }

          if (verticalEdge === 'bottom') {
            frameHeight.value = clamp(
              gestureStartHeight.value + event.translationY,
              MIN_PROMPT_HEIGHT,
              height - gestureStartY.value - PROMPT_SCREEN_MARGIN,
            );
          } else {
            const nextY = clamp(
              gestureStartY.value + event.translationY,
              PROMPT_SCREEN_MARGIN,
              gestureStartY.value + gestureStartHeight.value - MIN_PROMPT_HEIGHT,
            );
            frameY.value = nextY;
            frameHeight.value = gestureStartHeight.value + gestureStartY.value - nextY;
          }
        })
        .onEnd(() => {
          runOnJS(commitPromptFrame)({
            x: frameX.value,
            y: frameY.value,
            width: frameWidth.value,
            height: frameHeight.value,
          });
        });

    return {
      topLeft: createResizeGesture('left', 'top'),
      topRight: createResizeGesture('right', 'top'),
      bottomLeft: createResizeGesture('left', 'bottom'),
      bottomRight: createResizeGesture('right', 'bottom'),
    };
  }, [
    commitPromptFrame,
    frameEditing,
    frameHeight,
    frameWidth,
    frameX,
    frameY,
    gestureStartHeight,
    gestureStartWidth,
    gestureStartX,
    gestureStartY,
    height,
    width,
  ]);

  useEffect(() => {
    const active = isRecording || isScrolling;
    if (active) {
      KeepAwake.activateKeepAwakeAsync('cuecam-session').catch(() => undefined);
    } else {
      KeepAwake.deactivateKeepAwake('cuecam-session').catch(() => undefined);
    }
    return () => {
      KeepAwake.deactivateKeepAwake('cuecam-session').catch(() => undefined);
    };
  }, [isRecording, isScrolling]);

  useEffect(() => {
    if (!isScrolling) {
      if (animationFrameRef.current !== null) cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
      lastFrameRef.current = null;
      return;
    }

    const tick = (now: number) => {
      if (manualScrollActiveRef.current) {
        lastFrameRef.current = now;
        animationFrameRef.current = requestAnimationFrame(tick);
        return;
      }
      const previous = lastFrameRef.current ?? now;
      lastFrameRef.current = now;
      const maximumOffset = Math.max(0, contentHeightRef.current - viewportHeightRef.current);
      offsetRef.current = Math.min(maximumOffset, offsetRef.current + ((now - previous) / 1000) * settings.speed);
      scrollProgress.value = maximumOffset > 0 ? offsetRef.current / maximumOffset : 0;
      promptRef.current?.scrollTo({ y: offsetRef.current, animated: false });
      if (maximumOffset > 0 && offsetRef.current >= maximumOffset) {
        setIsScrolling(false);
        return;
      }
      animationFrameRef.current = requestAnimationFrame(tick);
    };

    animationFrameRef.current = requestAnimationFrame(tick);
    return () => {
      if (animationFrameRef.current !== null) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isScrolling, scrollProgress, settings.speed]);

  const updateSetting = useCallback(<K extends keyof TeleprompterSettings>(key: K, value: TeleprompterSettings[K]) => {
    setSettings((current) => ({ ...current, [key]: value }));
  }, [setSettings]);

  const resetPrompt = useCallback(() => {
    manualScrollActiveRef.current = false;
    if (manualScrollEndTimeoutRef.current !== null) {
      clearTimeout(manualScrollEndTimeoutRef.current);
      manualScrollEndTimeoutRef.current = null;
    }
    offsetRef.current = 0;
    scrollProgress.value = 0;
    promptRef.current?.scrollTo({ y: 0, animated: true });
    setIsScrolling(false);
    Haptics.selectionAsync().catch(() => undefined);
  }, [scrollProgress]);

  const beginManualScroll = useCallback(() => {
    if (manualScrollEndTimeoutRef.current !== null) {
      clearTimeout(manualScrollEndTimeoutRef.current);
      manualScrollEndTimeoutRef.current = null;
    }
    manualScrollActiveRef.current = true;
    lastFrameRef.current = null;
  }, []);

  const finishManualScroll = useCallback(() => {
    if (manualScrollEndTimeoutRef.current !== null) {
      clearTimeout(manualScrollEndTimeoutRef.current);
      manualScrollEndTimeoutRef.current = null;
    }
    manualScrollActiveRef.current = false;
    lastFrameRef.current = null;
  }, []);

  const scheduleManualScrollFinish = useCallback(() => {
    if (manualScrollEndTimeoutRef.current !== null) {
      clearTimeout(manualScrollEndTimeoutRef.current);
    }
    manualScrollEndTimeoutRef.current = setTimeout(() => {
      manualScrollEndTimeoutRef.current = null;
      manualScrollActiveRef.current = false;
      lastFrameRef.current = null;
    }, 120);
  }, []);

  const beginInlineEditing = useCallback(() => {
    if (frameEditing || isRecording || countdownValue !== null) return;
    setIsScrolling(false);
    setInlineEditing(true);
    Haptics.selectionAsync().catch(() => undefined);
  }, [countdownValue, frameEditing, isRecording]);

  const toggleFrameEditing = () => {
    if (isRecording || countdownValue !== null) return;
    setIsScrolling(false);
    setSetupOpen(false);
    finishInlineEditing();
    setFrameEditing((active) => !active);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
  };

  const toggleScroll = () => {
    if (frameEditing) return;
    Haptics.selectionAsync().catch(() => undefined);
    setIsScrolling((value) => !value);
  };

  const onPromptLayout = (event: LayoutChangeEvent) => {
    const nextHeight = event.nativeEvent.layout.height;
    viewportHeightRef.current = nextHeight;
    setViewportHeight(nextHeight);
    const maximumOffset = Math.max(0, contentHeightRef.current - nextHeight);
    scrollProgress.value =
      maximumOffset > 0 ? clamp(offsetRef.current / maximumOffset, 0, 1) : 0;
  };

  if (!cameraPermission || !microphonePermission) {
    return <View style={styles.loadingScreen} />;
  }

  const missingPermissions = !cameraPermission.granted || !microphonePermission.granted;

  return (
    <GestureHandlerRootView style={styles.root}>
      {cameraPermission.granted ? (
        <CameraView
          key={facing}
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing={facing}
          mirror={facing === 'front'}
          mode="video"
          onCameraReady={handleCameraReady}
          onMountError={handleCameraMountError}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.cameraPlaceholder]} />
      )}

      <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.cameraShade]} />

      <View
        style={[
          styles.topBar,
          { top: insets.top + 8, left: insets.left + 12, right: insets.right + 12 },
        ]}>
        <View style={styles.brandPill}>
          <View style={[styles.statusDot, isRecording && styles.statusDotRecording]} />
          <Text style={styles.brandText}>{isRecording ? formatDuration(recordingSeconds) : 'CUECAM'}</Text>
        </View>
        <View style={styles.topActions}>
          <IconButton
            label={isSwitchingCamera ? 'Switching' : 'Flip'}
            symbol="⇄"
            disabled={countdownValue !== null || isSwitchingCamera}
            onPress={flipCamera}
          />
          <IconButton
            label="Edit"
            symbol="✎"
            disabled={isRecording || countdownValue !== null}
            onPress={() => {
              setFrameEditing(false);
              finishInlineEditing();
              setSetupOpen(true);
            }}
          />
        </View>
      </View>

      <Animated.View style={[styles.promptFrameContainer, promptFrameStyle]}>
        <View
          onLayout={onPromptLayout}
          style={[
            styles.promptFrame,
            { backgroundColor: `rgba(5, 6, 5, ${settings.overlayOpacity})` },
          ]}>
          <ScrollView
            ref={promptRef}
            contentInsetAdjustmentBehavior="never"
            showsVerticalScrollIndicator={false}
            scrollEnabled={!frameEditing}
            onScrollBeginDrag={beginManualScroll}
            onScrollEndDrag={scheduleManualScrollFinish}
            onMomentumScrollBegin={beginManualScroll}
            onMomentumScrollEnd={finishManualScroll}
            onScroll={(event) => {
              if (manualScrollActiveRef.current || !isScrolling) {
                const maximumOffset = Math.max(
                  0,
                  contentHeightRef.current - viewportHeightRef.current,
                );
                offsetRef.current = clamp(
                  event.nativeEvent.contentOffset.y,
                  0,
                  maximumOffset,
                );
                scrollProgress.value =
                  maximumOffset > 0 ? clamp(offsetRef.current / maximumOffset, 0, 1) : 0;
              }
            }}
            scrollEventThrottle={16}
            onContentSizeChange={(_, contentHeight) => {
              contentHeightRef.current = contentHeight;
              const maximumOffset = Math.max(0, contentHeight - viewportHeightRef.current);
              scrollProgress.value =
                maximumOffset > 0 ? clamp(offsetRef.current / maximumOffset, 0, 1) : 0;
            }}
            contentContainerStyle={{
              paddingTop: viewportHeight * 0.38,
              paddingBottom: viewportHeight * 0.72,
            }}>
            <View style={!inlineEditing && settings.mirrorText ? styles.mirrored : undefined}>
              {inlineEditing ? (
                <TextInput
                  ref={inlineScriptInputRef}
                  accessibilityLabel="Quick edit script"
                  autoCorrect
                  blurOnSubmit={false}
                  maxLength={SCRIPT_CHARACTER_LIMIT}
                  multiline
                  onBlur={finishInlineEditing}
                  onChangeText={(value) => setScript(value.slice(0, SCRIPT_CHARACTER_LIMIT))}
                  placeholder="Tap to write your script"
                  placeholderTextColor={COLORS.muted}
                  scrollEnabled={false}
                  style={[
                    styles.promptText,
                    styles.inlineScriptInput,
                    {
                      fontSize: settings.fontSize,
                      lineHeight: settings.fontSize * 1.34,
                      paddingHorizontal: isLandscape ? 36 : 20,
                    },
                  ]}
                  value={script}
                />
              ) : (
                <Pressable
                  accessibilityLabel="Quick edit script"
                  accessibilityRole="button"
                  disabled={frameEditing || isRecording || countdownValue !== null}
                  onPress={beginInlineEditing}
                  style={styles.promptTextPressable}>
                  <Text
                    selectable
                    style={[
                      styles.promptText,
                      {
                        fontSize: settings.fontSize,
                        lineHeight: settings.fontSize * 1.34,
                        paddingHorizontal: isLandscape ? 36 : 20,
                      },
                    ]}>
                    {script || 'Tap to write your script'}
                  </Text>
                </Pressable>
              )}
            </View>
          </ScrollView>
        </View>

        <Pressable
          accessibilityLabel={frameEditing ? 'Finish positioning prompt' : 'Position prompt'}
          accessibilityRole="button"
          disabled={isRecording || countdownValue !== null}
          hitSlop={8}
          onPress={toggleFrameEditing}
          style={styles.guideButton}>
          <Animated.View style={[styles.readingGuide, guideBarStyle]} />
        </Pressable>

        <Animated.View
          pointerEvents="none"
          style={[styles.scrollMarker, scrollMarkerStyle]}
        />

        {frameEditing && (
          <>
            <Animated.View pointerEvents="none" style={[styles.cropBorder, cropBorderStyle]} />
            <GestureDetector gesture={moveGesture}>
              <Animated.View style={styles.cropMoveSurface}>
                <View style={styles.dragHint}>
                  <Text style={styles.dragHintText}>✥ DRAG TO MOVE</Text>
                </View>
              </Animated.View>
            </GestureDetector>

            <GestureDetector gesture={resizeGestures.topLeft}>
              <Animated.View style={[styles.resizeHandle, styles.resizeHandleTopLeft]} />
            </GestureDetector>
            <GestureDetector gesture={resizeGestures.topRight}>
              <Animated.View style={[styles.resizeHandle, styles.resizeHandleTopRight]} />
            </GestureDetector>
            <GestureDetector gesture={resizeGestures.bottomLeft}>
              <Animated.View style={[styles.resizeHandle, styles.resizeHandleBottomLeft]} />
            </GestureDetector>
            <GestureDetector gesture={resizeGestures.bottomRight}>
              <Animated.View style={[styles.resizeHandle, styles.resizeHandleBottomRight]} />
            </GestureDetector>
          </>
        )}
      </Animated.View>

      {countdownValue !== null && (
        <View pointerEvents="none" style={styles.countdownOverlay}>
          <Text style={styles.countdownNumber}>{countdownValue}</Text>
          <Text style={styles.countdownLabel}>Get ready</Text>
        </View>
      )}

      {savedNotice && (
        <View pointerEvents="none" style={[styles.toast, { top: insets.top + 80 }]}>
          <Text style={styles.toastText}>✓ Saved to your gallery</Text>
        </View>
      )}

      <View
        style={[
          styles.bottomBar,
          {
            bottom: insets.bottom + 10,
            left: insets.left + 14,
            right: insets.right + 14,
          },
        ]}>
        <IconButton label="Restart" symbol="↺" onPress={resetPrompt} />
        <Pressable
          accessibilityLabel={isRecording ? 'Stop recording' : 'Start recording'}
          accessibilityRole="button"
          disabled={!cameraReady || countdownValue !== null || missingPermissions}
          onPress={isRecording ? stopRecording : beginRecording}
          style={({ pressed }) => [
            styles.recordOuter,
            (!cameraReady || countdownValue !== null || missingPermissions) && styles.disabled,
            pressed && styles.pressed,
          ]}>
          <View style={[styles.recordInner, isRecording && styles.recordInnerStop]} />
        </Pressable>
        <IconButton
          label={isScrolling ? 'Pause' : 'Scroll'}
          symbol={isScrolling ? 'Ⅱ' : '▶'}
          active={isScrolling}
          disabled={frameEditing}
          onPress={toggleScroll}
        />
      </View>

      {setupOpen && (
        <KeyboardAvoidingView behavior={process.env.EXPO_OS === 'ios' ? 'padding' : undefined} style={StyleSheet.absoluteFill}>
          <Pressable style={styles.scrim} onPress={() => setSetupOpen(false)} />
          <View
            style={[
              styles.setupPanel,
              isLandscape ? styles.setupPanelLandscape : styles.setupPanelPortrait,
              isLandscape
                ? { top: insets.top + 12, bottom: insets.bottom + 12, right: insets.right + 12 }
                : { bottom: insets.bottom + 8, left: insets.left + 8, right: insets.right + 8 },
            ]}>
            <ScrollView
              contentInsetAdjustmentBehavior="automatic"
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.setupContent}>
              <View style={styles.panelHeader}>
                <View style={styles.panelTitleWrap}>
                  <Text style={styles.eyebrow}>YOUR NEXT TAKE</Text>
                  <Text style={styles.panelTitle}>Set your cue</Text>
                </View>
                <Pressable accessibilityLabel="Close editor" onPress={() => setSetupOpen(false)} style={styles.closeButton}>
                  <Text style={styles.closeText}>×</Text>
                </Pressable>
              </View>

              <TextInput
                accessibilityLabel="Teleprompter script"
                multiline
                maxLength={SCRIPT_CHARACTER_LIMIT}
                value={script}
                onChangeText={(value) => setScript(value.slice(0, SCRIPT_CHARACTER_LIMIT))}
                placeholder="Paste or type your script…"
                placeholderTextColor="#6E7067"
                textAlignVertical="top"
                style={styles.scriptInput}
              />

              <View style={styles.scriptMeta}>
                <Text style={styles.metaText}>{scriptWords.toLocaleString()} words</Text>
                <Text style={styles.metaText}>
                  {script.length.toLocaleString()} / {SCRIPT_CHARACTER_LIMIT.toLocaleString()} chars
                </Text>
                <Text style={styles.metaText}>about {estimatedMinutes} min</Text>
                <Pressable accessibilityLabel="Clear script" accessibilityRole="button" onPress={() => setScript('')}>
                  <Text style={styles.clearText}>Clear</Text>
                </Pressable>
              </View>

              <SettingSlider
                label="Text size"
                value={settings.fontSize}
                minimumValue={24}
                maximumValue={68}
                step={1}
                valueLabel={`${settings.fontSize} pt`}
                onValueChange={(value) => updateSetting('fontSize', value)}
              />
              <SettingSlider
                label="Scroll speed"
                value={settings.speed}
                minimumValue={10}
                maximumValue={92}
                step={1}
                valueLabel={`≈ ${estimatedWpm} wpm`}
                onValueChange={(value) => updateSetting('speed', value)}
              />
              <SettingSlider
                label="Prompt backdrop"
                value={settings.overlayOpacity}
                minimumValue={0.2}
                maximumValue={0.9}
                step={0.05}
                valueLabel={`${Math.round(settings.overlayOpacity * 100)}%`}
                onValueChange={(value) => updateSetting('overlayOpacity', value)}
              />

              <View style={styles.quickSettings}>
                <View style={styles.quickGroup}>
                  <Text style={styles.quickLabel}>Countdown</Text>
                  <View style={styles.segmentRow}>
                    {[0, 3, 5].map((value) => (
                      <Pressable
                        key={value}
                        onPress={() => updateSetting('countdown', value)}
                        style={[styles.segment, settings.countdown === value && styles.segmentActive]}>
                        <Text style={[styles.segmentText, settings.countdown === value && styles.segmentTextActive]}>
                          {value === 0 ? 'Off' : `${value}s`}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
                <View style={styles.quickGroup}>
                  <Text style={styles.quickLabel}>Text</Text>
                  <Pressable
                    onPress={() => updateSetting('mirrorText', !settings.mirrorText)}
                    style={[styles.mirrorButton, settings.mirrorText && styles.segmentActive]}>
                    <Text style={[styles.segmentText, settings.mirrorText && styles.segmentTextActive]}>⇋ Mirror</Text>
                  </Pressable>
                </View>
              </View>

              {missingPermissions && (
                <Pressable
                  onPress={() => void requestRecordingPermissions()}
                  style={({ pressed }) => [styles.permissionButton, pressed && styles.pressed]}>
                  <Text style={styles.permissionButtonText}>Enable recording access</Text>
                </Pressable>
              )}

              <Pressable
                disabled={!script.trim() || missingPermissions || !cameraReady}
                onPress={() => setSetupOpen(false)}
                style={({ pressed }) => [
                  styles.readyButton,
                  (!script.trim() || missingPermissions || !cameraReady) && styles.disabled,
                  pressed && styles.pressed,
                ]}>
                <Text style={styles.readyButtonText}>{cameraReady ? 'Ready to record' : 'Starting camera…'}</Text>
                <Text style={styles.readyArrow}>→</Text>
              </Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      )}
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.black },
  loadingScreen: { flex: 1, backgroundColor: COLORS.black },
  cameraPlaceholder: { backgroundColor: '#151611' },
  cameraShade: { backgroundColor: 'rgba(0,0,0,0.12)' },
  topBar: { position: 'absolute', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  topActions: { flexDirection: 'row', gap: 8 },
  brandPill: { height: 40, paddingHorizontal: 14, borderRadius: 20, backgroundColor: 'rgba(9,10,8,0.76)', flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.accent },
  statusDotRecording: { backgroundColor: COLORS.coral },
  brandText: { color: COLORS.ink, fontSize: 13, fontWeight: '800', letterSpacing: 1.5, fontVariant: ['tabular-nums'] },
  iconButton: { minWidth: 52, height: 48, borderRadius: 15, backgroundColor: 'rgba(9,10,8,0.76)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center', gap: 1 },
  iconButtonActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  iconSymbol: { color: COLORS.ink, fontSize: 19, fontWeight: '700', lineHeight: 21 },
  iconSymbolActive: { color: COLORS.black },
  iconLabel: { color: COLORS.muted, fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  iconLabelActive: { color: COLORS.black },
  promptFrameContainer: { position: 'absolute', left: 0, top: 0, overflow: 'visible' },
  promptFrame: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  guideButton: { position: 'absolute', zIndex: 12, left: -7, top: '38%', width: 38, height: 70, alignItems: 'center', justifyContent: 'center' },
  readingGuide: { width: 4, height: 52, borderRadius: 2, backgroundColor: COLORS.accent },
  scrollMarker: { position: 'absolute', zIndex: 3, right: 8, top: 10, width: 5, height: SCROLL_MARKER_HEIGHT, borderRadius: 3, backgroundColor: COLORS.coral, boxShadow: '0 0 10px rgba(255,107,85,0.7)' },
  cropBorder: { position: 'absolute', zIndex: 4, top: -3, right: -3, bottom: -3, left: -3, borderWidth: 2, borderStyle: 'dashed', borderColor: COLORS.accent, borderRadius: 27 },
  cropMoveSurface: { position: 'absolute', zIndex: 5, top: 12, right: 12, bottom: 12, left: 12, alignItems: 'center', justifyContent: 'center' },
  dragHint: { borderRadius: 14, paddingHorizontal: 14, paddingVertical: 9, backgroundColor: 'rgba(9,10,8,0.82)', borderWidth: 1, borderColor: 'rgba(232,255,91,0.55)' },
  dragHintText: { color: COLORS.accent, fontSize: 11, fontWeight: '900', letterSpacing: 1.2 },
  resizeHandle: { position: 'absolute', zIndex: 9, width: 30, height: 30, borderRadius: 15, backgroundColor: COLORS.black, borderWidth: 3, borderColor: COLORS.accent, boxShadow: '0 0 12px rgba(232,255,91,0.55)' },
  resizeHandleTopLeft: { top: -13, left: -13 },
  resizeHandleTopRight: { top: -13, right: -13 },
  resizeHandleBottomLeft: { bottom: -13, left: -13 },
  resizeHandleBottomRight: { right: -13, bottom: -13 },
  promptText: { color: COLORS.ink, fontWeight: '700', letterSpacing: -0.6, textAlign: 'center' },
  promptTextPressable: { alignSelf: 'stretch', minHeight: 54 },
  inlineScriptInput: { minHeight: 54, paddingVertical: 0, textAlignVertical: 'top' },
  mirrored: { transform: [{ scaleX: -1 }] },
  countdownOverlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(0,0,0,0.48)', alignItems: 'center', justifyContent: 'center' },
  countdownNumber: { color: COLORS.accent, fontSize: 132, lineHeight: 142, fontWeight: '900', fontVariant: ['tabular-nums'] },
  countdownLabel: { color: COLORS.ink, fontSize: 16, fontWeight: '800', letterSpacing: 2, textTransform: 'uppercase' },
  toast: { position: 'absolute', alignSelf: 'center', backgroundColor: COLORS.accent, borderRadius: 20, paddingHorizontal: 18, paddingVertical: 11 },
  toastText: { color: COLORS.black, fontWeight: '800', fontSize: 14 },
  bottomBar: { position: 'absolute', height: 76, borderRadius: 28, paddingHorizontal: 16, backgroundColor: 'rgba(9,10,8,0.82)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  recordOuter: { width: 64, height: 64, borderRadius: 32, borderWidth: 4, borderColor: COLORS.ink, alignItems: 'center', justifyContent: 'center' },
  recordInner: { width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.coral },
  recordInnerStop: { width: 28, height: 28, borderRadius: 7 },
  scrim: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(0,0,0,0.5)' },
  setupPanel: { position: 'absolute', backgroundColor: COLORS.panel, borderRadius: 30, borderWidth: 1, borderColor: '#34362E', overflow: 'hidden', boxShadow: '0 16px 50px rgba(0,0,0,0.55)' },
  setupPanelPortrait: { maxHeight: '88%' },
  setupPanelLandscape: { width: 430 },
  setupContent: { padding: 22, gap: 18 },
  panelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  panelTitleWrap: { gap: 3 },
  eyebrow: { color: COLORS.accent, fontSize: 11, fontWeight: '900', letterSpacing: 2 },
  panelTitle: { color: COLORS.ink, fontSize: 30, fontWeight: '800', letterSpacing: -0.8 },
  closeButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.panelSoft, alignItems: 'center', justifyContent: 'center' },
  closeText: { color: COLORS.ink, fontSize: 28, lineHeight: 30, fontWeight: '300' },
  scriptInput: { minHeight: 150, maxHeight: 230, borderRadius: 20, backgroundColor: '#10110E', borderWidth: 1, borderColor: '#383A32', color: COLORS.ink, padding: 16, fontSize: 18, lineHeight: 25 },
  scriptMeta: { marginTop: -10, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12, paddingHorizontal: 5 },
  metaText: { color: COLORS.muted, fontSize: 12, fontWeight: '600', fontVariant: ['tabular-nums'] },
  clearText: { color: COLORS.coral, fontSize: 12, fontWeight: '800' },
  settingGroup: { gap: 2 },
  settingLabelRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 3 },
  settingLabel: { color: COLORS.ink, fontSize: 15, fontWeight: '700' },
  settingValue: { color: COLORS.accent, fontSize: 13, fontWeight: '800', fontVariant: ['tabular-nums'] },
  quickSettings: { flexDirection: 'row', gap: 16 },
  quickGroup: { flex: 1, gap: 8 },
  quickLabel: { color: COLORS.muted, fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  segmentRow: { flexDirection: 'row', gap: 5 },
  segment: { flex: 1, height: 36, borderRadius: 11, backgroundColor: COLORS.panelSoft, alignItems: 'center', justifyContent: 'center' },
  segmentActive: { backgroundColor: COLORS.accent },
  segmentText: { color: COLORS.ink, fontSize: 12, fontWeight: '800' },
  segmentTextActive: { color: COLORS.black },
  mirrorButton: { height: 36, borderRadius: 11, backgroundColor: COLORS.panelSoft, alignItems: 'center', justifyContent: 'center' },
  permissionButton: { minHeight: 48, borderRadius: 15, borderWidth: 1, borderColor: COLORS.accent, alignItems: 'center', justifyContent: 'center' },
  permissionButtonText: { color: COLORS.accent, fontSize: 14, fontWeight: '800' },
  readyButton: { minHeight: 58, borderRadius: 18, paddingHorizontal: 18, backgroundColor: COLORS.accent, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  readyButtonText: { color: COLORS.black, fontSize: 17, fontWeight: '900' },
  readyArrow: { color: COLORS.black, fontSize: 25, fontWeight: '500' },
  disabled: { opacity: 0.42 },
  pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
});
