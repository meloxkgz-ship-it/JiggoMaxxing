import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { Component, ErrorInfo, ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Eyebrow } from './Eyebrow';
import { JMMark } from './JMMark';
import { colors, radius, spacing, type } from '@/constants/jiggo-theme';

type State = { error: Error | null; nonce: number };

/**
 * Last-resort safety net for any render-time crash. Keeps the user in
 * the app, offers a copy-to-clipboard for the stack, and a 'reload'
 * (force-remounts the children via a key bump). Never reaches App
 * Review's red-screen path.
 *
 * Why nonce, not just `error:null`: clearing the error flag alone
 * re-renders the same child instances with the same hooks/state. If
 * the crash came from corrupt render-time state (e.g. malformed
 * AsyncStorage), the child immediately throws again — we'd flicker in
 * a loop. Bumping `nonce` and using it as a key on a wrapper forces a
 * full remount so child components start fresh.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null, nonce: 0 };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Best-effort breadcrumb to dev tools.
    if (__DEV__) console.error('[JIGGO] caught', error, info);
  }

  reload = () => {
    this.setState((s) => ({ error: null, nonce: s.nonce + 1 }));
  };

  copyStack = async () => {
    if (!this.state.error) return;
    await Clipboard.setStringAsync(
      `${this.state.error.message}\n\n${this.state.error.stack ?? ''}`,
    );
  };

  render() {
    if (!this.state.error) {
      // Keying the wrapper means reload() actually remounts the tree.
      return <View key={this.state.nonce} style={{ flex: 1 }}>{this.props.children}</View>;
    }
    return (
      <SafeAreaView edges={['top']} style={styles.root}>
        <View style={styles.content}>
          <JMMark size={56} />
          <Eyebrow>Something interrupted</Eyebrow>
          <Text style={styles.title}>Take a breath.{'\n'}Reload and continue.</Text>
          <Text style={styles.body}>
            The app hit an unexpected state. Your data on this device is intact. Tap Reload to
            re-enter — or copy the stack for me if it keeps happening.
          </Text>
          <Pressable style={styles.cta} onPress={this.reload}>
            <Ionicons name="refresh-outline" size={16} color={colors.textOnBronze} />
            <Text style={styles.ctaText}>Reload</Text>
          </Pressable>
          <Pressable style={styles.linkRow} onPress={this.copyStack}>
            <Ionicons name="copy-outline" size={14} color={colors.bronze} />
            <Text style={styles.linkText}>Copy error to clipboard</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  content: { flex: 1, padding: spacing.xl, justifyContent: 'center', gap: spacing.sm },
  title: {
    color: colors.textPrimary,
    fontFamily: type.family.sansBlack,
    fontSize: 36,
    lineHeight: 40,
    letterSpacing: type.letterSpacing.tighter,
    marginTop: spacing.md,
  },
  body: {
    color: colors.textSecondary,
    fontFamily: type.family.sans,
    fontSize: 14.5,
    lineHeight: 21,
    marginTop: spacing.sm,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: radius.pill,
    backgroundColor: colors.bronze,
    marginTop: spacing.xl,
  },
  ctaText: { color: colors.textOnBronze, fontFamily: type.family.sansSemi, fontSize: 14, letterSpacing: 0.2 },
  linkRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginTop: spacing.md,
  },
  linkText: { color: colors.bronze, fontFamily: type.family.sansMedium, fontSize: 12, letterSpacing: 0.2 },
});
