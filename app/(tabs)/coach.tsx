import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
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

import { CoachMessage } from '@/components/CoachMessage';
import { Eyebrow } from '@/components/Eyebrow';
import { JMMark } from '@/components/JMMark';
import { colors, radius, spacing, type } from '@/constants/jiggo-theme';
import {
  appendTurn,
  clearHistory,
  listHistory,
  sendToCoach,
  streamToCoach,
} from '@/lib/coach';
import { useT } from '@/lib/i18n';
import { getApiKey } from '@/lib/settings';
import { CoachTurn } from '@/lib/types';

const TOPIC_KEYS = ['grooming', 'physique', 'style', 'confidence', 'discipline', 'sleep', 'diet', 'focus', 'money', 'social'] as const;
type TopicKey = typeof TOPIC_KEYS[number];

const TOPIC_ICONS: Record<TopicKey, keyof typeof Ionicons.glyphMap> = {
  grooming: 'water-outline',
  physique: 'barbell-outline',
  style: 'shirt-outline',
  confidence: 'flame-outline',
  discipline: 'compass-outline',
  sleep: 'moon-outline',
  diet: 'nutrition-outline',
  focus: 'eye-outline',
  money: 'cash-outline',
  social: 'people-outline',
};

const SUGGESTION_KEYS = ['skinReset', 'posture', 'pushPull', 'style', 'restart'] as const;

