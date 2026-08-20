import * as Haptics from 'expo-haptics';
import * as MediaLibrary from 'expo-media-library';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const COLORS = {
  accent: '#E8FF5B',
  coral: '#FF6B55',
  ink: '#F8F8F2',
  muted: '#A5A6A0',
  panel: '#181916',
  panelSoft: '#242520',
  black: '#090A08',
};

const PROJECTS_STORAGE_KEY = 'cuecam.videoProjects';

export type TimelineClip = {
  id: string;
  uri: string;
  name: string;
  durationSeconds: number;
};

type SelectableVideo = {
  id: string;
  uri: string;
  filename: string;
  durationSeconds: number;
  creationTime: number;
};

type VideoProject = {
  id: string;
  title: string;
  clips: TimelineClip[];
  createdAt: number;
  updatedAt: number;
};

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function readProjects(): VideoProject[] {
  try {
    const raw = globalThis.localStorage?.getItem(PROJECTS_STORAGE_KEY);
    const value: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(value)) return [];
    return value.flatMap((entry): VideoProject[] => {
      if (!entry || typeof entry !== 'object') return [];
      const candidate = entry as Partial<VideoProject>;
      if (
        typeof candidate.id !== 'string' ||
        typeof candidate.title !== 'string' ||
        !Array.isArray(candidate.clips) ||
        typeof candidate.createdAt !== 'number' ||
        typeof candidate.updatedAt !== 'number'
      ) return [];
      const clips = candidate.clips.flatMap((clip): TimelineClip[] => {
        if (!clip || typeof clip !== 'object') return [];
        const video = clip as Partial<TimelineClip>;
        return typeof video.id === 'string' && typeof video.uri === 'string' && typeof video.name === 'string'
          ? [{
              id: video.id,
              uri: video.uri,
              name: video.name,
              durationSeconds: typeof video.durationSeconds === 'number' ? video.durationSeconds : 0,
            }]
          : [];
      });
      return [{
        id: candidate.id,
        title: candidate.title.slice(0, 80),
        clips,
        createdAt: candidate.createdAt,
        updatedAt: candidate.updatedAt,
      }];
    });
  } catch {
    return [];
  }
}

function writeProjects(projects: VideoProject[]) {
  try {
    globalThis.localStorage?.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
  } catch {}
}

export function appendRecordedClip(projectId: string, clip: TimelineClip) {
  const projects = readProjects().map((project) => project.id === projectId
    ? { ...project, clips: [...project.clips, clip], updatedAt: Date.now() }
    : project);
  writeProjects(projects);
}

function formatDuration(seconds: number) {
  const rounded = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(rounded / 60);
  return `${minutes}:${String(rounded % 60).padStart(2, '0')}`;
}

function projectDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function selectionIndex(assetId: string, selected: SelectableVideo[]) {
  const index = selected.findIndex((asset) => asset.id === assetId);
  return index < 0 ? undefined : index + 1;
}

