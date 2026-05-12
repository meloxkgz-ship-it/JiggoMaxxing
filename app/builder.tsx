import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Eyebrow } from '@/components/Eyebrow';
import { colors, radius, spacing, type } from '@/constants/jiggo-theme';
import {
  ARCHETYPES,
  Archetype,
  buildSuggestion,
  ClosetItem,
  listItems,
  OCCASIONS,
  Occasion,
  Outfit,
  saveOutfit,
} from '@/lib/closet';
import { useT } from '@/lib/i18n';

export default function BuilderScreen() {
  const t = useT();
  const params = useLocalSearchParams<{ archetype?: Archetype; occasion?: Occasion }>();
  const [items, setItems] = useState<ClosetItem[]>([]);
  const [occasion, setOccasion] = useState<Occasion>(params.occasion ?? 'weekend');
  const [archetype, setArchetype] = useState<Archetype>(params.archetype ?? 'tonal');
  const [outfit, setOutfit] = useState<Outfit | null>(null);

  useEffect(() => {
    (async () => setItems(await listItems()))();
  }, []);

  useEffect(() => {
    setOutfit(buildSuggestion(items, occasion, archetype));
  }, [items, occasion, archetype]);

  const [justSaved, setJustSaved] = useState(false);

  const reroll = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    // Shuffle items so different ones get picked
    const shuffled = [...items].sort(() => Math.random() - 0.5);
    setItems(shuffled);
  };

  const save = async () => {
    if (!outfit) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    await saveOutfit(outfit);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 1500);
  };

  return (
    <SafeAreaView edges={['top']} style={styles.root}>
      <Stack.Screen options={{ title: 'Builder' }} />
      <View style={styles.header}>
        <Pressable hitSlop={10} onPress={() => router.back()}>
          <Ionicons name="close" size={24} color={colors.textSecondary} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('style.builderTitle')}</Text>
        <Pressable hitSlop={10} onPress={reroll}>
          <Ionicons name="refresh-outline" size={20} color={colors.bronze} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.field}>
          <Eyebrow>{t('style.occasion')}</Eyebrow>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
            {OCCASIONS.map((o) => (
              <Pressable
                key={o}
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  setOccasion(o);
                }}
                style={[styles.chip, occasion === o && styles.chipActive]}>
                <Text style={[styles.chipText, occasion === o && styles.chipTextActive]}>
                  {t(`style.occasions.${o}`)}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <View style={styles.field}>
          <Eyebrow>{t('style.archetype')}</Eyebrow>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
            {ARCHETYPES.map((a) => (
              <Pressable
                key={a}
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  setArchetype(a);
                }}
                style={[styles.chip, archetype === a && styles.chipActive]}>
                <Text style={[styles.chipText, archetype === a && styles.chipTextActive]}>
                  {t(`style.archetypes.${a}`)}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {!outfit ? (
          <View style={styles.empty}>
            <Ionicons name="shirt-outline" size={40} color={colors.bronze} />
            <Text style={styles.emptyTitle}>{t('style.emptyCloset')}</Text>
            <Text style={styles.emptyBody}>{t('style.emptyClosetBody')}</Text>
            <Pressable
              style={styles.emptyCta}
              onPress={() => {
                router.replace('/closet-add' as any);
              }}>
              <Ionicons name="add" size={14} color={colors.textOnBronze} />
              <Text style={styles.emptyCtaText}>{t('style.addItem')}</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <LinearGradient
              colors={['#1A1411', '#0E0B09']}
              style={styles.outfit}>
              <View style={styles.outfitGrid}>
                {outfit.items.map((it) => (
                  <View key={it.id} style={styles.outfitItem}>
                    {it.photoUri ? (
                      <Image source={{ uri: it.photoUri }} style={StyleSheet.absoluteFill} contentFit="cover" />
                    ) : (
                      <View style={[StyleSheet.absoluteFill, { backgroundColor: it.color }]} />
                    )}
                    <View style={styles.outfitTag}>
                      <Text style={styles.outfitTagText}>{t(`style.categories.${it.category}`)}</Text>
                    </View>
                  </View>
                ))}
              </View>
              <View style={styles.scores}>
                <Score label={t('style.matchColor')} value={outfit.matchColor} />
                <Score label={t('style.matchSilhouette')} value={outfit.matchSilhouette} />
                <Score label={t('style.matchOccasion')} value={outfit.matchOccasion} />
              </View>
              <View style={styles.overallRow}>
                <Eyebrow>{t('style.matchScore')}</Eyebrow>
                <Text style={styles.overall}>{outfit.overall}<Text style={styles.overallUnit}>/100</Text></Text>
              </View>
              <Text style={styles.rationale}>{outfit.rationale}</Text>
            </LinearGradient>

            <Eyebrow>{t('style.suggestionTitle')}</Eyebrow>
            <View style={styles.itemList}>
              {outfit.items.map((it) => (
                <View key={it.id} style={styles.itemRow}>
                  <View style={[styles.itemColor, { backgroundColor: it.color }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemName}>{it.name}</Text>
                    <Text style={styles.itemMeta}>{t(`style.categories.${it.category}`)}</Text>
                  </View>
                </View>
              ))}
            </View>
            <Pressable style={[styles.saveBtn, justSaved && styles.saveBtnDone]} onPress={save}>
              <Ionicons
                name={justSaved ? 'checkmark' : 'bookmark-outline'}
                size={16}
                color={justSaved ? colors.positive : colors.textOnBronze}
              />
              <Text style={[styles.saveBtnText, justSaved && { color: colors.positive }]}>
                {justSaved ? t('style.saved') : t('style.saveOutfit')}
              </Text>
            </Pressable>
          </>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Score({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.score}>
      <Text style={styles.scoreLabel}>{label}</Text>
      <Text style={styles.scoreValue}>{value}</Text>
      <View style={styles.scoreBar}>
        <View style={[styles.scoreFill, { width: `${value}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
  },
  headerTitle: { color: colors.textPrimary, fontFamily: type.family.sansSemi, fontSize: 16 },

  content: { padding: spacing.xl, gap: spacing.xl },
  field: { gap: 8 },
  chipsRow: { gap: 8, paddingVertical: 4 },
  chip: {
    paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.bronze, borderColor: colors.bronze },
  chipText: { color: colors.textSecondary, fontFamily: type.family.sansMedium, fontSize: 11.5, letterSpacing: 0.2 },
  chipTextActive: { color: colors.textOnBronze },

  empty: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xxxl },
  emptyTitle: { color: colors.textPrimary, fontFamily: type.family.sansBold, fontSize: 18, marginTop: spacing.md },
  emptyBody: { color: colors.textSecondary, fontFamily: type.family.sans, fontSize: 13, textAlign: 'center' },
  emptyCta: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: spacing.xl, paddingVertical: 13, borderRadius: radius.pill,
    backgroundColor: colors.bronze, marginTop: spacing.lg,
  },
  emptyCtaText: { color: colors.textOnBronze, fontFamily: type.family.sansSemi, fontSize: 13 },

  outfit: {
    padding: spacing.lg,
    borderRadius: radius.xl,
    gap: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(176,138,90,0.22)',
  },
  outfitGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
  },
  outfitItem: {
    flexBasis: '47%',
    flexGrow: 1,
    aspectRatio: 3 / 4,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.surfaceMuted,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
  outfitTag: {
    position: 'absolute',
    bottom: 6, left: 6,
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(8,7,6,0.65)',
  },
  outfitTagText: { color: colors.bronze, fontFamily: type.family.sansMedium, fontSize: 9.5, letterSpacing: 0.4, textTransform: 'uppercase' },

  scores: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
  score: { flex: 1, gap: 6 },
  scoreLabel: { color: colors.textTertiary, fontFamily: type.family.sansMedium, fontSize: 9.5, letterSpacing: 0.5, textTransform: 'uppercase' },
  scoreValue: { color: colors.textPrimary, fontFamily: type.family.sansBlack, fontSize: 22, letterSpacing: type.letterSpacing.tight },
  scoreBar: { height: 3, backgroundColor: colors.hairline, borderRadius: 2, overflow: 'hidden' },
  scoreFill: { height: '100%', backgroundColor: colors.bronze },

  overallRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.hairline },
  overall: { color: colors.textPrimary, fontFamily: type.family.sansBlack, fontSize: 36, letterSpacing: type.letterSpacing.tighter },
  overallUnit: { color: colors.textTertiary, fontFamily: type.family.sansMedium, fontSize: 14 },
  rationale: { color: colors.textSecondary, fontFamily: type.family.sans, fontSize: 13, lineHeight: 20 },

  itemList: { gap: spacing.sm },
  itemRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    padding: spacing.md, borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline,
  },
  itemColor: { width: 36, height: 36, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline },
  itemName: { color: colors.textPrimary, fontFamily: type.family.sansSemi, fontSize: 13.5 },
  itemMeta: { color: colors.textTertiary, fontFamily: type.family.sans, fontSize: 11, marginTop: 2 },

  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 13,
    borderRadius: radius.pill,
    backgroundColor: colors.bronze,
    marginTop: spacing.md,
  },
  saveBtnDone: { backgroundColor: 'rgba(126,158,122,0.12)', borderWidth: StyleSheet.hairlineWidth, borderColor: colors.positive },
  saveBtnText: { color: colors.textOnBronze, fontFamily: type.family.sansSemi, fontSize: 13, letterSpacing: 0.2 },
});
