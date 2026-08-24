import { Alert, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PRIVACY_POLICY_SECTIONS, PRIVACY_POLICY_URL } from '@/services/privacy-policy';

type PrivacyPolicyModalProps = {
  visible: boolean;
  onClose: () => void;
};

export function PrivacyPolicyModal({ visible, onClose }: PrivacyPolicyModalProps) {
  const insets = useSafeAreaInsets();

  const openPublishedPolicy = async () => {
    try {
      await Linking.openURL(PRIVACY_POLICY_URL);
    } catch {
      Alert.alert('Could not open the privacy policy', PRIVACY_POLICY_URL);
    }
  };

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="overFullScreen"
      statusBarTranslucent
      transparent
      visible={visible}>
      <View style={styles.root}>
        <Pressable accessibilityLabel="Close privacy policy" onPress={onClose} style={styles.scrim} />
        <View
          accessibilityViewIsModal
          style={[
            styles.panel,
            {
              marginTop: insets.top + 24,
              marginBottom: insets.bottom + 12,
              marginLeft: insets.left + 12,
              marginRight: insets.right + 12,
            },
          ]}>
          <View style={styles.header}>
            <View style={styles.titleWrap}>
              <Text style={styles.eyebrow}>CUECAM</Text>
              <Text accessibilityRole="header" style={styles.title}>Privacy</Text>
              <Text style={styles.effectiveDate}>Effective August 13, 2026</Text>
            </View>
            <Pressable
              accessibilityLabel="Close privacy policy"
              accessibilityRole="button"
              onPress={onClose}
              style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}>
              <Text style={styles.closeText}>×</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            {PRIVACY_POLICY_SECTIONS.map((section) => (
              <View key={section.heading} style={styles.section}>
                <Text style={styles.heading}>{section.heading}</Text>
                <Text style={styles.body}>{section.body}</Text>
              </View>
            ))}
            <Text style={styles.body}>
              Questions can be submitted through the CueCam GitHub repository.
            </Text>
            <Pressable
              accessibilityLabel="Open published privacy policy"
              accessibilityRole="link"
              onPress={() => void openPublishedPolicy()}
              style={({ pressed }) => [styles.linkButton, pressed && styles.pressed]}>
              <Text style={styles.linkText}>Open published policy</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  scrim: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(0,0,0,0.68)' },
  panel: { flex: 1, maxWidth: 620, width: '100%', alignSelf: 'center', borderRadius: 30, borderWidth: 1, borderColor: '#34362E', backgroundColor: '#181916', overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', padding: 22, paddingBottom: 14 },
  titleWrap: { gap: 3 },
  eyebrow: { color: '#E8FF5B', fontSize: 11, fontWeight: '900', letterSpacing: 2 },
  title: { color: '#F8F8F2', fontSize: 30, fontWeight: '800', letterSpacing: -0.8 },
  effectiveDate: { color: '#A5A6A0', fontSize: 12, fontWeight: '600' },
  closeButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#242520', alignItems: 'center', justifyContent: 'center' },
  closeText: { color: '#F8F8F2', fontSize: 28, lineHeight: 30, fontWeight: '300' },
  content: { paddingHorizontal: 22, paddingBottom: 26, gap: 20 },
  section: { gap: 7 },
  heading: { color: '#F8F8F2', fontSize: 18, fontWeight: '800' },
  body: { color: '#D0D1CB', fontSize: 15, lineHeight: 23 },
  linkButton: { minHeight: 52, borderRadius: 16, backgroundColor: '#E8FF5B', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  linkText: { color: '#090A08', fontSize: 15, fontWeight: '900' },
  pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
});
