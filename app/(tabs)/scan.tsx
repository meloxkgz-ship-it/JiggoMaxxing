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
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Eyebrow } from '@/components/Eyebrow';
import { ScreenHeader } from '@/components/ScreenHeader';
import { colors, radius, spacing, type } from '@/constants/jiggo-theme';
import { useLanguage, useT } from '@/lib/i18n';
import { persistPhoto } from '@/lib/photoStore';
import { computeScan, listScans, saveScan } from '@/lib/scan';
import en from '@/lib/i18n/en';
import de from '@/lib/i18n/de';
import { ScanResult } from '@/lib/types';

export default function ScanScreen() {
  const t = useT();
  const { lang } = useLanguage();
  const [scans, setScans] = useState<ScanResult[]>([]);
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const reload = useCallback(async () => setScans(await listScans()), []);
  useFocusEffect(useCallback(() => { reload(); }, [reload]));
  const onRefresh = async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  };

  const latest = scans[0];

  const run = async (source: 'camera' | 'library') => {
    if (busy) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    try {
      const perm =
        source === 'camera'
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          source === 'camera' ? t('scan.permCameraTitle') : t('scan.permLibraryTitle'),
          t('scan.permBody'),
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
      const rawUri = result.assets?.[0]?.uri;
      // Defensive: picker can return non-canceled without an asset URI in
      // rare device-race scenarios. Don't silently persist a fake scan.
      if (!rawUri) {
        Alert.alert(t('scan.title'), t('scan.permBody'));
        return;
      }
      // Copy out of tmp/ before iOS sweeps it — otherwise the thumbnail
      // disappears on the next cold launch.
      const uri = await persistPhoto(rawUri, 'scans');

      setBusy(true);
      await new Promise((r) => setTimeout(r, 800));
      const insights = (lang === 'de' ? de : en).scan.insights as string[];
      const computed = computeScan(uri, insights);
      const saved = await saveScan(computed);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setScans(await listScans());
      router.push({ pathname: '/scan-detail', params: { id: saved.id } } as any);
    } catch (e: any) {
      Alert.alert('Scan failed', e?.message ?? '');
    } finally {
      setBusy(false);
    }
  };

  const offer = () => {
    Alert.alert(t('scan.askSource'), t('scan.askSourceBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('scan.library'), onPress: () => run('library') },
      { text: t('scan.camera'),  onPress: () => run('camera'), style: 'default' },
    ]);
  };

  return (
    <View style={styles.root}>
      <ScreenHeader
        eyebrow={t('scan.eyebrow')}
        title={t('scan.title')}
        subtitle={t('scan.subtitle')}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.bronze} />}>
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
                <Text style={styles.scanOverlayText}>{t('scan.analysing')}</Text>
              </View>
            )}
          </View>

          <Pressable style={styles.cta} onPress={offer} disabled={busy}>
            <Ionicons name="scan" size={16} color={colors.textOnBronze} />
            <Text style={styles.ctaText}>{busy ? t('scan.analysing') : latest ? t('scan.newScan') : t('scan.firstScan')}</Text>
          </Pressable>

          <Text style={styles.privacy}>
            <Ionicons name="lock-closed" size={11} color={colors.bronze} /> {t('scan.privacyNote')}
          </Text>
        </LinearGradient>

        {latest && (
          <Pressable
            onPress={() => router.push({ pathname: '/scan-detail', params: { id: latest.id } } as any)}
            style={styles.latestCard}>
            <View style={{ flex: 1 }}>
              <Eyebrow>{t('scan.lastReading', { when: relativeTime(latest.createdAt, t) })}</Eyebrow>
              <Text style={styles.latestNote} numberOfLines={2}>{latest.insight}</Text>
            </View>
            <View style={styles.latestScoreWrap}>
              <Text style={styles.latestScore}>{latest.overall}</Text>
              <Text style={styles.latestScoreUnit}>/100</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
          </Pressable>
        )}

        {scans.length >= 2 && (
          <View style={styles.trendCard}>
            <Eyebrow>{t('scan.trend')}</Eyebrow>
            <TrendSpark scores={scans.slice(0, 8).map((s) => s.overall).reverse()} />
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Eyebrow>{t('scan.history')}</Eyebrow>
            <Text style={styles.sectionMeta}>{t('scan.historyCount', { count: scans.length })}</Text>
          </View>
          {scans.length === 0 ? (
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Ionicons name="scan-outline" size={22} color={colors.bronze} />
              </View>
              <Text style={styles.emptyText}>{t('scan.noScans')}</Text>
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

function TrendSpark({ scores }: { scores: number[] }) {
  if (scores.length === 0) return null;
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  const range = Math.max(8, max - min);
  return (
    <View style={styles.trendRow}>
      {scores.map((s, i) => {
        const h = ((s - min) / range) * 64 + 8;
        const isLast = i === scores.length - 1;
        return (
          <View key={i} style={styles.trendCol}>
            <Text style={styles.trendValue}>{s}</Text>
            <View style={[styles.trendBar, { height: h, backgroundColor: isLast ? colors.bronze : colors.surfaceMuted }]} />
          </View>
        );
      })}
    </View>
  );
}

function relativeTime(ts: number, t: (k: string, vars?: any) => string) {
  const diff = Date.now() - ts;
  if (diff < 60_000) return 'just now';
  if (diff < 3600_000) return `${Math.round(diff / 60000)} min`;
  if (diff < 86400_000) return `${Math.round(diff / 3600000)} h`;
  return `${Math.round(diff / 86400000)} d`;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  content: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, gap: spacing.lg },

  hero: {
    borderRadius: radius.xl, padding: spacing.xl, alignItems: 'center', gap: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(176,138,90,0.18)',
  },
  frame: {
    width: 220, height: 280, borderRadius: radius.lg,
    overflow: 'hidden', position: 'relative', backgroundColor: '#0B0908',
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
    alignItems: 'center', justifyContent: 'center', gap: spacing.md,
  },
  scanOverlayText: { color: colors.bronze, fontFamily: type.family.sansMedium, fontSize: 12, letterSpacing: 0.5 },

  cta: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.bronze, paddingHorizontal: spacing.xl, paddingVertical: 13, borderRadius: radius.pill,
  },
  ctaText: { color: colors.textOnBronze, fontFamily: type.family.sansSemi, fontSize: 14, letterSpacing: 0.2 },
  privacy: { color: colors.textSecondary, fontFamily: type.family.sans, fontSize: 12 },

  latestCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    padding: spacing.lg, borderRadius: radius.lg,
    backgroundColor: colors.surfaceElevated,
    borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(176,138,90,0.22)',
  },
  latestNote: { color: colors.textSecondary, fontFamily: type.family.sans, fontSize: 13, marginTop: 4, lineHeight: 19 },
  latestScoreWrap: { flexDirection: 'row', alignItems: 'flex-end' },
  latestScore: { color: colors.textPrimary, fontFamily: type.family.sansBlack, fontSize: 30, letterSpacing: type.letterSpacing.tight },
  latestScoreUnit: { color: colors.textTertiary, fontFamily: type.family.sansMedium, fontSize: 12, marginBottom: 5, marginLeft: 2 },

  section: { gap: spacing.md },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionMeta: { color: colors.textTertiary, fontFamily: type.family.sansMedium, fontSize: 11, letterSpacing: 0.3 },

  empty: { padding: spacing.lg, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, backgroundColor: colors.surface, alignItems: 'center', gap: spacing.sm },
  emptyIcon: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: 'rgba(176,138,90,0.10)',
    borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(176,138,90,0.22)',
    alignItems: 'center', justifyContent: 'center',
  },
  emptyText: { color: colors.textTertiary, fontFamily: type.family.sans, fontSize: 13, lineHeight: 19, textAlign: 'center' },

  histRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline,
  },
  histThumb: {
    width: 44, height: 44, borderRadius: 10, overflow: 'hidden',
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline,
  },
  histDate: { color: colors.textPrimary, fontFamily: type.family.sansSemi, fontSize: 13 },
  histInsight: { color: colors.textTertiary, fontFamily: type.family.sans, fontSize: 12, marginTop: 2 },
  histScore: { color: colors.bronze, fontFamily: type.family.sansBlack, fontSize: 22, letterSpacing: type.letterSpacing.tight },

  trendCard: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    gap: spacing.md,
  },
  trendRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: 96, marginTop: 6 },
  trendCol: { flex: 1, alignItems: 'center', gap: 4 },
  trendValue: { color: colors.textTertiary, fontFamily: type.family.sansMedium, fontSize: 9.5, letterSpacing: 0.3 },
  trendBar: { width: '70%', borderRadius: 3, minHeight: 4 },
});
