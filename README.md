# JIGGO MAXXING

**Build your edge. Privately.**
A premium, non-toxic men's edge-coach for iOS — grooming, physique, style, confidence, and discipline. Local-first, no comparisons, no ratings.

> Insight, not judgement.

## What it does

| Tab        | Feature                                                                   |
| ---------- | ------------------------------------------------------------------------- |
| **Home**   | Daily Edge nudge · Edge Index hero · Discipline stat grid · Quick capture |
| **Plan**   | 4 switchable templates · Next-Up countdown · weekly progress dots         |
| **Scan**   | Camera/library photo capture · 6-dim local PRNG scoring · history         |
| **Journal**| Weight/sleep/mood/notes · sparkline · streak · weekly review              |
| **Style**  | Today's Pick · 12 curated looks (Aesty-style) · personal Closet · Outfit Builder · Match Score |
| **Coach**  | Live Claude chat (Haiku 4.5) with non-toxic system prompt · 5 topic cards |

## Tech stack

- React Native + Expo (~SDK 54), Expo Router, TypeScript, new architecture
- Reanimated, Linear Gradient, BlurView, Expo Image
- AsyncStorage + SecureStore for local-only data
- Anthropic Messages API via direct REST (Coach only)
- i18n: device-locale boot via expo-localization, EN + DE

## Privacy contract

- No accounts, no analytics, no comparison features ever
- Scans + journal + plan + closet never leave the device
- Coach messages go to Anthropic *only* when the user supplies a key, stored in iOS Keychain (`WHEN_UNLOCKED_THIS_DEVICE_ONLY`)
- `Reset all data` in Settings wipes every key under the `jiggo.v1.` namespace

## Project layout

```
app/
  (tabs)/              # 6 main screens
    _layout.tsx        # Floating bottom-tab bar (blurred, bronze active)
    index.tsx          # Home / Edge Hub
    plan.tsx           # Maxxing Plan
    scan.tsx           # Max Scan (camera capture + history)
    journal.tsx        # Physique journal
    style.tsx          # Closet + Looks + Builder entry
    coach.tsx          # Claude chat + topic cards
  _layout.tsx          # Root: fonts, LanguageProvider, onboarding gate
  onboarding.tsx       # 3-step intro + anti-toxic pact
  settings.tsx         # Profile, language, coach key, danger zone
  scan-detail.tsx      # Single-scan breakdown + micro-actions
  journal-entry.tsx    # New journal note (modal)
  closet-add.tsx       # Add closet item (modal)
  builder.tsx          # Outfit Builder (modal, accepts ?archetype&occasion)
  look-detail.tsx      # Curated look detail (modal)
  why.tsx              # "Why no ratings" essay (modal)

components/            # Card, Eyebrow, JMMark, ScreenHeader
constants/jiggo-theme.ts
lib/
  i18n/                # en.ts, de.ts, index.tsx (LanguageProvider)
  storage.ts           # Typed AsyncStorage wrapper + wipeAll
  types.ts             # Shared model types
  journal.ts           # CRUD + streak helpers
  scan.ts              # Deterministic local scoring
  plan.ts              # 4 templates + completion tracking
  closet.ts            # Items, palette, 12 Looks, scoreOutfit(), seed
  coach.ts             # Anthropic REST client + system prompt
  nudge.ts             # 75×2 daily nudges with day-of-year rotation
  settings.ts          # Settings + Keychain key store
scripts/make-icons.py  # Generates all app icons from the JM monogram
```

## Common tasks

```sh
# Type check
npx tsc --noEmit

# Web smoke build (fastest)
npx expo export --platform web --no-bytecode

# Regenerate app icons
python3 scripts/make-icons.py

# Native iOS run (requires CocoaPods)
sudo gem install cocoapods --no-document   # once
npx expo run:ios
```

## Anti-pattern guardrails

Anything matching the list below is a non-starter, no matter how engaging:

- Face / body ratings, 0–10 scores, attractiveness percentages, PSL
- Comparisons to other users, leaderboards, social benchmarks
- Surgery suggestions, aesthetic gatekeeping
- Before/after shame loops, transformation badges based on appearance
- "Pretty privilege" mechanics or anything that would feel good to a man who hates himself

If a feature *would* feel good to that man, we don't ship it. The Coach refuses these on prompt level; the UI never surfaces a path to them.
