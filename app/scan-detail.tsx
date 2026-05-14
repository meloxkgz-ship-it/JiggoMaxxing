import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Eyebrow } from '@/components/Eyebrow';
import { colors, radius, spacing, type } from '@/constants/jiggo-theme';
import { useT } from '@/lib/i18n';
import { deleteScan, listScans } from '@/lib/scan';
import { ScanResult } from '@/lib/types';

const MICRO_FOR: Record<string, { low: string; mid: string }> = {
  'Skin clarity':  { low: 'scan.micro.skinLow',     mid: 'scan.micro.skinMid' },
  'Recovery':      { low: 'scan.micro.recoveryLow', mid: 'scan.micro.recoveryMid' },
  'Grooming edge': { low: 'scan.micro.groomLow',    mid: 'scan.micro.groomMid' },
  'Posture line':  { low: 'scan.micro.postureLow',  mid: 'scan.micro.postureMid' },
  'Hair edge':     { low: 'scan.micro.hairLow',     mid: 'scan.micro.hairMid' },
};

export default function ScanDetailScreen() {
  const t = useT();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [scan, setScan] = useState<ScanResult | null>(null);
  const [allScans, setAllScans] = useState<ScanResult[]>([]);

  // Single fetch — fold both reads into one effect so hook order is stable
  // across renders and the early-return guard below doesn't trip
  // "Rendered more hooks than during the previous render".
  useEffect(() => {
    (async () => {
      const all = await listScans();
      setAllScans(all);
      setScan(all.find((s) => s.id === id) ?? null);
    })();
  }, [id]);

  if (!scan) {
    return (
      <SafeAreaView edges={['top']} style={styles.root}>
        <Stack.Screen options={{ title: t('scan.title') }} />
        <Text style={styles.miss}>—</Text>
      </SafeAreaView>
    );
  }

  const confirmDelete = () => {
    Alert.alert(t('scan.deleteTitle'), t('scan.deleteBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          await deleteScan(scan.id);
          router.back();
        },
      },
    ]);
  };

  // Per-dimension trend across last 8 scans (oldest → newest)
  const dimTrend: Record<string, number[]> = {};
  const recent = [...allScans].slice(0, 8).reverse();
  for (const s of recent) {
    for (const [k, v] of Object.entries(s.dimensions)) {
      (dimTrend[k] ??= []).push(v);
    }
  }

  const actions: { name: string; score: number; text: string }[] = [];
  for (const [name, score] of Object.entries(scan.dimensions)) {
    const tip = MICRO_FOR[name];
    if (!tip) continue;
    const key = score < 70 ? tip.low : tip.mid;
    actions.push({ name, score, text: t(key) });
  }

  return (
    <SafeAreaView edges={['top']} style={styles.root}>
      <Stack.Screen options={{ title: t('scan.title') }} />
      <View style={styles.header}>
        <Pressable hitSlop={10} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('scan.title')}</Text>
        <Pressable hitSlop={10} onPress={confirmDelete}>
          <Ionicons name="trash-outline" size={20} color={colors.textTertiary} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={['#1A1411', '#0E0B09']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.hero}>
          {/* Date eyebrow — anchors the reading in time at a glance, dossier
              feel without a label proper. */}
          <Text style={styles.heroDate}>
            {new Date(scan.createdAt).toLocaleDateString(undefined, {
              weekday: 'long', month: 'long', day: 'numeric',
            }).toUpperCase()}
          </Text>
          <View style={styles.frame}>
            {scan.photoUri ? (
              <Image source={{ uri: scan.photoUri }} style={StyleSheet.absoluteFill} contentFit="cover" />
            ) : (
              <Ionicons name="person-outline" size={84} color={colors.bronze} />
            )}
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>

          <View style={styles.scoreRow}>
            <Text style={styles.score}>{scan.overall}</Text>
            <Text style={styles.scoreUnit}>/100</Text>
            {(() => {
              // allScans is sorted desc; the scan after this one in the
              // array is the one immediately before it in time.
              const idx = allScans.findIndex((s) => s.id === scan.id);
              const prev = idx >= 0 && idx + 1 < allScans.length ? allScans[idx + 1] : null;
              if (!prev || prev.overall === scan.overall) return null;
              const delta = scan.overall - prev.overall;
              const up = delta > 0;
              return (
                <View
                  style={[
                    styles.scoreDelta,
                    up ? styles.scoreDeltaUp : styles.scoreDeltaDown,
                  ]}>
                  <Ionicons
                    name={up ? 'arrow-up' : 'arrow-down'}
                    size={12}
                    color={up ? colors.positive : colors.danger}
                  />
                  <Text style={[
                    styles.scoreDeltaText,
                    { color: up ? colors.positive : colors.danger },
                  ]}>{Math.abs(delta)}</Text>
                </View>
              );
            })()}
          </View>
          <Text style={styles.scoreLabel}>{t('scan.overall')}</Text>
        </LinearGradient>

        <View style={styles.insight}>
          <Eyebrow>{t('scan.coachNote')}</Eyebrow>
          <Text style={styles.insightText}>{scan.insight}</Text>
        </View>

        <View style={styles.section}>
          <Eyebrow>{t('scan.actions')}</Eyebrow>
          <View style={styles.actionList}>
            {actions.map((a) => (
              <View key={a.name} style={styles.actionRow}>
                <View style={styles.actionScore}>
                  <Text style={styles.actionScoreText}>{a.score}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.actionName}>{t(`scan.dimensions.${a.name}`)}</Text>
                  <Text style={styles.actionBody}>{a.text}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Eyebrow>{t('scan.history')}</Eyebrow>
          <View style={styles.grid}>
            {Object.entries(scan.dimensions).map(([name, score]) => {
              const series = dimTrend[name] ?? [score];
              const min = Math.min(...series);
              const max = Math.max(...series);
              const range = Math.max(8, max - min);
              return (
                <View key={name} style={styles.dim}>
                  <Text style={styles.dimName}>{t(`scan.dimensions.${name}`)}</Text>
                  <Text style={styles.dimScore}>{score}</Text>
                  <View style={styles.dimBar}>
                    <View style={[styles.dimBarFill, { width: `${score}%` }]} />
                  </View>
                  {series.length > 1 && (
                    <View style={styles.dimSpark}>
                      {series.map((v, i) => {
                        const h = ((v - min) / range) * 22 + 4;
                        const isLast = i === series.length - 1;
                        return (
                          <View
                            key={i}
                            style={[
                              styles.dimSparkBar,
                              { height: h, backgroundColor: isLast ? colors.bronze : colors.surfaceMuted },
                            ]}
                          />
                        );
                      })}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </View>

        <Text style={styles.meta}>
          {new Date(scan.createdAt).toLocaleString()} · {t('scan.privacyNote')}
        </Text>

        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
  },
  headerTitle: { color: colors.textPrimary, fontFamily: type.family.sansSemi, fontSize: 16 },
  content: { padding: spacing.xl, gap: spacing.lg },
  miss: { color: colors.textSecondary, padding: spacing.xl, fontFamily: type.family.sans },

  hero: {
    borderRadius: radius.xl, padding: spacing.xl, alignItems: 'center', gap: spacing.md,
    borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(176,138,90,0.18)',
  },
  frame: {
    width: 200, height: 250, borderRadius: radius.lg, overflow: 'hidden',
    position: 'relative', backgroundColor: '#0B0908',
    alignItems: 'center', justifyContent: 'center',
  },
  corner: { position: 'absolute', width: 22, height: 22, borderColor: colors.bronze },
  cornerTL: { top: 8, left: 8, borderLeftWidth: 2, borderTopWidth: 2 },
  cornerTR: { top: 8, right: 8, borderRightWidth: 2, borderTopWidth: 2 },
  cornerBL: { bottom: 8, left: 8, borderLeftWidth: 2, borderBottomWidth: 2 },
  cornerBR: { bottom: 8, right: 8, borderRightWidth: 2, borderBottomWidth: 2 },

  heroDate: {
    color: colors.bronze,
    fontFamily: type.family.sansBlack,
    fontSize: 10.5,
    letterSpacing: 0.7,
    marginBottom: 4,
  },
  scoreRow: { flexDirection: 'row', alignItems: 'flex-end' },
  scoreDelta: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    marginLeft: 'auto',
    marginBottom: 18,
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  scoreDeltaUp:   { borderColor: 'rgba(126,158,122,0.40)', backgroundColor: 'rgba(126,158,122,0.10)' },
  scoreDeltaDown: { borderColor: 'rgba(176,88,79,0.40)', backgroundColor: 'rgba(176,88,79,0.10)' },
  scoreDeltaText: { fontFamily: type.family.sansBlack, fontSize: 11, letterSpacing: 0.4 },
  score: { color: colors.textPrimary, fontFamily: type.family.sansBlack, fontSize: 88, lineHeight: 88, letterSpacing: type.letterSpacing.tighter },
  scoreUnit: { color: colors.textTertiary, fontFamily: type.family.sansMedium, fontSize: 16, marginBottom: 14, marginLeft: 4 },
  scoreLabel: { color: colors.textSecondary, fontFamily: type.family.sansMedium, fontSize: 12, letterSpacing: 0.6, textTransform: 'uppercase' },

  insight: {
    padding: spacing.lg, borderRadius: radius.md,
    backgroundColor: colors.bronzeOnBlack,
    borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(176,138,90,0.25)',
    gap: 6,
  },
  insightText: { color: colors.textPrimary, fontFamily: type.family.sans, fontSize: 14, lineHeight: 21 },

  section: { gap: spacing.md },
  actionList: { gap: spacing.sm },
  actionRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md,
    padding: spacing.md, borderRadius: radius.md,
    backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline,
  },
  actionScore: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: colors.bronzeOnBlack,
    alignItems: 'center', justifyContent: 'center',
  },
  actionScoreText: { color: colors.bronze, fontFamily: type.family.sansBlack, fontSize: 14 },
  actionName: { color: colors.textPrimary, fontFamily: type.family.sansSemi, fontSize: 13 },
  actionBody: { color: colors.textSecondary, fontFamily: type.family.sans, fontSize: 13, lineHeight: 19, marginTop: 2 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  dim: {
    flexBasis: '47%', flexGrow: 1,
    padding: spacing.lg, borderRadius: radius.md,
    backgroundColor: colors.surfaceElevated,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline,
    gap: 8,
  },
  dimName: { color: colors.textTertiary, fontFamily: type.family.sansMedium, fontSize: 11, letterSpacing: 0.4, textTransform: 'uppercase' },
  dimScore: { color: colors.textPrimary, fontFamily: type.family.sansBlack, fontSize: 28, letterSpacing: type.letterSpacing.tight },
  dimBar: { height: 3, borderRadius: 2, backgroundColor: colors.hairline, overflow: 'hidden' },
  dimBarFill: { height: '100%', backgroundColor: colors.bronze },
  dimSpark: { flexDirection: 'row', alignItems: 'flex-end', gap: 3, marginTop: 6, height: 28 },
  dimSparkBar: { flex: 1, borderRadius: 2, minHeight: 2 },

  meta: { color: colors.textTertiary, fontFamily: type.family.sans, fontSize: 11, textAlign: 'center', marginTop: spacing.sm },
});