export default function CoachScreen() {
  const t = useT();
  const params = useLocalSearchParams<{ primed?: string }>();
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [turns, setTurns] = useState<CoachTurn[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [streaming, setStreaming] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'chat' | 'topics'>('chat');
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const copy = async (text: string, idx: number) => {
    await Clipboard.setStringAsync(text);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 1200);
  };

  const refresh = useCallback(async () => {
    const [k, h] = await Promise.all([getApiKey(), listHistory()]);
    setHasKey(!!k);
    setTurns(h);
  }, []);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  // Honor a primed prompt passed in via /coach?primed=...
  useEffect(() => {
    if (params.primed && hasKey === true && !busy) {
      const text = String(params.primed);
      // clear the param so it doesn't refire on navigation
      router.setParams({ primed: undefined } as any);
      send(text);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.primed, hasKey]);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [turns.length, busy]);

  const runCoach = async (history: CoachTurn[]) => {
    setBusy(true);
    setStreaming('');
    try {
      let assembled = '';
      try {
        assembled = await streamToCoach(history, (chunk) => {
          assembled += chunk;
          setStreaming(assembled);
        });
      } catch {
        assembled = await sendToCoach(history);
      }
      const aiTurn: CoachTurn = { role: 'assistant', content: assembled, ts: Date.now() };
      const next = [...history, aiTurn];
      setTurns(next);
      setStreaming(null);
      // Persist by re-writing the full thread (overwrites; appendTurn would append again on regenerate)
      const { clearHistory: _clear } = await import('@/lib/coach');
      await _clear();
      for (const trn of next) await appendTurn(trn);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (e: any) {
      setError(e?.message ?? t('coach.error'));
      setStreaming(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    } finally {
      setBusy(false);
    }
  };

  const regenerate = async () => {
    if (busy) return;
    // Drop the last assistant turn (if any) and re-run with what's left
    const trimmedTurns = [...turns];
    while (trimmedTurns.length && trimmedTurns[trimmedTurns.length - 1].role === 'assistant') {
      trimmedTurns.pop();
    }
    if (trimmedTurns.length === 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setTurns(trimmedTurns);
    await runCoach(trimmedTurns);
  };

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setError(null);
    setInput('');
    setView('chat');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const userTurn: CoachTurn = { role: 'user', content: trimmed, ts: Date.now() };
    const optimistic = [...turns, userTurn];
    setTurns(optimistic);
    await appendTurn(userTurn);
    setBusy(true);
    setStreaming('');
    try {
      let assembled = '';
      try {
        assembled = await streamToCoach(optimistic, (chunk) => {
          assembled += chunk;
          setStreaming(assembled);
        });
      } catch (streamErr) {
        // Fallback to non-streaming on any streaming hiccup.
        assembled = await sendToCoach(optimistic);
      }
      const aiTurn: CoachTurn = { role: 'assistant', content: assembled, ts: Date.now() };
      const next = [...optimistic, aiTurn];
      setTurns(next);
      setStreaming(null);
      await appendTurn(aiTurn);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (e: any) {
      setError(e?.message ?? t('coach.error'));
      setStreaming(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    await clearHistory();
    setTurns([]);
    setError(null);
  };

  const copyAll = async () => {
    if (turns.length === 0) return;
    const transcript = turns
      .map((tn) => `${tn.role === 'user' ? 'You' : 'Coach'}:\n${tn.content}`)
      .join('\n\n');
    await Clipboard.setStringAsync(transcript);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  };

  if (hasKey === null) {
    return (
      <View style={[styles.root, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={colors.bronze} />
      </View>
    );
  }

  if (!hasKey) return <CoachLocked t={t} />;

  return (
    <SafeAreaView edges={['top']} style={styles.root}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <JMMark size={28} />
          <View>
            <Eyebrow>{t('coach.title')}</Eyebrow>
            <Text style={styles.headerTitle}>{t('coach.subtitle')}</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          {turns.length > 0 && (
            <Pressable hitSlop={10} onPress={copyAll}>
              <Ionicons name="copy-outline" size={18} color={colors.textSecondary} />
            </Pressable>
          )}
          <Pressable hitSlop={10} onPress={() => setView(view === 'chat' ? 'topics' : 'chat')}>
            <Ionicons name={view === 'chat' ? 'apps-outline' : 'chatbubble-outline'} size={18} color={colors.textSecondary} />
          </Pressable>
          <Pressable hitSlop={10} onPress={reset}>
            <Ionicons name="refresh-outline" size={20} color={colors.textTertiary} />
          </Pressable>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>
        {view === 'topics' ? (
          <ScrollView contentContainerStyle={styles.topicsScroll} showsVerticalScrollIndicator={false}>
            <Eyebrow>{t('coach.topics')}</Eyebrow>
            <View style={styles.topicsGrid}>
              {TOPIC_KEYS.map((k) => (
                <Pressable
                  key={k}
                  style={styles.topicCard}
                  onPress={() => send(t(`coach.topicCards.${k}.title`))}>
                  <View style={styles.topicIcon}>
                    <Ionicons name={TOPIC_ICONS[k]} size={18} color={colors.bronze} />
                  </View>
                  <Text style={styles.topicTitle}>{t(`coach.topicCards.${k}.title`)}</Text>
                  <Text style={styles.topicBody}>{t(`coach.topicCards.${k}.body`)}</Text>
                </Pressable>
              ))}
            </View>
            <View style={{ height: 120 }} />
          </ScrollView>
        ) : (
          <ScrollView
            ref={scrollRef}
            style={{ flex: 1 }}
            contentContainerStyle={styles.thread}
            showsVerticalScrollIndicator={false}>
            {turns.length === 0 && (
              <View style={styles.empty}>
                <Text style={styles.emptyTitle}>{t('coach.emptyTitle')}</Text>
                <Text style={styles.emptyBody}>{t('coach.emptyBody')}</Text>
                <View style={styles.suggestions}>
                  {SUGGESTION_KEYS.map((k) => (
                    <Pressable key={k} style={styles.suggestion} onPress={() => send(t(`coach.suggestions.${k}`))}>
                      <Text style={styles.suggestionText}>{t(`coach.suggestions.${k}`)}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {turns.map((turn, i) => (
              <View
                key={i}
                style={[styles.bubbleRow, turn.role === 'user' ? styles.bubbleRowRight : styles.bubbleRowLeft]}>
                {turn.role === 'assistant' && (
                  <View style={styles.coachAvatar}>
                    <Text style={styles.coachAvatarText}>JM</Text>
                  </View>
                )}
                <Pressable
                  onLongPress={() => copy(turn.content, i)}
                  delayLongPress={350}
                  style={[
                    styles.bubble,
                    turn.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant,
                  ]}>
                  {copiedIdx === i ? (
                    <Text style={[styles.bubbleText, turn.role === 'user' && styles.bubbleTextUser, { fontStyle: 'italic', opacity: 0.7 }]}>
                      ✓ {t('coach.copied')}
                    </Text>
                  ) : turn.role === 'user' ? (
                    <Text style={[styles.bubbleText, styles.bubbleTextUser]}>{turn.content}</Text>
                  ) : (
                    <CoachMessage text={turn.content} />
                  )}
                </Pressable>
              </View>
            ))}

            {busy && streaming !== null && streaming.length > 0 && (
              <View style={[styles.bubbleRow, styles.bubbleRowLeft]}>
                <View style={styles.coachAvatar}>
                  <Text style={styles.coachAvatarText}>JM</Text>
                </View>
                <View style={[styles.bubble, styles.bubbleAssistant]}>
                  <CoachMessage text={streaming} />
                </View>
              </View>
            )}

            {busy && (streaming === null || streaming.length === 0) && (
              <View style={[styles.bubbleRow, styles.bubbleRowLeft]}>
                <View style={styles.coachAvatar}>
                  <Text style={styles.coachAvatarText}>JM</Text>
                </View>
                <View style={[styles.bubble, styles.bubbleAssistant, styles.bubbleTyping]}>
                  <Dot delay={0} />
                  <Dot delay={150} />
                  <Dot delay={300} />
                </View>
              </View>
            )}

            {!busy && turns.length > 0 && turns[turns.length - 1].role === 'assistant' && (
              <Pressable style={styles.regenBtn} onPress={regenerate}>
                <Ionicons name="refresh-outline" size={14} color={colors.bronze} />
                <Text style={styles.regenText}>{t('coach.regenerate')}</Text>
              </Pressable>
            )}

            {error && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={14} color={colors.danger} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <View style={{ height: 120 }} />
          </ScrollView>
        )}

        <View style={styles.composer}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder={t('coach.composer')}
            placeholderTextColor={colors.textTertiary}
            style={styles.input}
            multiline
            onSubmitEditing={() => send(input)}
            submitBehavior="blurAndSubmit"
          />
          <Pressable
            onPress={() => send(input)}
            style={[styles.sendBtn, !input.trim() && styles.sendBtnDisabled]}
            disabled={!input.trim() || busy}>
            <Ionicons name="arrow-up" size={18} color={colors.textOnBronze} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Dot({ delay }: { delay: number }) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const id = setInterval(() => setOn((v) => !v), 500);
    const t = setTimeout(() => setOn(true), delay);
    return () => { clearInterval(id); clearTimeout(t); };
  }, [delay]);
  return <View style={[styles.dot, on && styles.dotOn]} />;
}

function CoachLocked({ t }: { t: (k: string, vars?: any) => string }) {
  return (
    <SafeAreaView edges={['top']} style={styles.root}>
      <ScrollView contentContainerStyle={styles.lockedContent}>
        <JMMark size={56} />
        <Eyebrow>{t('coach.title')}</Eyebrow>
        <Text style={styles.lockedTitle}>{t('coach.lockedTitle')}</Text>
        <Text style={styles.lockedBody}>{t('coach.lockedBody')}</Text>
        <Pressable style={styles.lockedCta} onPress={() => router.push('/settings' as any)}>
          <Ionicons name="key-outline" size={16} color={colors.textOnBronze} />
          <Text style={styles.lockedCtaText}>{t('coach.openSettings')}</Text>
        </Pressable>
        <Text style={styles.fine}>{t('coach.fine')}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.xl, paddingTop: spacing.sm, paddingBottom: spacing.md,
  },
  headerTitle: { color: colors.textPrimary, fontFamily: type.family.sansSemi, fontSize: 16, marginTop: 2 },

  topicsScroll: { padding: spacing.xl, gap: spacing.lg },
  topicsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  topicCard: {
    flexBasis: '47%', flexGrow: 1,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceElevated,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline,
    gap: 6,
  },
  topicIcon: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: colors.bronzeOnBlack,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 6,
  },
  topicTitle: { color: colors.textPrimary, fontFamily: type.family.sansSemi, fontSize: 14 },
  topicBody: { color: colors.textSecondary, fontFamily: type.family.sans, fontSize: 12, lineHeight: 18 },

  thread: { paddingHorizontal: spacing.xl, paddingBottom: spacing.lg, gap: spacing.md },
  empty: { gap: spacing.md, marginTop: spacing.xl },
  emptyTitle: { color: colors.textPrimary, fontFamily: type.family.sansBlack, fontSize: 28, letterSpacing: type.letterSpacing.tight },
  emptyBody: { color: colors.textSecondary, fontFamily: type.family.sans, fontSize: 14, lineHeight: 21 },
  suggestions: { gap: spacing.sm, marginTop: spacing.lg },
  suggestion: {
    paddingHorizontal: spacing.lg, paddingVertical: 12, borderRadius: radius.md,
    backgroundColor: colors.surfaceElevated,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline,
  },
  suggestionText: { color: colors.textPrimary, fontFamily: type.family.sansMedium, fontSize: 13 },

  bubbleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  bubbleRowLeft: { justifyContent: 'flex-start' },
  bubbleRowRight: { justifyContent: 'flex-end' },
  coachAvatar: { width: 28, height: 28, borderRadius: 8, borderWidth: 1, borderColor: colors.bronze, alignItems: 'center', justifyContent: 'center' },
  coachAvatarText: { color: colors.bronze, fontFamily: type.family.sansBlack, fontSize: 10, letterSpacing: 0.5 },
  bubble: { maxWidth: '78%', paddingHorizontal: 14, paddingVertical: 11, borderRadius: 18 },
  bubbleAssistant: { backgroundColor: colors.surfaceElevated, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline, borderBottomLeftRadius: 6 },
  bubbleUser: { backgroundColor: colors.bronze, borderBottomRightRadius: 6 },
  bubbleText: { color: colors.textPrimary, fontFamily: type.family.sans, fontSize: 14, lineHeight: 20 },
  bubbleTextUser: { color: colors.textOnBronze, fontFamily: type.family.sansMedium },
  bubbleTyping: { flexDirection: 'row', gap: 6, paddingVertical: 14, paddingHorizontal: 14 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.textTertiary },
  dotOn: { backgroundColor: colors.bronze },

  regenBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: spacing.md, paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline,
    backgroundColor: colors.surface,
    alignSelf: 'flex-start',
    marginLeft: 36, // align with assistant bubble
  },
  regenText: { color: colors.bronze, fontFamily: type.family.sansMedium, fontSize: 11.5, letterSpacing: 0.3 },

  errorBox: {
    flexDirection: 'row', gap: 8, alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.danger,
    backgroundColor: 'rgba(176,88,79,0.08)',
  },
  errorText: { color: colors.danger, fontFamily: type.family.sansMedium, fontSize: 12, flex: 1 },

  composer: {
    flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm,
    paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: 96,
    backgroundColor: colors.ink,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.hairline,
  },
  input: {
    flex: 1, minHeight: 44, maxHeight: 120,
    paddingHorizontal: spacing.lg, paddingVertical: 11,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.hairline,
    backgroundColor: colors.surfaceElevated,
    color: colors.textPrimary, fontFamily: type.family.sans, fontSize: 14,
  },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.bronze, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { backgroundColor: colors.surfaceMuted },

  lockedContent: { padding: spacing.xl, paddingTop: spacing.xxxl, gap: spacing.md, alignItems: 'flex-start' },
  lockedTitle: {
    color: colors.textPrimary, fontFamily: type.family.sansBlack,
    fontSize: 34, lineHeight: 38, letterSpacing: type.letterSpacing.tighter, marginTop: spacing.md,
  },
  lockedBody: { color: colors.textSecondary, fontFamily: type.family.sans, fontSize: 14, lineHeight: 21 },
  lockedCta: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: spacing.xl, paddingVertical: 13,
    borderRadius: radius.pill, backgroundColor: colors.bronze,
    marginTop: spacing.md,
  },
  lockedCtaText: { color: colors.textOnBronze, fontFamily: type.family.sansSemi, fontSize: 14, letterSpacing: 0.2 },
  fine: { color: colors.textTertiary, fontFamily: type.family.sans, fontSize: 12, lineHeight: 18, marginTop: spacing.md },
});
