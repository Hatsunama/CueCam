import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import {
  loadFrames,
  loadScript,
  loadSettings,
  saveFrames,
  saveScript,
  saveSettings,
  StoredFrames,
  TeleprompterSettings,
} from '@/services/teleprompter-storage';

const WRITE_DELAY_MS = 250;

export function useTeleprompterPersistence() {
  const [script, setScript] = useState(loadScript);
  const [settings, setSettings] = useState<TeleprompterSettings>(loadSettings);
  const [storedFrames, setStoredFrames] = useState<StoredFrames>(loadFrames);
  const latest = useRef({ script, settings, storedFrames });

  useEffect(() => {
    latest.current = { script, settings, storedFrames };
  }, [script, settings, storedFrames]);

  useEffect(() => {
    const timeout = setTimeout(() => saveScript(script), WRITE_DELAY_MS);
    return () => clearTimeout(timeout);
  }, [script]);

  useEffect(() => {
    const timeout = setTimeout(() => saveSettings(settings), WRITE_DELAY_MS);
    return () => clearTimeout(timeout);
  }, [settings]);

  useEffect(() => {
    const timeout = setTimeout(() => saveFrames(storedFrames), WRITE_DELAY_MS);
    return () => clearTimeout(timeout);
  }, [storedFrames]);

  useEffect(() => {
    const persist = () => {
      saveScript(latest.current.script);
      saveSettings(latest.current.settings);
      saveFrames(latest.current.storedFrames);
    };
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') persist();
    });
    return () => {
      subscription.remove();
      persist();
    };
  }, []);

  return {
    script,
    setScript,
    settings,
    setSettings,
    storedFrames,
    setStoredFrames,
  };
}
