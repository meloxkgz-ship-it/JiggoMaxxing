import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Eyebrow } from '@/components/Eyebrow';
import { colors, radius, spacing, type } from '@/constants/jiggo-theme';
import {
  addItem,
  ARCHETYPES,
  CATEGORIES,
  Category,
  COLORS,
  Archetype,
  getItem,
  Occasion,
  OCCASIONS,
  updateItem,
} from '@/lib/closet';
import { useT } from '@/lib/i18n';

export default function ClosetAddScreen() {
  const t = useT();
  const params = useLocalSearchParams<{ id?: string }>();
  // Mirror plan-item-add: if the underlying item went missing between
  // push and mount, drop edit mode so Save adds rather than silently no-ops.
  const [editId, setEditId] = useState<string | null>(params.id ?? null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<Category>('top');
  const [colorIdx, setColorIdx] = useState<number>(0);
  const [archetypes, setArchetypes] = useState<Archetype[]>(['tonal']);
  const [occasions, setOccasions] = useState<Occasion[]>(['weekend']);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editId) return;
    (async () => {
      const it = await getItem(editId);
      if (!it) {
        setEditId(null);
        return;
      }
      setPhotoUri(it.photoUri ?? null);
      setName(it.name);
      setCategory(it.category);
      const idx = COLORS.findIndex((c) => c.hex.toLowerCase() === it.color.toLowerCase());
      setColorIdx(idx >= 0 ? idx : 0);
      setArchetypes(it.archetypes);
      setOccasions(it.occasions);
    })();
  }, [editId]);

  const pickPhoto = async (source: 'camera' | 'library') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const perm =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [3, 4], quality: 0.7 })
        : await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [3, 4], quality: 0.7 });
    if (!result.canceled) setPhotoUri(result.assets?.[0]?.uri ?? null);
  };

  const toggle = <T extends string>(arr: T[], setArr: (v: T[]) => void, v: T) => {
    Haptics.selectionAsync().catch(() => {});
    setArr(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  };

  const save = async () => {
    if (saving) return;
    setSaving(true);
    const color = COLORS[colorIdx];
    const payload = {
      name: name.trim() || t(`style.categories.${category}`),
      category,
      color: color.hex,
      tone: color.tone,
      archetypes,
      occasions,
      photoUri: photoUri ?? undefined,
    };
    if (editId) {
      await updateItem(editId, payload);
    } else {
      await addItem(payload);
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    router.back();
  };

  return (
    <SafeAreaView edges={['top']} style={styles.root}>
      <Stack.Screen options={{ title: 'Closet' }} />
      <View style={styles.header}>
        <Pressable hitSlop={10} onPress={() => router.back()}>
          <Ionicons name="close" size={24} color={colors.textSecondary} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('style.addItem')}</Text>
        <Pressable hitSlop={10} onPress={save} style={[styles.saveBtn, saving && { opacity: 0.5 }]}>
          <Text style={styles.saveBtnText}>{saving ? t('common.saving') : t('common.save')}</Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Photo */}
          <Pressable
            style={styles.photoBox}
            onPress={() => pickPhoto('library')}
            onLongPress={() => pickPhoto('camera')}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={StyleSheet.absoluteFill} contentFit="cover" />
            ) : (
              <View style={styles.photoEmpty}>
                <Ionicons name="image-outline" size={32} color={colors.bronze} />
                <Text style={styles.photoText}>Tap to choose photo</Text>
                <Text style={styles.photoMeta}>Long-press for camera · optional</Text>
              </View>
            )}
          </Pressable>

          <Field label={t('style.itemName')}>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder={t('style.itemNamePlaceholder')}
              placeholderTextColor={colors.textTertiary}
            />
          </Field>

          <Field label={t('style.chooseCategory')}>
            <View style={styles.row}>
              {CATEGORIES.map((c) => (
                <Pressable
                  key={c}
                  onPress={() => {
                    Haptics.selectionAsync().catch(() => {});
                    setCategory(c);
                  }}
                  style={[styles.chip, category === c && styles.chipActive]}>
                  <Text style={[styles.chipText, category === c && styles.chipTextActive]}>
                    {t(`style.categories.${c}`)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Field>

          <Field label={t('style.chooseColor')}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingVertical: 4 }}>
              {COLORS.map((c, i) => (
                <Pressable
                  key={c.hex}
                  onPress={() => {
                    Haptics.selectionAsync().catch(() => {});
                    setColorIdx(i);
                  }}
                  style={[
                    styles.swatch,
                    { backgroundColor: c.hex },
                    colorIdx === i && styles.swatchActive,
                  ]}>
                  {colorIdx === i && (
                    <Ionicons
                      name="checkmark"
                      size={16}
                      color={['#FFFFFF','#F2EDE4','#E7DFCC','#C7BDA7'].includes(c.hex) ? '#0B0907' : '#fff'}
                    />
                  )}
                </Pressable>
              ))}
            </ScrollView>
            <Text style={styles.swatchName}>{COLORS[colorIdx].name} · {COLORS[colorIdx].tone}</Text>
          </Field>

          <Field label={t('style.archetype')}>
            <View style={styles.row}>
              {ARCHETYPES.map((a) => (
                <Pressable
                  key={a}
                  onPress={() => toggle(archetypes, setArchetypes, a)}
                  style={[styles.chip, archetypes.includes(a) && styles.chipActive]}>
                  <Text style={[styles.chipText, archetypes.includes(a) && styles.chipTextActive]}>
                    {t(`style.archetypes.${a}`)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Field>

          <Field label={t('style.occasion')}>
            <View style={styles.row}>
              {OCCASIONS.map((o) => (
                <Pressable
                  key={o}
                  onPress={() => toggle(occasions, setOccasions, o)}
                  style={[styles.chip, occasions.includes(o) && styles.chipActive]}>
                  <Text style={[styles.chipText, occasions.includes(o) && styles.chipTextActive]}>
                    {t(`style.occasions.${o}`)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Field>

          <View style={{ height: 80 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Eyebrow>{label}</Eyebrow>
      <View style={{ marginTop: 8 }}>{children}</View>
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
  saveBtn: { paddingHorizontal: spacing.lg, paddingVertical: 7, borderRadius: radius.pill, backgroundColor: colors.bronze },
  saveBtnText: { color: colors.textOnBronze, fontFamily: type.family.sansSemi, fontSize: 12, letterSpacing: 0.3 },

  content: { padding: spacing.xl, gap: spacing.xl },
  field: { gap: 4 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },

  photoBox: {
    aspectRatio: 3 / 4,
    width: '60%',
    alignSelf: 'center',
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.surfaceElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
  photoEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6, padding: spacing.lg },
  photoText: { color: colors.textPrimary, fontFamily: type.family.sansMedium, fontSize: 13 },
  photoMeta: { color: colors.textTertiary, fontFamily: type.family.sans, fontSize: 11 },

  input: {
    paddingHorizontal: spacing.lg, paddingVertical: 13, borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline,
    backgroundColor: colors.surfaceElevated, color: colors.textPrimary,
    fontFamily: type.family.sansMedium, fontSize: 14,
  },

  chip: {
    paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.bronze, borderColor: colors.bronze },
  chipText: { color: colors.textSecondary, fontFamily: type.family.sansMedium, fontSize: 11.5, letterSpacing: 0.2 },
  chipTextActive: { color: colors.textOnBronze },

  swatch: {
    width: 44, height: 44, borderRadius: 22,
    borderWidth: 1.5, borderColor: colors.hairline,
    alignItems: 'center', justifyContent: 'center',
  },
  swatchActive: { borderColor: colors.bronze, borderWidth: 2 },
  swatchName: {
    color: colors.textTertiary, fontFamily: type.family.sansMedium,
    fontSize: 11, letterSpacing: 0.3, marginTop: 8,
  },
});
