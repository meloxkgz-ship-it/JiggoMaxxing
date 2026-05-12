import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, useFocusEffect } from 'expo-router';
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

import { Eyebrow } from '@/components/Eyebrow';
import { JMMark } from '@/components/JMMark';
import { colors, radius, spacing, type } from '@/constants/jiggo-theme';
import {
  appendTurn,
  clearHistory,
  COACH_SUGGESTIONS,
  listHistory,
  sendToCoach,
} from '@/lib/coach';
import { getApiKey } from '@/lib/settings';
import { CoachTurn } from '@/lib/types';

export default function CoachScreen() {
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [turns, setTurns] = useState<CoachTurn[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const refresh = useCallback(async () => {
    const [k, h] = await Promise.all([getApiKey(), listHistory()]);
    setHasKey(!!k);
    setTurns(h);
  }, []);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [turns.length, busy]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setError(null);
    setInput('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const userTurn: CoachTurn = { role: 'user', content: trimmed, ts: Date.now() };
    const optimistic = [...turns, userTurn];
    setTurns(optimistic);
    await appendTurn(userTurn);
    setBusy(true);
    try {
      const reply = await sendToCoach(optimistic);
      const aiTurn: CoachTurn = { role: 'assistant', content: reply, ts: Date.now() };
      const next = [...optimistic, aiTurn];
      setTurns(next);
      await appendTurn(aiTurn);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (e: any) {
      setError(e?.message ?? 'Coach unavailable.');
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

  if (hasKey === null) {
    return (
      <View style={[styles.root, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={colors.bronze} />
      </View>
    );
  }

  if (!hasKey) return <CoachLocked />;

  return (
    <SafeAreaView edges={['top']} style={styles.root}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <JMMark size={28} />
          <View>
            <Eyebrow>Coach</Eyebrow>
            <Text style={styles.headerTitle}>Insight, not judgement</Text>
          </View>
        </View>
        <Pressable hitSlop={10} onPress={reset}>
          <Ionicons name="refresh-outline" size={20} color={colors.textTertiary} />
        </Pressable>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={styles.thread}
          showsVerticalScrollIndicator={false}>
          {turns.length === 0 && (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>Where shall we start?</Text>
              <Text style={styles.emptyBody}>
                Ask anything across grooming, physique, style, confidence, or discipline. I never compare. I never shame.
              </Text>
              <View style={styles.suggestions}>
                {COACH_SUGGESTIONS.map((s) => (
                  <Pressable key={s} style={styles.suggestion} onPress={() => send(s)}>
                    <Text style={styles.suggestionText}>{s}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {turns.map((t, i) => (
            <View
              key={i}
              style={[
                styles.bubbleRow,
                t.role === 'user' ? styles.bubbleRowRight : styles.bubbleRowLeft,
              ]}>
              {t.role === 'assistant' && (
                <View style={styles.coachAvatar}>
                  <Text style={styles.coachAvatarText}>JM</Text>
                </View>
              )}
              <View
                style={[
                  styles.bubble,
                  t.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant,
                ]}>
                <Text
                  style={[
                    styles.bubbleText,
                    t.role === 'user' && styles.bubbleTextUser,
                  ]}>
                  {t.content}
                </Text>
              </View>
            </View>
          ))}

          {busy && (
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

          {error && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={14} color={colors.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={{ height: 120 }} />
        </ScrollView>

        <View style={styles.composer}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Ask the coach…"
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

function CoachLocked() {
  return (
    <SafeAreaView edges={['top']} style={styles.root}>
      <ScrollView contentContainerStyle={styles.lockedContent}>
        <JMMark size={56} />
        <Eyebrow>Coach · setup</Eyebrow>
        <Text style={styles.lockedTitle}>A private coach,{'\n'}trained on your edge.</Text>
        <Text style={styles.lockedBody}>
          To activate Coach, add an Anthropic API key in Settings. Keys are stored in your device keychain — never on a server.
        </Text>
        <Pressable
          style={styles.lockedCta}
          onPress={() => router.push('/settings' as any)}>
          <Ionicons name="key-outline" size={16} color={colors.textOnBronze} />
          <Text style={styles.lockedCtaText}>Open Settings</Text>
        </Pressable>
        <Text style={styles.fine}>
          Coach never compares you to anyone. It refuses scores, ratings, and aesthetic ranking. Always.
        </Text>
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
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  headerTitle: {
    color: colors.textPrimary,
    fontFamily: type.family.sansSemi,
    fontSize: 16,
    marginTop: 2,
  },

  thread: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },

  empty: { gap: spacing.md, marginTop: spacing.xl },
  emptyTitle: {
    color: colors.textPrimary,
    fontFamily: type.family.sansBlack,
    fontSize: 28,
    letterSpacing: type.letterSpacing.tight,
  },
  emptyBody: {
    color: colors.textSecondary,
    fontFamily: type.family.sans,
    fontSize: 14,
    lineHeight: 21,
  },
  suggestions: { gap: spacing.sm, marginTop: spacing.lg },
  suggestion: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
  suggestionText: { color: colors.textPrimary, fontFamily: type.family.sansMedium, fontSize: 13 },

  bubbleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  bubbleRowLeft: { justifyContent: 'flex-start' },
  bubbleRowRight: { justifyContent: 'flex-end' },
  coachAvatar: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.bronze,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coachAvatarText: {
    color: colors.bronze,
    fontFamily: type.family.sansBlack,
    fontSize: 10,
    letterSpacing: 0.5,
  },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 18,
  },
  bubbleAssistant: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    borderBottomLeftRadius: 6,
  },
  bubbleUser: {
    backgroundColor: colors.bronze,
    borderBottomRightRadius: 6,
  },
  bubbleText: {
    color: colors.textPrimary,
    fontFamily: type.family.sans,
    fontSize: 14,
    lineHeight: 20,
  },
  bubbleTextUser: { color: colors.textOnBronze, fontFamily: type.family.sansMedium },
  bubbleTyping: { flexDirection: 'row', gap: 6, paddingVertical: 14, paddingHorizontal: 14 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.textTertiary },
  dotOn: { backgroundColor: colors.bronze },

  errorBox: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.danger,
    backgroundColor: 'rgba(176,88,79,0.08)',
  },
  errorText: { color: colors.danger, fontFamily: type.family.sansMedium, fontSize: 12, flex: 1 },

  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: 96, // sit above floating tab bar
    backgroundColor: colors.ink,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.hairline,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    paddingHorizontal: spacing.lg,
    paddingVertical: 11,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    backgroundColor: colors.surfaceElevated,
    color: colors.textPrimary,
    fontFamily: type.family.sans,
    fontSize: 14,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.bronze,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: colors.surfaceMuted },

  lockedContent: {
    padding: spacing.xl,
    paddingTop: spacing.xxxl,
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  lockedTitle: {
    color: colors.textPrimary,
    fontFamily: type.family.sansBlack,
    fontSize: 34,
    lineHeight: 38,
    letterSpacing: type.letterSpacing.tighter,
    marginTop: spacing.md,
  },
  lockedBody: {
    color: colors.textSecondary,
    fontFamily: type.family.sans,
    fontSize: 14,
    lineHeight: 21,
  },
  lockedCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: spacing.xl,
    paddingVertical: 13,
    borderRadius: radius.pill,
    backgroundColor: colors.bronze,
    marginTop: spacing.md,
  },
  lockedCtaText: { color: colors.textOnBronze, fontFamily: type.family.sansSemi, fontSize: 14, letterSpacing: 0.2 },
  fine: {
    color: colors.textTertiary,
    fontFamily: type.family.sans,
    fontSize: 12,
    lineHeight: 18,
    marginTop: spacing.md,
  },
});
