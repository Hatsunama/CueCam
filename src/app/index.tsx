import { useState } from 'react';

import { appendRecordedClip, ProjectLibraryScreen } from '@/components/project-library-screen';
import { TeleprompterScreen } from '@/components/teleprompter-screen';

export default function HomeScreen() {
  const [recordingProjectId, setRecordingProjectId] = useState<string | null>(null);

  if (recordingProjectId) {
    return (
      <TeleprompterScreen
        onExit={() => setRecordingProjectId(null)}
        onRecordingSaved={(uri, durationSeconds) => {
          appendRecordedClip(recordingProjectId, {
            id: `recorded-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            uri,
            name: `Recorded ${new Date().toLocaleString()}`,
            durationSeconds,
          });
        }}
      />
    );
  }

  return <ProjectLibraryScreen onRecordNew={setRecordingProjectId} />;
}