function VideoPicker({
  visible,
  onClose,
  onAdd,
  onRecord,
}: {
  visible: boolean;
  onClose: () => void;
  onAdd: (assets: SelectableVideo[]) => void;
  onRecord: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [assets, setAssets] = useState<SelectableVideo[]>([]);
  const [selected, setSelected] = useState<SelectableVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadVideos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const permission = await MediaLibrary.requestPermissionsAsync(false, ['video']);
      if (!permission.granted) {
        setError('Allow video access to choose clips for this project.');
        return;
      }
      const queriedAssets = await new MediaLibrary.Query()
        .eq(MediaLibrary.AssetField.MEDIA_TYPE, MediaLibrary.MediaType.VIDEO)
        .orderBy({ key: MediaLibrary.AssetField.CREATION_TIME, ascending: false })
        .limit(200)
        .exe();
      const videos = await Promise.all(queriedAssets.map(async (asset) => {
        const [uri, filename, duration, creationTime] = await Promise.all([
          asset.getUri(),
          asset.getFilename(),
          asset.getDuration(),
          asset.getCreationTime(),
        ]);
        return {
          id: asset.id,
          uri,
          filename,
          durationSeconds: duration ? duration / 1000 : 0,
          creationTime: creationTime ?? Date.now(),
        };
      }));
      setAssets(videos);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Video library could not be opened.');
    } finally {
      setLoading(false);
    }
  }, []);

  const resetAndClose = () => {
    setSelected([]);
    setAssets([]);
    setError(null);
    onClose();
  };

  const toggleAsset = (asset: SelectableVideo) => {
    setSelected((current) => {
      const selectedAt = current.findIndex((item) => item.id === asset.id);
      Haptics.selectionAsync().catch(() => undefined);
      return selectedAt < 0
        ? [...current, asset]
        : current.filter((item) => item.id !== asset.id);
    });
  };

  const addSelected = () => {
    if (!selected.length) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    setSelected([]);
    onAdd(selected);
  };

  const recordNewVideo = () => {
    setSelected([]);
    setAssets([]);
    setError(null);
    onRecord();
  };

  return (
    <Modal animationType="slide" transparent={false} visible={visible} onRequestClose={resetAndClose} onShow={() => void loadVideos()}>
      <View style={[styles.pickerScreen, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.pickerHeader}>
          <Pressable accessibilityRole="button" accessibilityLabel="Close video picker" onPress={resetAndClose} style={styles.headerButton}>
            <Text style={styles.headerButtonText}>Cancel</Text>
          </Pressable>
          <View style={styles.pickerHeading}>
            <Text style={styles.pickerTitle}>Choose videos</Text>
            <Text style={styles.pickerSubtitle}>Tap clips in the order you want them on the timeline.</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add selected videos"
            disabled={!selected.length}
            onPress={addSelected}
            style={[styles.addButton, !selected.length && styles.addButtonDisabled]}>
            <Text style={styles.addButtonText}>Add {selected.length || ''}</Text>
          </Pressable>
        </View>

        <Pressable accessibilityRole="button" onPress={recordNewVideo} style={styles.recordNewButton}>
          <Text style={styles.recordNewSymbol}>●</Text>
          <View>
            <Text style={styles.recordNewTitle}>Record a new video</Text>
            <Text style={styles.recordNewSubtitle}>Record it directly into this project.</Text>
          </View>
        </Pressable>

        {loading ? (
          <View style={styles.pickerEmpty}><ActivityIndicator color={COLORS.accent} /></View>
        ) : error ? (
          <View style={styles.pickerEmpty}>
            <Text selectable style={styles.pickerEmptyText}>{error}</Text>
            <Pressable accessibilityRole="button" onPress={() => void loadVideos()} style={styles.retryButton}>
              <Text style={styles.retryButtonText}>Try again</Text>
            </Pressable>
          </View>
        ) : !assets.length ? (
          <View style={styles.pickerEmpty}>
            <Text selectable style={styles.pickerEmptyText}>No videos were found on this device.</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.assetList} showsVerticalScrollIndicator={false}>
            {assets.map((asset) => {
              const order = selectionIndex(asset.id, selected);
              return (
                <Pressable
                  key={asset.id}
                  accessibilityRole="checkbox"
                  accessibilityLabel={`Select ${asset.filename}`}
                  accessibilityState={{ checked: Boolean(order) }}
                  onPress={() => toggleAsset(asset)}
                  style={[styles.assetRow, order !== undefined && styles.assetRowSelected]}>
                  <View style={[styles.assetOrder, order !== undefined && styles.assetOrderSelected]}>
                    <Text style={styles.assetOrderText}>{order ?? '▶'}</Text>
                  </View>
                  <View style={styles.assetInfo}>
                    <Text numberOfLines={1} style={styles.assetName}>{asset.filename || 'Untitled video'}</Text>
                    <Text style={styles.assetMeta}>{formatDuration(asset.durationSeconds)} · {projectDate(asset.creationTime)}</Text>
                  </View>
                  {order ? <Text style={styles.selectedLabel}>#{order}</Text> : null}
                </Pressable>
              );
            })}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

export function ProjectLibraryScreen({ onRecordNew }: { onRecordNew: (projectId: string) => void }) {
  const insets = useSafeAreaInsets();
  const [projects, setProjects] = useState<VideoProject[]>(readProjects);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => writeProjects(projects), [projects]);

  const activeProject = useMemo(
    () => projects.find((project) => project.id === activeProjectId),
    [activeProjectId, projects],
  );

  const createProject = () => {
    const now = Date.now();
    const project: VideoProject = {
      id: createId('project'),
      title: `Project ${projects.length + 1}`,
      clips: [],
      createdAt: now,
      updatedAt: now,
    };
    setProjects((current) => [project, ...current]);
    setActiveProjectId(project.id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
  };

  const deleteProject = (project: VideoProject) => {
    Alert.alert(
      'Delete project?',
      `“${project.title}” and its timeline will be removed. Your original videos stay in your phone library.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete project',
          style: 'destructive',
          onPress: () => {
            setProjects((current) => current.filter((item) => item.id !== project.id));
            if (activeProjectId === project.id) setActiveProjectId(null);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
          },
        },
      ],
    );
  };

  const updateProject = (projectId: string, update: (project: VideoProject) => VideoProject) => {
    setProjects((current) => current.map((project) => project.id === projectId
      ? { ...update(project), updatedAt: Date.now() }
      : project));
  };

  const addAssets = (assets: SelectableVideo[]) => {
    if (!activeProject) return;
    const clips = assets.map((asset) => ({
      id: createId('clip'),
      uri: asset.uri,
      name: asset.filename || 'Untitled video',
      durationSeconds: asset.durationSeconds,
    }));
    updateProject(activeProject.id, (project) => ({ ...project, clips: [...project.clips, ...clips] }));
    setPickerOpen(false);
  };

  const removeClip = (clipId: string) => {
    if (!activeProject) return;
    updateProject(activeProject.id, (project) => ({
      ...project,
      clips: project.clips.filter((clip) => clip.id !== clipId),
    }));
  };

  if (activeProject) {
    return (
      <View style={[styles.root, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.editorHeader}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back to projects" onPress={() => setActiveProjectId(null)} style={styles.headerButton}>
            <Text style={styles.headerButtonText}>‹ Projects</Text>
          </Pressable>
          <Text selectable style={styles.editorLabel}>VIDEO PROJECT</Text>
        </View>
        <TextInput
          accessibilityLabel="Project name"
          maxLength={80}
          onChangeText={(title) => updateProject(activeProject.id, (project) => ({ ...project, title }))}
          selectTextOnFocus
          style={styles.projectTitleInput}
          value={activeProject.title}
        />
        <Text selectable style={styles.timelineHint}>Timeline · clips play left to right</Text>

        <ScrollView horizontal contentContainerStyle={styles.timeline} showsHorizontalScrollIndicator={false}>
          {activeProject.clips.map((clip, index) => (
            <View key={clip.id} style={styles.timelineClip}>
              <View style={styles.timelineNumber}><Text style={styles.timelineNumberText}>{index + 1}</Text></View>
              <Text numberOfLines={2} style={styles.timelineClipName}>{clip.name}</Text>
              <Text style={styles.timelineClipMeta}>{formatDuration(clip.durationSeconds)}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Remove ${clip.name} from timeline`}
                onPress={() => removeClip(clip.id)}
                style={styles.removeClipButton}>
                <Text style={styles.removeClipText}>×</Text>
              </Pressable>
            </View>
          ))}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add videos to end of timeline"
            onPress={() => setPickerOpen(true)}
            style={styles.timelineAdd}>
            <Text style={styles.timelineAddSymbol}>＋</Text>
            <Text style={styles.timelineAddText}>Add video</Text>
          </Pressable>
        </ScrollView>

        {!activeProject.clips.length ? (
          <View style={styles.emptyTimeline}>
            <Text selectable style={styles.emptyTimelineTitle}>Your timeline is ready.</Text>
            <Text selectable style={styles.emptyTimelineCopy}>Use the + tile to choose multiple videos or record a new one.</Text>
          </View>
        ) : null}

        <View style={styles.editorFooter}>
          <Text selectable style={styles.editorFooterText}>{activeProject.clips.length} {activeProject.clips.length === 1 ? 'clip' : 'clips'} in order</Text>
          <Pressable accessibilityRole="button" onPress={() => setPickerOpen(true)} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Add clips</Text>
          </Pressable>
        </View>
        <VideoPicker
          visible={pickerOpen}
          onClose={() => setPickerOpen(false)}
          onAdd={addAssets}
          onRecord={() => {
            setPickerOpen(false);
            onRecordNew(activeProject.id);
          }}
        />
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 18 }]}>
      <View style={styles.libraryHeader}>
        <View>
          <Text selectable style={styles.eyebrow}>CUECAM</Text>
          <Text selectable style={styles.libraryTitle}>Projects</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Create a project" onPress={createProject} style={styles.newProjectButton}>
          <Text style={styles.newProjectButtonText}>＋ New</Text>
        </Pressable>
      </View>
      <Text selectable style={styles.libraryCopy}>Build videos in the exact order you want to edit them.</Text>
      <ScrollView contentContainerStyle={styles.projectList} showsVerticalScrollIndicator={false}>
        {projects.map((project) => (
          <Pressable key={project.id} accessibilityRole="button" accessibilityLabel={`Open ${project.title}`} onPress={() => setActiveProjectId(project.id)} style={styles.projectCard}>
            <View style={styles.projectCardTop}>
              <View style={styles.projectIcon}><Text style={styles.projectIconText}>▶</Text></View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Delete ${project.title}`}
                hitSlop={10}
                onPress={(event) => {
                  event.stopPropagation();
                  deleteProject(project);
                }}
                style={styles.trashButton}>
                <Text style={styles.trashText}>🗑</Text>
              </Pressable>
            </View>
            <Text numberOfLines={1} style={styles.projectName}>{project.title}</Text>
            <Text style={styles.projectMeta}>{project.clips.length} {project.clips.length === 1 ? 'clip' : 'clips'} · updated {projectDate(project.updatedAt)}</Text>
          </Pressable>
        ))}
        {!projects.length ? (
          <View style={styles.emptyLibrary}>
            <Text selectable style={styles.emptyLibraryTitle}>Start a project</Text>
            <Text selectable style={styles.emptyLibraryCopy}>Choose videos in sequence, add more at the end, or record directly into the timeline.</Text>
            <Pressable accessibilityRole="button" onPress={createProject} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>Create project</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.black, paddingHorizontal: 18 },
  eyebrow: { color: COLORS.accent, fontSize: 12, fontWeight: '800', letterSpacing: 2 },
  libraryHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  libraryTitle: { color: COLORS.ink, fontSize: 38, fontWeight: '800', letterSpacing: -1.4, marginTop: 2 },
  libraryCopy: { color: COLORS.muted, fontSize: 15, lineHeight: 21, marginTop: 14, maxWidth: 310 },
  newProjectButton: { backgroundColor: COLORS.accent, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  newProjectButtonText: { color: COLORS.black, fontSize: 14, fontWeight: '800' },
  projectList: { gap: 14, paddingTop: 28, paddingBottom: 24 },
  projectCard: { backgroundColor: COLORS.panel, borderColor: '#31332B', borderRadius: 22, borderWidth: 1, minHeight: 152, padding: 16 },
  projectCardTop: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between' },
  projectIcon: { alignItems: 'center', backgroundColor: '#30332A', borderRadius: 15, height: 46, justifyContent: 'center', width: 46 },
  projectIconText: { color: COLORS.accent, fontSize: 17 },
  trashButton: { alignItems: 'center', height: 30, justifyContent: 'center', width: 30 },
  trashText: { color: COLORS.muted, fontSize: 22, lineHeight: 24 },
  projectName: { color: COLORS.ink, fontSize: 20, fontWeight: '700', marginTop: 18 },
  projectMeta: { color: COLORS.muted, fontSize: 13, marginTop: 5 },
  emptyLibrary: { alignItems: 'flex-start', backgroundColor: COLORS.panel, borderColor: '#31332B', borderRadius: 22, borderStyle: 'dashed', borderWidth: 1, gap: 10, padding: 22 },
  emptyLibraryTitle: { color: COLORS.ink, fontSize: 20, fontWeight: '700' },
  emptyLibraryCopy: { color: COLORS.muted, fontSize: 14, lineHeight: 20, marginBottom: 8 },
  primaryButton: { alignItems: 'center', backgroundColor: COLORS.accent, borderRadius: 15, justifyContent: 'center', minHeight: 46, paddingHorizontal: 17 },
  primaryButtonText: { color: COLORS.black, fontSize: 15, fontWeight: '800' },
  editorHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  headerButton: { minHeight: 40, justifyContent: 'center' },
  headerButtonText: { color: COLORS.accent, fontSize: 15, fontWeight: '700' },
  editorLabel: { color: COLORS.muted, fontSize: 11, fontWeight: '800', letterSpacing: 1.4 },
  projectTitleInput: { color: COLORS.ink, fontSize: 31, fontWeight: '800', letterSpacing: -1, marginTop: 24, padding: 0 },
  timelineHint: { color: COLORS.muted, fontSize: 13, marginTop: 10 },
  timeline: { alignItems: 'center', gap: 12, paddingVertical: 26, paddingRight: 18 },
  timelineClip: { backgroundColor: COLORS.panel, borderColor: '#3B3E34', borderRadius: 18, borderWidth: 1, height: 144, justifyContent: 'flex-end', overflow: 'hidden', padding: 13, width: 148 },
  timelineNumber: { alignItems: 'center', backgroundColor: COLORS.accent, borderRadius: 12, height: 28, justifyContent: 'center', left: 10, position: 'absolute', top: 10, width: 28 },
  timelineNumberText: { color: COLORS.black, fontSize: 13, fontWeight: '900' },
  timelineClipName: { color: COLORS.ink, fontSize: 14, fontWeight: '700', lineHeight: 18, paddingRight: 18 },
  timelineClipMeta: { color: COLORS.muted, fontSize: 12, marginTop: 5 },
  removeClipButton: { alignItems: 'center', borderColor: '#5A5D53', borderRadius: 10, borderWidth: 1, height: 24, justifyContent: 'center', position: 'absolute', right: 9, top: 10, width: 24 },
  removeClipText: { color: COLORS.ink, fontSize: 19, lineHeight: 20 },
  timelineAdd: { alignItems: 'center', backgroundColor: '#11120F', borderColor: '#62675B', borderRadius: 18, borderStyle: 'dashed', borderWidth: 1, height: 144, justifyContent: 'center', width: 118 },
  timelineAddSymbol: { color: COLORS.accent, fontSize: 30, lineHeight: 32 },
  timelineAddText: { color: COLORS.ink, fontSize: 12, fontWeight: '700', marginTop: 7 },
  emptyTimeline: { backgroundColor: COLORS.panel, borderColor: '#31332B', borderRadius: 20, borderWidth: 1, gap: 8, padding: 20 },
  emptyTimelineTitle: { color: COLORS.ink, fontSize: 18, fontWeight: '700' },
  emptyTimelineCopy: { color: COLORS.muted, fontSize: 14, lineHeight: 20 },
  editorFooter: { alignItems: 'center', flexDirection: 'row', gap: 14, justifyContent: 'space-between', marginTop: 'auto' },
  editorFooterText: { color: COLORS.muted, flex: 1, fontSize: 13 },
  pickerScreen: { backgroundColor: COLORS.black, flex: 1, paddingHorizontal: 18 },
  pickerHeader: { alignItems: 'center', flexDirection: 'row', gap: 10, justifyContent: 'space-between' },
  pickerHeading: { alignItems: 'center', flex: 1 },
  pickerTitle: { color: COLORS.ink, fontSize: 17, fontWeight: '800' },
  pickerSubtitle: { color: COLORS.muted, fontSize: 11, marginTop: 2, textAlign: 'center' },
  addButton: { alignItems: 'center', backgroundColor: COLORS.accent, borderRadius: 12, justifyContent: 'center', minHeight: 36, minWidth: 66, paddingHorizontal: 9 },
  addButtonDisabled: { backgroundColor: '#34362F' },
  addButtonText: { color: COLORS.black, fontSize: 12, fontWeight: '800' },
  recordNewButton: { alignItems: 'center', backgroundColor: '#28211D', borderColor: '#70433B', borderRadius: 18, borderWidth: 1, flexDirection: 'row', gap: 12, marginTop: 20, padding: 16 },
  recordNewSymbol: { color: COLORS.coral, fontSize: 25 },
  recordNewTitle: { color: COLORS.ink, fontSize: 16, fontWeight: '800' },
  recordNewSubtitle: { color: COLORS.muted, fontSize: 13, marginTop: 3 },
  pickerEmpty: { alignItems: 'center', flex: 1, gap: 14, justifyContent: 'center', paddingHorizontal: 28 },
  pickerEmptyText: { color: COLORS.muted, fontSize: 15, lineHeight: 21, textAlign: 'center' },
  retryButton: { borderColor: COLORS.accent, borderRadius: 13, borderWidth: 1, paddingHorizontal: 15, paddingVertical: 10 },
  retryButtonText: { color: COLORS.accent, fontWeight: '700' },
  assetList: { gap: 10, paddingVertical: 18 },
  assetRow: { alignItems: 'center', backgroundColor: COLORS.panel, borderColor: '#2F312B', borderRadius: 17, borderWidth: 1, flexDirection: 'row', gap: 12, minHeight: 74, padding: 12 },
  assetRowSelected: { borderColor: COLORS.accent, backgroundColor: '#282B1D' },
  assetOrder: { alignItems: 'center', backgroundColor: '#33362F', borderRadius: 14, height: 34, justifyContent: 'center', width: 34 },
  assetOrderSelected: { backgroundColor: COLORS.accent },
  assetOrderText: { color: COLORS.black, fontSize: 13, fontWeight: '900' },
  assetInfo: { flex: 1 },
  assetName: { color: COLORS.ink, fontSize: 14, fontWeight: '700' },
  assetMeta: { color: COLORS.muted, fontSize: 12, marginTop: 4 },
  selectedLabel: { color: COLORS.accent, fontSize: 12, fontWeight: '800' },
});
