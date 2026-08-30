import {
  CameraType,
  CameraView,
  useCameraPermissions,
  useMicrophonePermissions,
} from 'expo-camera';
import * as Haptics from 'expo-haptics';
import * as KeepAwake from 'expo-keep-awake';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, AppState } from 'react-native';

import {
  lockRecordingOrientation,
  unlockRecordingOrientation,
} from '@/services/recording-orientation';
import {
  requestVideoSavePermission,
  saveVideoToCameraRoll,
} from '@/services/video-library';

const MAX_RECORDING_DURATION_SECONDS = 60 * 60;
const RECORDING_KEEP_AWAKE_TAG = 'cuecam-recording';

type CameraRecordingSessionOptions = {
  canRecord: boolean;
  countdownSeconds: number;
  onPrepare: () => void;
  onPermissionsGranted: () => void;
  onRecordingStarted: () => void;
  onRecordingFinished: () => void;
};

export function useCameraRecordingSession(options: CameraRecordingSessionOptions) {
  const cameraRef = useRef<CameraView>(null);
  const mountedRef = useRef(true);
  const callbacksRef = useRef(options);
  const sessionActiveRef = useRef(false);
  const segmentActiveRef = useRef(false);
  const startPendingRef = useRef(false);
  const resumeAfterCameraReadyRef = useRef(false);
  const countdownRunRef = useRef(0);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [microphonePermission, requestMicrophonePermission] = useMicrophonePermissions();
  const [cameraReady, setCameraReady] = useState(false);
  const [facing, setFacing] = useState<CameraType>('front');
  const [isRecording, setIsRecording] = useState(false);
  const [isSwitchingCamera, setIsSwitchingCamera] = useState(false);
  const [countdownValue, setCountdownValue] = useState<number | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    callbacksRef.current = options;
  }, [options]);

  const stopCurrentRecording = useCallback(() => {
    cameraRef.current?.stopRecording();
  }, []);

  const finishSession = useCallback(() => {
    sessionActiveRef.current = false;
    resumeAfterCameraReadyRef.current = false;
    unlockRecordingOrientation().catch(() => undefined);
    if (!mountedRef.current) return;
    setIsSwitchingCamera(false);
    setIsRecording(false);
    callbacksRef.current.onRecordingFinished();
  }, []);

  const abandonSession = useCallback(() => {
    countdownRunRef.current += 1;
    if (mountedRef.current) {
      setCountdownValue(null);
      setIsSwitchingCamera(false);
    }
    if (!sessionActiveRef.current) return;
    sessionActiveRef.current = false;
    resumeAfterCameraReadyRef.current = false;
    if (segmentActiveRef.current) stopCurrentRecording();
    else finishSession();
  }, [finishSession, stopCurrentRecording]);

  const requestRecordingPermissions = useCallback(async () => {
    const camera = cameraPermission?.granted
      ? cameraPermission
      : await requestCameraPermission();
    if (!camera.granted) return false;
    const microphone = microphonePermission?.granted
      ? microphonePermission
      : await requestMicrophonePermission();
    if (!microphone.granted) return false;
    return requestVideoSavePermission();
  }, [
    cameraPermission,
    microphonePermission,
    requestCameraPermission,
    requestMicrophonePermission,
  ]);

  const saveRecording = useCallback(async (uri: string) => {
    try {
      const result = await saveVideoToCameraRoll(uri);
      if (result === 'permission-denied') {
        if (mountedRef.current) {
          Alert.alert('Video was not saved', 'CueCam no longer has permission to add videos to your camera roll. Enable access and record the clip again.');
        }
        return;
      }
      if (!mountedRef.current) return;
      setSavedNotice(true);
      if (toastTimeoutRef.current !== null) clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = setTimeout(() => {
        if (mountedRef.current) setSavedNotice(false);
      }, 2800);
    } catch (error) {
      if (mountedRef.current) {
        Alert.alert('Could not save video', error instanceof Error ? error.message : 'Please try again.');
      }
    }
  }, []);

  const recordCameraSegment = async () => {
    if (!sessionActiveRef.current || segmentActiveRef.current) return;
    segmentActiveRef.current = true;

    try {
      const camera = cameraRef.current;
      if (!camera) throw new Error('The camera is not ready.');
      const recording = await camera.recordAsync({ maxDuration: MAX_RECORDING_DURATION_SECONDS });
      if (recording?.uri) await saveRecording(recording.uri);
    } catch (error) {
      if (
        mountedRef.current &&
        sessionActiveRef.current &&
        !resumeAfterCameraReadyRef.current
      ) {
        Alert.alert('Recording stopped', error instanceof Error ? error.message : 'The camera could not continue recording.');
        sessionActiveRef.current = false;
      }
    } finally {
      segmentActiveRef.current = false;
      if (!sessionActiveRef.current) {
        finishSession();
      } else if (resumeAfterCameraReadyRef.current) {
        if (mountedRef.current) {
          setCameraReady(false);
          setFacing((value) => (value === 'front' ? 'back' : 'front'));
        }
      } else {
        finishSession();
      }
    }
  };

  const handleCameraReady = () => {
    setCameraReady(true);
    if (!sessionActiveRef.current || !resumeAfterCameraReadyRef.current) return;
    resumeAfterCameraReadyRef.current = false;
    setIsSwitchingCamera(false);
    requestAnimationFrame(() => void recordCameraSegment());
  };

  const handleCameraMountError = ({ message }: { message: string }) => {
    sessionActiveRef.current = false;
    resumeAfterCameraReadyRef.current = false;
    finishSession();
    Alert.alert('Camera unavailable', message);
  };

  const flipCamera = () => {
    if (countdownValue !== null || isSwitchingCamera) return;
    if (!isRecording) {
      Haptics.selectionAsync().catch(() => undefined);
      setCameraReady(false);
      setFacing((value) => (value === 'front' ? 'back' : 'front'));
      return;
    }
    if (!segmentActiveRef.current) return;
    Haptics.selectionAsync().catch(() => undefined);
    resumeAfterCameraReadyRef.current = true;
    setIsSwitchingCamera(true);
    cameraRef.current?.stopRecording();
  };

  const beginRecording = async () => {
    if (
      !cameraReady ||
      !callbacksRef.current.canRecord ||
      countdownValue !== null ||
      startPendingRef.current ||
      sessionActiveRef.current
    ) return;

    try {
      startPendingRef.current = true;
      callbacksRef.current.onPrepare();
      const granted = await requestRecordingPermissions();
      if (!mountedRef.current || AppState.currentState !== 'active') return;
      if (!granted) {
        Alert.alert('Permissions needed', 'CueCam needs camera, microphone, and add-only gallery access to record and save your video.');
        return;
      }
      if (!callbacksRef.current.canRecord) return;

      callbacksRef.current.onPermissionsGranted();
      setRecordingSeconds(0);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);

      const countdownRun = ++countdownRunRef.current;
      const countdownSeconds = callbacksRef.current.countdownSeconds;
      for (let number = countdownSeconds; number > 0; number -= 1) {
        setCountdownValue(number);
        await new Promise((resolve) => setTimeout(resolve, 1000));
        if (
          !mountedRef.current ||
          AppState.currentState !== 'active' ||
          countdownRunRef.current !== countdownRun
        ) return;
      }

      setCountdownValue(null);
      try {
        await lockRecordingOrientation();
      } catch (error) {
        Alert.alert(
          'Could not lock orientation',
          error instanceof Error ? error.message : 'Recording did not start. Please try again.',
        );
        return;
      }
      if (!mountedRef.current || AppState.currentState !== 'active' || !cameraRef.current) {
        unlockRecordingOrientation().catch(() => undefined);
        return;
      }

      sessionActiveRef.current = true;
      setIsRecording(true);
      callbacksRef.current.onRecordingStarted();
      void recordCameraSegment();
    } finally {
      startPendingRef.current = false;
    }
  };

  const stopRecording = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    abandonSession();
  };

  useEffect(() => {
    const held = isRecording || countdownValue !== null;
    if (held) {
      KeepAwake.activateKeepAwakeAsync(RECORDING_KEEP_AWAKE_TAG).catch(() => undefined);
    } else {
      KeepAwake.deactivateKeepAwake(RECORDING_KEEP_AWAKE_TAG).catch(() => undefined);
    }
    return () => {
      KeepAwake.deactivateKeepAwake(RECORDING_KEEP_AWAKE_TAG).catch(() => undefined);
    };
  }, [countdownValue, isRecording]);

  useEffect(() => {
    if (!isRecording) return;
    const timer = setInterval(() => setRecordingSeconds((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, [isRecording]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') return;
      abandonSession();
    });
    return () => subscription.remove();
  }, [abandonSession]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      startPendingRef.current = false;
      abandonSession();
      unlockRecordingOrientation().catch(() => undefined);
      if (toastTimeoutRef.current !== null) clearTimeout(toastTimeoutRef.current);
    };
  }, [abandonSession]);

  const isSessionInProgress = isRecording || countdownValue !== null;
  const cameraPreviewProps = {
    facing,
    mirror: facing === 'front',
    mode: 'video' as const,
    mute: false,
    onCameraReady: handleCameraReady,
    onMountError: handleCameraMountError,
  };

  return {
    beginRecording,
    cameraPermission,
    cameraPreviewProps,
    cameraReady,
    cameraRef,
    countdownValue,
    flipCamera,
    isRecording,
    isSessionInProgress,
    isSwitchingCamera,
    microphonePermission,
    recordingSeconds,
    requestRecordingPermissions,
    savedNotice,
    stopRecording,
  };
}
