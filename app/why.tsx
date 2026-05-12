import { Ionicons } from '@expo/vector-icons';
import { Stack, router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Eyebrow } from '@/components/Eyebrow';
import { colors, radius, spacing, type } from '@/constants/jiggo-theme';
import { useLanguage } from '@/lib/i18n';

const EN = {
  eyebrow: 'The pact',
  title: 'Why no ratings.',
  intro: 'Most looksmaxxing tools sell you a number out of ten and call it a baseline. We refuse.',
  sections: [
    {
      h: 'Numbers about your face are coercion in disguise.',
      p: 'A score is a leash. It tells you how you stack up against a sample you didn\'t choose and a standard you didn\'t set. Even when the score goes up, the leash stays on. We don\'t build leashes.',
    },
    {
      h: 'Comparison is the wrong fuel.',
      p: 'Discipline that runs on comparison runs out the moment you lose. It is also fragile to the next viral trend, the next "look," the next person better at the game. The work that lasts compares you only to yesterday you.',
    },
    {
      h: 'What we measure instead.',
      p: 'Habits, routines, frame, recovery, fit, and how you carry yourself. These are inputs you control. The scan reads six dimensions because dimensions move with practice; aesthetics do not.',
    },
    {
      h: 'Coach has limits.',
      p: 'It will not rate your face. It will not compare you to anyone. It will not suggest surgery. It will redirect — towards a real action you can do today, no shame attached.',
    },
    {
      h: 'A short rule.',
      p: 'If a feature would feel good to a man who hates himself, we don\'t ship it. Insight, not judgement.',
    },
  ],
};

const DE: typeof EN = {
  eyebrow: 'Der Pakt',
  title: 'Warum keine Bewertungen.',
  intro: 'Die meisten Looksmaxxing-Tools verkaufen dir eine Zahl von zehn und nennen das Basislinie. Wir verweigern.',
  sections: [
    {
      h: 'Zahlen über dein Gesicht sind verschleierter Zwang.',
      p: 'Ein Score ist eine Leine. Er sagt dir, wie du im Vergleich zu einer Stichprobe stehst, die du nicht gewählt hast, an einem Standard, den du nicht gesetzt hast. Auch wenn der Score steigt, bleibt die Leine. Wir bauen keine Leinen.',
    },
    {
      h: 'Vergleich ist der falsche Treibstoff.',
      p: 'Disziplin, die auf Vergleich läuft, geht in dem Moment aus, in dem du verlierst. Sie ist auch fragil gegenüber dem nächsten viralen Trend, dem nächsten „Look", der nächsten Person, die besser im Spiel ist. Die Arbeit, die hält, vergleicht dich nur mit dem Du von gestern.',
    },
    {
      h: 'Was wir stattdessen messen.',
      p: 'Gewohnheiten, Routinen, Frame, Recovery, Fit und wie du dich trägst. Das sind Inputs, die du steuerst. Der Scan liest sechs Dimensionen, weil Dimensionen mit Praxis bewegen; Ästhetik tut das nicht.',
    },
    {
      h: 'Der Coach hat Grenzen.',
      p: 'Er bewertet dein Gesicht nicht. Er vergleicht dich mit niemandem. Er empfiehlt keine OP. Er lenkt um — auf eine echte Aktion, die du heute tun kannst, ohne Scham.',
    },
    {
      h: 'Eine kurze Regel.',
      p: 'Wenn ein Feature einem Mann, der sich selbst hasst, gut tun würde — versenden wir es nicht. Insight, kein Urteil.',
    },
  ],
};

export default function WhyScreen() {
  const { lang } = useLanguage();
  const doc = lang === 'de' ? DE : EN;

  return (
    <SafeAreaView edges={['top']} style={styles.root}>
      <Stack.Screen options={{ title: doc.title }} />
      <View style={styles.header}>
        <Pressable hitSlop={10} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color={colors.textPrimary} />
        </Pressable>
        <View style={{ flex: 1 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Eyebrow>{doc.eyebrow}</Eyebrow>
        <Text style={styles.title}>{doc.title}</Text>
        <Text style={styles.intro}>{doc.intro}</Text>

        {doc.sections.map((s, i) => (
          <View key={i} style={styles.section}>
            <View style={styles.bullet} />
            <View style={{ flex: 1 }}>
              <Text style={styles.h}>{s.h}</Text>
              <Text style={styles.p}>{s.p}</Text>
            </View>
          </View>
        ))}

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  header: { flexDirection: 'row', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },

  content: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, gap: spacing.lg },
  title: {
    color: colors.textPrimary, fontFamily: type.family.sansBlack,
    fontSize: 40, lineHeight: 44, letterSpacing: type.letterSpacing.tighter,
  },
  intro: {
    color: colors.textSecondary, fontFamily: type.family.sans,
    fontSize: 16, lineHeight: 24, marginBottom: spacing.md,
  },
  section: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  bullet: {
    width: 4, height: 4, borderRadius: 2,
    backgroundColor: colors.bronze, marginTop: 10,
  },
  h: { color: colors.textPrimary, fontFamily: type.family.sansBold, fontSize: 17, lineHeight: 22, letterSpacing: type.letterSpacing.tight },
  p: { color: colors.textSecondary, fontFamily: type.family.sans, fontSize: 14, lineHeight: 22, marginTop: 6 },
});
