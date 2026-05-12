import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
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
import {
  ARCHETYPES,
  Archetype,
  ClosetItem,
  deleteItem,
  deleteSavedOutfit,
  expandSavedOutfit,
  listItems,
  listSavedOutfits,
  Look,
  LOOKS,
  lookTone,
  Outfit,
  SavedOutfit,
  seedStarterCloset,
  Tone,
} from '@/lib/closet';
import { useT } from '@/lib/i18n';

const FILTERS: ('all' | Archetype)[] = ['all', ...ARCHETYPES];

export default function StyleScreen() {
  const t = useT();
  const [items, setItems] = useState<ClosetItem[]>([]);
  const [filter, setFilter] = useState<'all' | Archetype>('all');
  const [toneFilter, setToneFilter] = useState<'all' | Tone>('all');
  const [tab, setTab] = useState<'closet' | 'looks' | 'saved'>('closet');
  const [saved, setSaved] = useState<{ saved: SavedOutfit; outfit: Outfit | null }[]>([]);

  useFocusEffect(useCallback(() => {
    (async () => {
      setItems(await listItems());
      const list = await listSavedOutfits();
      const enriched = await Promise.all(
        list.map(async (s) => ({ saved: s, outfit: await expandSavedOutfit(s) })),
      );
      setSaved(enriched);
    })();
  }, []));

  const looksFiltered = LOOKS
    .filter((l) => filter === 'all' || l.archetype === filter)
    .filter((l) => toneFilter === 'all' || lookTone(l) === toneFilter);

  const onDelete = (it: ClosetItem) => {
    Alert.alert(t('common.delete'), it.name, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'), style: 'destructive',
        onPress: async () => {
          await deleteItem(it.id);
          setItems(await listItems());
        },
      },
    ]);
  };

  return (
    <View style={styles.root}>
      <ScreenHeader
        eyebrow="Style Aura"
        title={t('style.title')}
        subtitle={t('style.subtitle')}
      />
      <View style={styles.tabsRow}>
        <Pressable onPress={() => setTab('closet')} style={[styles.tabBtn, tab === 'closet' && styles.tabBtnActive]}>
          <Text style={[styles.tabBtnText, tab === 'closet' && styles.tabBtnTextActive]}>{t('style.closet')} · {items.length}</Text>
        </Pressable>
        <Pressable onPress={() => setTab('looks')} style={[styles.tabBtn, tab === 'looks' && styles.tabBtnActive]}>
          <Text style={[styles.tabBtnText, tab === 'looks' && styles.tabBtnTextActive]}>{t('style.looks')}</Text>
        </Pressable>
        <Pressable onPress={() => setTab('saved')} style={[styles.tabBtn, tab === 'saved' && styles.tabBtnActive]}>
          <Text style={[styles.tabBtnText, tab === 'saved' && styles.tabBtnTextActive]}>{t('style.savedTab')} · {saved.length}</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {tab === 'closet' && (
          <ClosetView items={items} onDelete={onDelete} onSeed={async () => setItems(await listItems())} />
        )}
        {tab === 'looks' && (
          <>
            <TodaysPickCard />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
              {FILTERS.map((f) => (
                <Pressable
                  key={f}
                  onPress={() => setFilter(f)}
                  style={[styles.chip, filter === f && styles.chipActive]}>
                  <Text style={[styles.chipText, filter === f && styles.chipTextActive]}>
                    {f === 'all' ? t('common.seeAll') : t(`style.archetypes.${f}`)}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
              {(['all', 'warm', 'cool', 'neutral'] as const).map((tn) => (
                <Pressable
                  key={tn}
                  onPress={() => setToneFilter(tn)}
                  style={[styles.toneChip, toneFilter === tn && styles.toneChipActive]}>
                  <Text style={[styles.chipText, toneFilter === tn && styles.chipTextActive]}>
                    {t(`style.tones.${tn}` as any)}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            <View style={styles.looksGrid}>
              {looksFiltered.map((l) => <LookCard key={l.id} look={l} t={t} />)}
            </View>
          </>
        )}
        {tab === 'saved' && (
          <SavedView
            saved={saved}
            onOpen={(s) =>
              router.push({
                pathname: '/builder',
                params: { archetype: s.archetype, occasion: s.occasion },
              } as any)
            }
            onDelete={async (s) => {
              await deleteSavedOutfit(s.id);
              const list = await listSavedOutfits();
              const enriched = await Promise.all(list.map(async (x) => ({ saved: x, outfit: await expandSavedOutfit(x) })));
              setSaved(enriched);
            }}
          />
        )}
        <View style={{ height: 140 }} />
      </ScrollView>

      <View style={styles.fab}>
        <Pressable style={[styles.fabBtn, styles.fabSecondary]} onPress={() => router.push('/builder' as any)}>
          <Ionicons name="sparkles-outline" size={16} color={colors.bronze} />
          <Text style={styles.fabSecondaryText}>{t('style.builder')}</Text>
        </Pressable>
        <Pressable style={styles.fabBtn} onPress={() => router.push('/closet-add' as any)}>
          <Ionicons name="add" size={18} color={colors.textOnBronze} />
          <Text style={styles.fabPrimaryText}>{t('style.addItem')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function ClosetView({ items, onDelete, onSeed }: { items: ClosetItem[]; onDelete: (i: ClosetItem) => void; onSeed: () => Promise<void> }) {
  const t = useT();

  if (items.length === 0) {
    return (
      <View style={styles.empty}>
        <Ionicons name="shirt-outline" size={36} color={colors.bronze} />
        <Text style={styles.emptyTitle}>{t('style.seedTitle')}</Text>
        <Text style={styles.emptyBody}>{t('style.seedBody')}</Text>
        <Pressable
          style={styles.seedCta}
          onPress={async () => {
            const n = await seedStarterCloset();
            await onSeed();
            Alert.alert(t('style.seedDone', { n }));
          }}>
          <Ionicons name="sparkles" size={14} color={colors.textOnBronze} />
          <Text style={styles.seedCtaText}>{t('style.seedCta')}</Text>
        </Pressable>
      </View>
    );
  }
  return (
    <View style={styles.grid}>
      {items.map((it) => (
        <Pressable
          key={it.id}
          style={styles.itemCard}
          onPress={() => router.push({ pathname: '/closet-add', params: { id: it.id } } as any)}
          onLongPress={() => onDelete(it)}>
          <View style={styles.itemImage}>
            {it.photoUri ? (
              <Image source={{ uri: it.photoUri }} style={StyleSheet.absoluteFill} contentFit="cover" />
            ) : (
              <View style={[StyleSheet.absoluteFill, { backgroundColor: it.color }]} />
            )}
            <View style={styles.itemCatTag}>
              <Text style={styles.itemCatText}>{t(`style.categories.${it.category}`)}</Text>
            </View>
          </View>
          <Text style={styles.itemLabel} numberOfLines={1}>{it.name}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function SavedView({
  saved,
  onOpen,
  onDelete,
}: {
  saved: { saved: SavedOutfit; outfit: Outfit | null }[];
  onOpen: (s: SavedOutfit) => void;
  onDelete: (s: SavedOutfit) => void;
}) {
  const t = useT();
  if (saved.length === 0) {
    return (
      <View style={styles.empty}>
        <Ionicons name="bookmark-outline" size={36} color={colors.bronze} />
        <Text style={styles.emptyTitle}>{t('style.emptySaved')}</Text>
        <Text style={styles.emptyBody}>{t('style.emptySavedBody')}</Text>
      </View>
    );
  }
  return (
    <View style={{ paddingHorizontal: spacing.xl, gap: spacing.md }}>
      {saved.map(({ saved: s, outfit }) => (
        <Pressable
          key={s.id}
          style={styles.savedCard}
          onPress={() => onOpen(s)}
          onLongPress={() => onDelete(s)}>
          <View style={styles.savedPaletteRow}>
            {(outfit?.items.map((i) => i.color) ?? []).slice(0, 5).map((c, i) => (
              <View key={i} style={[styles.savedSwatch, { backgroundColor: c, marginLeft: i === 0 ? 0 : -8 }]} />
            ))}
          </View>
          <View style={{ flex: 1 }}>
            {s.name ? <Text style={styles.savedName}>{s.name}</Text> : null}
            <Text style={styles.savedTitle}>
              {t(`style.archetypes.${s.archetype}`)} · {t(`style.occasions.${s.occasion}`)}
            </Text>
            <Text style={styles.savedMeta}>
              {new Date(s.savedAt).toLocaleDateString()} · {outfit?.items.length ?? '—'}
            </Text>
          </View>
          <Text style={styles.savedScore}>{outfit?.overall ?? s.overall}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function TodaysPickCard() {
  const t = useT();
  // Deterministic per day-of-year so the pick is consistent through the day.
  const day = Math.floor((Date.now() / 86400000));
  const look = LOOKS[day % LOOKS.length];

  return (
    <Pressable
      style={styles.todaysPick}
      onPress={() => router.push({ pathname: '/look-detail', params: { id: look.id } } as any)}>
      <View style={styles.todaysPickPaletteBg}>
        {look.palette.map((c, i) => (
          <View key={i} style={[styles.todaysPickStripe, { backgroundColor: c, flex: 1 }]} />
        ))}
      </View>
      <View style={styles.todaysPickOverlay}>
        <View style={styles.todaysPickBadge}>
          <Ionicons name="star" size={11} color={colors.bronze} />
          <Text style={styles.todaysPickBadgeText}>{t('style.todayPick')}</Text>
        </View>
        <Text style={styles.todaysPickTitle}>{look.title}</Text>
        <Text style={styles.todaysPickMeta}>{t(`style.archetypes.${look.archetype}`)} · {t(`style.occasions.${look.occasion}`)}</Text>
      </View>
    </Pressable>
  );
}

function LookCard({ look, t }: { look: Look; t: (k: string, vars?: any) => string }) {
  return (
    <Pressable
      style={styles.lookCard}
      onPress={() => router.push({ pathname: '/look-detail', params: { id: look.id } } as any)}>
      <View style={styles.lookSwatchRow}>
        {look.palette.map((c, i) => (
          <View key={i} style={[styles.lookSwatch, { backgroundColor: c, marginLeft: i === 0 ? 0 : -10 }]} />
        ))}
      </View>
      <Text style={styles.lookTitle}>{look.title}</Text>
      <Text style={styles.lookMeta}>{t(`style.archetypes.${look.archetype}`)} · {t(`style.occasions.${look.occasion}`)}</Text>
      <Text style={styles.lookCopy}>{look.copy}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  tabsRow: {
    flexDirection: 'row', gap: spacing.sm,
    paddingHorizontal: spacing.xl, paddingBottom: spacing.md,
  },
  tabBtn: {
    paddingVertical: 8, paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline,
    backgroundColor: colors.surface,
  },
  tabBtnActive: { backgroundColor: colors.bronzeOnBlack, borderColor: colors.bronze },
  tabBtnText: { color: colors.textSecondary, fontFamily: type.family.sansMedium, fontSize: 12, letterSpacing: 0.3 },
  tabBtnTextActive: { color: colors.bronze },

  content: { paddingTop: spacing.sm },
  filterRow: { paddingHorizontal: spacing.xl, gap: spacing.sm, paddingBottom: spacing.lg },
  chip: {
    paddingHorizontal: spacing.lg, paddingVertical: 8, borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.bronze, borderColor: colors.bronze },
  toneChip: {
    paddingHorizontal: spacing.md, paddingVertical: 7, borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, backgroundColor: colors.surface,
  },
  toneChipActive: { backgroundColor: colors.bronzeOnBlack, borderColor: 'rgba(176,138,90,0.4)' },
  chipText: { color: colors.textSecondary, fontFamily: type.family.sansMedium, fontSize: 12, letterSpacing: 0.3 },
  chipTextActive: { color: colors.textOnBronze },

  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.xl, gap: spacing.md },
  itemCard: { flexBasis: '47%', flexGrow: 1, gap: 8 },
  itemImage: {
    aspectRatio: 0.78, borderRadius: radius.md, overflow: 'hidden',
    backgroundColor: colors.surfaceMuted,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline,
  },
  itemCatTag: {
    position: 'absolute', top: 8, left: 8,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill,
    backgroundColor: 'rgba(8,7,6,0.65)',
  },
  itemCatText: { color: colors.bronze, fontFamily: type.family.sansMedium, fontSize: 9.5, letterSpacing: 0.4, textTransform: 'uppercase' },
  itemLabel: { color: colors.textSecondary, fontFamily: type.family.sansMedium, fontSize: 12, paddingLeft: 2 },

  todaysPick: {
    marginHorizontal: spacing.xl,
    marginBottom: spacing.lg,
    height: 160,
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(176,138,90,0.28)',
  },
  todaysPickPaletteBg: { ...StyleSheet.absoluteFillObject, flexDirection: 'row' },
  todaysPickStripe: { height: '100%' },
  todaysPickOverlay: {
    flex: 1,
    backgroundColor: 'rgba(8,7,6,0.5)',
    padding: spacing.lg,
    justifyContent: 'flex-end',
    gap: 6,
  },
  todaysPickBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 9, paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(8,7,6,0.65)',
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  todaysPickBadgeText: { color: colors.bronze, fontFamily: type.family.sansSemi, fontSize: 10, letterSpacing: 0.5, textTransform: 'uppercase' },
  todaysPickTitle: {
    color: colors.textPrimary, fontFamily: type.family.sansBlack,
    fontSize: 22, letterSpacing: type.letterSpacing.tight,
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  todaysPickMeta: {
    color: colors.bronze, fontFamily: type.family.sansMedium,
    fontSize: 11, letterSpacing: 0.4, textTransform: 'uppercase',
  },

  looksGrid: { paddingHorizontal: spacing.xl, gap: spacing.md },
  lookCard: {
    padding: spacing.lg, borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline,
    gap: 6,
  },
  lookSwatchRow: { flexDirection: 'row', marginBottom: 4 },
  lookSwatch: { width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, borderColor: colors.surface },
  lookTitle: { color: colors.textPrimary, fontFamily: type.family.sansBold, fontSize: 15, letterSpacing: type.letterSpacing.tight },
  lookMeta: { color: colors.bronze, fontFamily: type.family.sansMedium, fontSize: 11, letterSpacing: 0.4, textTransform: 'uppercase' },
  lookCopy: { color: colors.textSecondary, fontFamily: type.family.sans, fontSize: 13, lineHeight: 20, marginTop: 4 },

  empty: { paddingHorizontal: spacing.xl, paddingTop: spacing.xxxl, alignItems: 'center', gap: 8 },
  emptyTitle: { color: colors.textPrimary, fontFamily: type.family.sansBold, fontSize: 18, marginTop: spacing.md, textAlign: 'center' },
  emptyBody: { color: colors.textSecondary, fontFamily: type.family.sans, fontSize: 13, textAlign: 'center', paddingHorizontal: spacing.lg },
  seedCta: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: spacing.xl, paddingVertical: 13, borderRadius: radius.pill,
    backgroundColor: colors.bronze, marginTop: spacing.lg,
  },
  seedCtaText: { color: colors.textOnBronze, fontFamily: type.family.sansSemi, fontSize: 13, letterSpacing: 0.2 },

  savedCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline,
  },
  savedPaletteRow: { flexDirection: 'row' },
  savedSwatch: {
    width: 26, height: 26, borderRadius: 13,
    borderWidth: 1.2, borderColor: colors.surface,
  },
  savedName: { color: colors.textPrimary, fontFamily: type.family.sansSemi, fontSize: 14, marginBottom: 2 },
  savedTitle: { color: colors.bronze, fontFamily: type.family.sansSemi, fontSize: 11, letterSpacing: 0.4, textTransform: 'uppercase' },
  savedMeta: { color: colors.textSecondary, fontFamily: type.family.sans, fontSize: 12, marginTop: 2 },
  savedScore: { color: colors.textPrimary, fontFamily: type.family.sansBlack, fontSize: 22, letterSpacing: type.letterSpacing.tight },

  fab: {
    position: 'absolute',
    left: spacing.xl, right: spacing.xl, bottom: 100,
    flexDirection: 'row', gap: spacing.sm,
  },
  fabBtn: {
    flex: 1,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6,
    paddingVertical: 13,
    borderRadius: radius.pill,
    backgroundColor: colors.bronze,
    shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 12, shadowOffset: { width: 0, height: 6 },
  },
  fabSecondary: { backgroundColor: 'rgba(20,20,20,0.92)', borderWidth: StyleSheet.hairlineWidth, borderColor: colors.bronze },
  fabSecondaryText: { color: colors.bronze, fontFamily: type.family.sansSemi, fontSize: 13, letterSpacing: 0.2 },
  fabPrimaryText: { color: colors.textOnBronze, fontFamily: type.family.sansSemi, fontSize: 13, letterSpacing: 0.2 },
});
