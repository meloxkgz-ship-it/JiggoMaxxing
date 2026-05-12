import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Eyebrow } from '@/components/Eyebrow';
import { colors, radius, spacing, type } from '@/constants/jiggo-theme';
import { deleteScan, listScans } from '@/lib/scan';
import { ScanResult } from '@/lib/types';

export default function ScanDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [scan, setScan] = useState<ScanResult | null>(null);

  useEffect(() => {
    (async () => {
      const all = await listScans();
      setScan(all.find((s) => s.id === id) ?? null);
    })();
  }, [id]);

  if (!scan) {
    return (
      <SafeAreaView edges={['top']} style={styles.root}>
        <Stack.Screen options={{ title: 'Scan' }} />
        <Text style={styles.miss}>Scan not found.</Text>
      </SafeAreaView>
    );
  }

  const confirmDelete = () => {
    Alert.alert('Delete scan?', 'Removed locally — cannot be recovered.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteScan(scan.id);
          router.back();
        },
      },
    ]);
  };

  return (
    <SafeAreaView edges={['top']} style={styles.root}>
      <Stack.Screen options={{ title: 'Scan' }} />
      <View style={styles.header}>
        <Pressable hitSlop={10} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Reading</Text>
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
          </View>
          <Text style={styles.scoreLabel}>Overall edge index</Text>
        </LinearGradient>

        <View style={styles.insight}>
          <Eyebrow>Coach note</Eyebrow>
          <Text style={styles.insightText}>{scan.insight}</Text>
        </View>

        <View style={styles.section}>
          <Eyebrow>Dimensions</Eyebrow>
          <View style={styles.grid}>
            {Object.entries(scan.dimensions).map(([name, score]) => (
              <View key={name} style={styles.dim}>
                <Text style={styles.dimName}>{name}</Text>
                <Text style={styles.dimScore}>{score}</Text>
                <View style={styles.dimBar}>
                  <View style={[styles.dimBarFill, { width: `${score}%` }]} />
                </View>
              </View>
            ))}
          </View>
        </View>

        <Text style={styles.meta}>
          {new Date(scan.createdAt).toLocaleString()} · processed locally
        </Text>

        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  headerTitle: { color: colors.textPrimary, fontFamily: type.family.sansSemi, fontSize: 16 },
  content: { padding: spacing.xl, gap: spacing.lg },
  miss: { color: colors.textSecondary, padding: spacing.xl, fontFamily: type.family.sans },

  hero: {
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(176,138,90,0.18)',
  },
  frame: {
    width: 200, height: 250,
    borderRadius: radius.lg,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#0B0908',
    alignItems: 'center', justifyContent: 'center',
  },
  corner: { position: 'absolute', width: 22, height: 22, borderColor: colors.bronze },
  cornerTL: { top: 8, left: 8, borderLeftWidth: 2, borderTopWidth: 2 },
  cornerTR: { top: 8, right: 8, borderRightWidth: 2, borderTopWidth: 2 },
  cornerBL: { bottom: 8, left: 8, borderLeftWidth: 2, borderBottomWidth: 2 },
  cornerBR: { bottom: 8, right: 8, borderRightWidth: 2, borderBottomWidth: 2 },

  scoreRow: { flexDirection: 'row', alignItems: 'flex-end' },
  score: { color: colors.textPrimary, fontFamily: type.family.sansBlack, fontSize: 88, lineHeight: 88, letterSpacing: type.letterSpacing.tighter },
  scoreUnit: { color: colors.textTertiary, fontFamily: type.family.sansMedium, fontSize: 16, marginBottom: 14, marginLeft: 4 },
  scoreLabel: { color: colors.textSecondary, fontFamily: type.family.sansMedium, fontSize: 12, letterSpacing: 0.6, textTransform: 'uppercase' },

  insight: {
    padding: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.bronzeOnBlack,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(176,138,90,0.25)',
    gap: 6,
  },
  insightText: { color: colors.textPrimary, fontFamily: type.family.sans, fontSize: 14, lineHeight: 21 },

  section: { gap: spacing.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  dim: {
    flexBasis: '47%', flexGrow: 1,
    padding: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    gap: 8,
  },
  dimName: { color: colors.textTertiary, fontFamily: type.family.sansMedium, fontSize: 11, letterSpacing: 0.4, textTransform: 'uppercase' },
  dimScore: { color: colors.textPrimary, fontFamily: type.family.sansBlack, fontSize: 28, letterSpacing: type.letterSpacing.tight },
  dimBar: { height: 3, borderRadius: 2, backgroundColor: colors.hairline, overflow: 'hidden' },
  dimBarFill: { height: '100%', backgroundColor: colors.bronze },

  meta: { color: colors.textTertiary, fontFamily: type.family.sans, fontSize: 11, textAlign: 'center', marginTop: spacing.sm },
});
