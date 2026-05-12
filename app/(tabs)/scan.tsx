import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Eyebrow } from '@/components/Eyebrow';
import { ScreenHeader } from '@/components/ScreenHeader';
import { colors, radius, spacing, type } from '@/constants/jiggo-theme';
import { computeScan, listScans, saveScan } from '@/lib/scan';
import { ScanResult } from '@/lib/types';

export default function ScanScreen() {
  const [scans, setScans] = useState<ScanResult[]>([]);
  const [busy, setBusy] = useState(false);

  useFocusEffect(useCallback(() => {
    (async () => setScans(await listScans()))();
  }, []));

  const latest = scans[0];

  const run = async (source: 'camera' | 'library') => {
    if (busy) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    try {
      let perm =
        source === 'camera'
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          source === 'camera' ? 'Camera access needed' : 'Photo access needed',
          'JIGGO MAXXING processes scans locally — your photo never leaves the device. You can enable access in Settings.',
        );
        return;
      }
      const opts: ImagePicker.ImagePickerOptions = {
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.85,
      };
      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync(opts)
          : await ImagePicker.launchImageLibraryAsync(opts);
      if (result.canceled) return;
      const uri = result.assets?.[0]?.uri;

      setBusy(true);
      // Pause briefly so the loading state is felt — feels deliberate.
      await new Promise((r) => setTimeout(r, 800));
      const computed = computeScan(uri);
      const saved = await saveScan(computed);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setScans(await listScans());
      router.push({ pathname: '/scan-detail', params: { id: saved.id } } as any);
    } catch (e: any) {
      Alert.alert('Scan failed', e?.message ?? 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  const offer = () => {
    Alert.alert('New scan', 'Use camera or pick from library?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Library', onPress: () => run('library') },
      { text: 'Camera', onPress: () => run('camera'), style: 'default' },
    ]);
  };

  return (
    <View style={styles.root}>
      <ScreenHeader
        eyebrow="Private · on‑device"
        title="Max Scan"
        subtitle="Photo never uploaded. No ratings. Trend signals across six private dimensions."
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={['#1A1411', '#0E0B09']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.hero}>
          <View style={styles.frame}>
            {latest?.photoUri ? (
              <Image source={{ uri: latest.photoUri }} style={StyleSheet.absoluteFill} contentFit="cover" />
            ) : (
              <View style={styles.framePortrait}>
                <Ionicons name="person-outline" size={84} color={colors.bronze} />
              </View>
            )}
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
            {busy && (
              <View style={styles.scanOverlay}>
                <ActivityIndicator color={colors.bronze} size="large" />
                <Text style={styles.scanOverlayText}>Reading dimensions…</Text>
              </View>
            )}
          </View>

          <View style={styles.ctaRow}>
            <Pressable style={styles.cta} onPress={offer} disabled={busy}>
              <Ionicons name="scan" size={16} color={colors.textOnBronze} />
              <Text style={styles.ctaText}>{busy ? 'Analysing…' : latest ? 'New scan' : 'First scan'}</Text>
            </Pressable>
          </View>

          <Text style={styles.privacy}>
            <Ionicons name="lock-closed" size={11} color={colors.bronze} /> Processed locally · never leaves device
          </Text>
        </LinearGradient>

        {latest && (
          <Pressable
            onPress={() => router.push({ pathname: '/scan-detail', params: { id: latest.id } } as any)}
            style={styles.latestCard}>
            <View style={{ flex: 1 }}>
              <Eyebrow>Last reading · {relativeTime(latest.createdAt)}</Eyebrow>
              <Text style={styles.latestNote} numberOfLines={2}>{latest.insight}</Text>
            </View>
            <View style={styles.latestScoreWrap}>
              <Text style={styles.latestScore}>{latest.overall}</Text>
              <Text style={styles.latestScoreUnit}>/100</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
          </Pressable>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Eyebrow>History</Eyebrow>
            <Text style={styles.sectionMeta}>{scans.length} scans</Text>
          </View>
          {scans.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No scans yet. Take your first to set a private baseline.</Text>
            </View>
          ) : (
            <View style={{ gap: spacing.sm }}>
              {scans.slice(0, 10).map((s) => (
                <Pressable
                  key={s.id}
                  onPress={() => router.push({ pathname: '/scan-detail', params: { id: s.id } } as any)}
                  style={styles.histRow}>
                  <View style={styles.histThumb}>
                    {s.photoUri ? (
                      <Image source={{ uri: s.photoUri }} style={StyleSheet.absoluteFill} contentFit="cover" />
                    ) : (
                      <Ionicons name="person-outline" size={22} color={colors.bronze} />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.histDate}>{new Date(s.createdAt).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</Text>
                    <Text style={styles.histInsight} numberOfLines={1}>{s.insight}</Text>
                  </View>
                  <Text style={styles.histScore}>{s.overall}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
}

function relativeTime(ts: number) {
  const diff = Date.now() - ts;
  if (diff < 60_000) return 'just now';
  if (diff < 3600_000) return `${Math.round(diff / 60000)} min ago`;
  if (diff < 86400_000) return `${Math.round(diff / 3600000)} h ago`;
  return `${Math.round(diff / 86400000)} d ago`;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  content: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, gap: spacing.lg },

  hero: {
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(176,138,90,0.18)',
  },
  frame: {
    width: 220,
    height: 280,
    borderRadius: radius.lg,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#0B0908',
  },
  framePortrait: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  corner: { position: 'absolute', width: 22, height: 22, borderColor: colors.bronze },
  cornerTL: { top: 8, left: 8, borderLeftWidth: 2, borderTopWidth: 2 },
  cornerTR: { top: 8, right: 8, borderRightWidth: 2, borderTopWidth: 2 },
  cornerBL: { bottom: 8, left: 8, borderLeftWidth: 2, borderBottomWidth: 2 },
  cornerBR: { bottom: 8, right: 8, borderRightWidth: 2, borderBottomWidth: 2 },
  scanOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(8,7,6,0.78)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  scanOverlayText: { color: colors.bronze, fontFamily: type.family.sansMedium, fontSize: 12, letterSpacing: 0.5 },

  ctaRow: { flexDirection: 'row', gap: spacing.md },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.bronze,
    paddingHorizontal: spacing.xl,
    paddingVertical: 13,
    borderRadius: radius.pill,
  },
  ctaText: { color: colors.textOnBronze, fontFamily: type.family.sansSemi, fontSize: 14, letterSpacing: 0.2 },
  privacy: { color: colors.textSecondary, fontFamily: type.family.sans, fontSize: 12 },

  latestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(176,138,90,0.22)',
  },
  latestNote: { color: colors.textSecondary, fontFamily: type.family.sans, fontSize: 13, marginTop: 4, lineHeight: 19 },
  latestScoreWrap: { flexDirection: 'row', alignItems: 'flex-end' },
  latestScore: { color: colors.textPrimary, fontFamily: type.family.sansBlack, fontSize: 30, letterSpacing: type.letterSpacing.tight },
  latestScoreUnit: { color: colors.textTertiary, fontFamily: type.family.sansMedium, fontSize: 12, marginBottom: 5, marginLeft: 2 },

  section: { gap: spacing.md },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionMeta: { color: colors.textTertiary, fontFamily: type.family.sansMedium, fontSize: 11, letterSpacing: 0.3 },

  empty: { padding: spacing.lg, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, backgroundColor: colors.surface },
  emptyText: { color: colors.textTertiary, fontFamily: type.family.sans, fontSize: 13, lineHeight: 19 },

  histRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
  histThumb: {
    width: 44, height: 44, borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
  histDate: { color: colors.textPrimary, fontFamily: type.family.sansSemi, fontSize: 13 },
  histInsight: { color: colors.textTertiary, fontFamily: type.family.sans, fontSize: 12, marginTop: 2 },
  histScore: { color: colors.bronze, fontFamily: type.family.sansBlack, fontSize: 22, letterSpacing: type.letterSpacing.tight },
});
