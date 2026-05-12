import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, type } from '@/constants/jiggo-theme';

/**
 * Minimal markdown-light renderer for Coach replies.
 * Handles: paragraph breaks (\n\n), bullet lines (- / • / * at line start),
 * and **bold** inside any line. Anything else falls through as plain text.
 * Deliberately small — Claude usually keeps responses tight per system prompt.
 */
export function CoachMessage({ text }: { text: string }) {
  const blocks = parseBlocks(text);
  return (
    <View style={{ gap: 8 }}>
      {blocks.map((b, i) => {
        if (b.type === 'bullet') {
          return (
            <View key={i} style={styles.bulletRow}>
              <Text style={styles.bulletDot}>•</Text>
              <Text style={styles.bulletText}>{renderInline(b.text)}</Text>
            </View>
          );
        }
        return (
          <Text key={i} style={styles.para}>
            {renderInline(b.text)}
          </Text>
        );
      })}
    </View>
  );
}

type Block = { type: 'para' | 'bullet'; text: string };

function parseBlocks(src: string): Block[] {
  const out: Block[] = [];
  const lines = src.replace(/\r\n/g, '\n').split('\n');
  let buffer: string[] = [];
  const flush = () => {
    if (buffer.length) {
      out.push({ type: 'para', text: buffer.join(' ').trim() });
      buffer = [];
    }
  };
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      flush();
      continue;
    }
    const m = line.match(/^[-•*]\s+(.+)$/);
    if (m) {
      flush();
      out.push({ type: 'bullet', text: m[1] });
    } else {
      buffer.push(line);
    }
  }
  flush();
  return out;
}

function renderInline(text: string): React.ReactNode[] {
  // split on **bold** runs
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**')) {
      return (
        <Text key={i} style={styles.bold}>
          {p.slice(2, -2)}
        </Text>
      );
    }
    return p;
  });
}

const styles = StyleSheet.create({
  para: {
    color: colors.textPrimary,
    fontFamily: type.family.sans,
    fontSize: 14,
    lineHeight: 21,
  },
  bold: {
    fontFamily: type.family.sansBold,
    color: colors.textPrimary,
  },
  bulletRow: { flexDirection: 'row', gap: 8 },
  bulletDot: {
    color: colors.bronze,
    fontFamily: type.family.sansBold,
    fontSize: 14,
    lineHeight: 21,
    marginLeft: 2,
  },
  bulletText: {
    color: colors.textPrimary,
    fontFamily: type.family.sans,
    fontSize: 14,
    lineHeight: 21,
    flex: 1,
  },
});
