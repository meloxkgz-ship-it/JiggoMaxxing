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
  listItems,
  Look,
  LOOKS,
} from '@/lib/closet';
import { useT } from '@/lib/i18n';

const FILTERS: ('all' | Archetype)[] = ['all', ...ARCHETYPES];

export default function StyleScreen() {
  const t = useT();
  const [items, setItems] = useState<ClosetItem[]>([]);
  const [filter, setFilter] = useState<'all' | Archetype>('all');
  const [tab, setTab] = useState<'closet' | 'looks'>('closet');

  useFocusEffect(useCallback(() => {
    (async () => setItems(await listItems()))();
  }, []));

  const looksFiltered = filter === 'all' ? LOOKS : LOOKS.filter((l) => l.archetype === filter);

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
          <Text style={[styles.tabBtnText, tab === 'looks' && styles.tabBtnTextActive]}>{t('style.looks')} · {looksFiltered.length}</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {tab === 'closet' ? (
          <ClosetView items={items} onDelete={onDelete} />
        ) : (
          <>
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
            <View style={styles.looksGrid}>
              {looksFiltered.map((l) => <LookCard key={l.id} look={l} t={t} />)}
            </View>
          </>
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

function ClosetView({ items, onDelete }: { items: ClosetItem[]; onDelete: (i: ClosetItem) => void }) {
  const t = useT();
  if (items.length === 0) {
    return (
      <View style={styles.empty}>
        <Ionicons name="shirt-outline" size={36} color={colors.bronze} />
        <Text style={styles.emptyTitle}>{t('style.emptyCloset')}</Text>
        <Text style={styles.emptyBody}>{t('style.emptyClosetBody')}</Text>
      </View>
    );
  }
  return (
    <View style={styles.grid}>
      {items.map((it) => (
        <Pressable key={it.id} style={styles.itemCard} onLongPress={() => onDelete(it)}>
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

function LookCard({ look, t }: { look: Look; t: (k: string, vars?: any) => string }) {
  return (
    <View style={styles.lookCard}>
      <View style={styles.lookSwatchRow}>
        {look.palette.map((c, i) => (
          <View key={i} style={[styles.lookSwatch, { backgroundColor: c, marginLeft: i === 0 ? 0 : -10 }]} />
        ))}
      </View>
      <Text style={styles.lookTitle}>{look.title}</Text>
      <Text style={styles.lookMeta}>{t(`style.archetypes.${look.archetype}`)} · {t(`style.occasions.${look.occasion}`)}</Text>
      <Text style={styles.lookCopy}>{look.copy}</Text>
    </View>
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
  emptyTitle: { color: colors.textPrimary, fontFamily: type.family.sansBold, fontSize: 18, marginTop: spacing.md },
  emptyBody: { color: colors.textSecondary, fontFamily: type.family.sans, fontSize: 13, textAlign: 'center' },

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
