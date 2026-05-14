# JIGGO MAXXING — App Store Deploy Playbook

Commands you (the user) need to run at the terminal. JS-side is complete and tsc + web-export clean.

---

## STATUS as of v3.29 (2026-05-14)

JS-side launch blockers are **resolved**:
- ✅ `app.json` version set to `1.0.0` (first submit)
- ✅ `/upgrade` premium screen gated behind `lib/featureFlags.ts` → `PRO_ENABLED = false`. v1.0 ships **BYO-Anthropic-key only** — no visible purchase flow, so no 2.1/3.1.1 stub-purchase rejection. Flip the flag + ship an update once StoreKit is wired (see §6).
- ✅ Scan dimensions de-PSL'd: `Symmetry` / `Lower-third` → `Recovery` / `Grooming edge` (controllable inputs only).
- ✅ `expo-file-system` + `expo-notifications` config corrected; template cruft removed.
- ✅ Privacy policy page written → `docs/privacy.html` (just needs hosting, see §4).

**Remaining = all user-side, in order:**
1. CocoaPods install (§1)
2. First native build — proves the app compiles + runs (§2)
3. Host `docs/privacy.html` → get the URL (§4)
4. ASC record + metadata (§3)
5. Screenshots (§5)
6. Build + submit (§7)

Commerce (§6) is **deferred** — v1.0 is BYO-key-only by design. Do not wire StoreKit for the first submit.

## 1) Native iOS toolchain (one-time)

CocoaPods is the only blocker:
```sh
sudo gem install cocoapods --no-document
```

Then verify:
```sh
which pod && pod --version
```

## 2) First native build to simulator

```sh
cd "/Users/kgz/jiggo premium/JiggoMaxxing"
npx expo run:ios --device E517D738-0269-4270-BA09-925A11320E73   # iPhone 17 Pro Max (booted)
```

This will:
- Run `expo prebuild` (already done; `ios/` exists)
- `pod install` (needs the cocoapods you just installed)
- `xcodebuild` debug build for the simulator
- Install + open the app
- Start Metro

Expected first build: 3–5 min.

## 3) App Store Connect setup

Bundle ID is set to `com.jiggo.maxxing` in `app.json`.

```sh
# Create the bundle ID + ASC record
asc apps create --bundle-id com.jiggo.maxxing --name "JIGGO MAXXING" --primary-locale en-US

# Set categories
asc apps set-categories <appId> --primary HEALTH_AND_FITNESS --secondary LIFESTYLE

# Pull current metadata skeleton
asc metadata pull --bundle-id com.jiggo.maxxing
```

**Research-backed ASO (May 2026):**

Apple is not flagging the word *looksmaxxing* itself — rating/PSL/before-after imagery is what triggers 1.1/4.3 clusters. Keep the term out of *visible* metadata, capture its traffic in the hidden keyword field only.

- **Title (30 char max):** `JIGGO: Men's Edge Coach` (22)
- **Subtitle (30 char max):** `Discipline, Habits, Routine` (27)
- **Keywords (100 char, no dupes from title/subtitle):**
  `looksmax,grooming,self,improvement,glowup,style,physique,confidence,daily,tracker,routine`
- **Primary category:** Health & Fitness · **Secondary:** Lifestyle

**DE store listing:**
- **Title:** `JIGGO: Edge Coach für Männer`
- **Subtitle:** `Disziplin · Routine · Stil`

**First three lines of the description** (anchors anti-toxic positioning):
> JIGGO is the men's edge coach without the toxic playbook. No PSL scores. No before/after. No "looksmax tier." Just a private, on-device coach for grooming, physique, style, confidence, and discipline.

**Screenshot captions** (top of frame, 6 screenshots):
1. "No ratings. No comparisons. Just your edge."
2. "Twelve curated looks. Build your own."
3. "Six private dimensions. Local only."
4. "Switch your plan to fit the week."
5. "A coach with limits. Insight, never judgement."
6. "All your data. On your device."

## 4) Privacy policy URL

Apple requires a hosted URL. **The page is already written** — `docs/privacy.html`
in this repo. It matches the app's actual privacy behaviour (local-first, no
analytics, no accounts, Coach turns → Anthropic only).

Just host it. Fastest path:
```sh
# Option A — GitHub Pages (free)
#   1. push this repo to GitHub
#   2. Settings → Pages → deploy from /docs folder
#   3. URL becomes: https://<user>.github.io/<repo>/privacy.html

# Option B — any static host (Netlify drop, Vercel, Cloudflare Pages)
#   drag docs/privacy.html in, copy the URL
```
Paste the resulting URL into ASC → App Privacy → Privacy Policy URL.

## 5) Screenshots

Once the simulator is running:
```sh
asc screenshots frame --plan ./.asc/screenshots.json
asc screenshots upload --bundle-id com.jiggo.maxxing
```

Or use the `asc-shots-pipeline` skill to drive the simulator + frame.

Required sizes:
- 6.7" (iPhone 16 Pro Max / 17 Pro Max) — 1290×2796
- 6.1" (iPhone 16 / 17) — 1170×2532

Min 3 screenshots; recommend 6:
1. Home with Edge Index + nudge
2. Style → Looks (12 covers visible)
3. Scan detail with dimensions + actions
4. Plan with template chips
5. Coach in conversation
6. Insights

## 6) Commerce model — DEFERRED to v1.1 (do not wire for first submit)

**v1.0 ships BYO-Anthropic-key only.** The `/upgrade` screen exists and is
fully designed but is gated off via `lib/featureFlags.ts` → `PRO_ENABLED = false`.
Shipping a visible pricing flow with a stub purchase = guaranteed App Review
rejection (2.1 / 3.1.1). So the first submit has no paywall at all — the Coach
works when the user pastes their own key.

**For v1.1**, when you're ready to monetise:
1. Wire native StoreKit 2 (per `feedback_storekit_over_revenuecat.md` — no RevenueCat for a new iOS-only app).
2. Stand up an Anthropic proxy (Cloudflare Worker / Vercel Function, per-user rate limit ~60 turns/day) so Pro users don't need their own key.
3. Replace the stub in `app/upgrade.tsx`'s `start()` with the real purchase call.
4. Flip `PRO_ENABLED` to `true` — every Pro surface (Settings card, Coach-lock CTA, onboarding 'pro' step, /rituals + /insights CTAs) lights back up automatically.
5. Create the products in ASC: weekly $4.99 / yearly $39.99 / lifetime $79.99 (the `/upgrade` UI already renders this ladder).

Research backing the ladder (Adapty, RevenueCat 2025, Cal AI Superwall case): hard onboarding paywall ~$3.09 RPI by D14 vs $0.38 soft; annual at ~3.8× weekly anchors "Save 80%"; trial-to-paid 39.9% median in H&F.

## 7) Build + submit

```sh
# Bump build
asc apps set-build-number --bundle-id com.jiggo.maxxing --build 1

# Archive + export with the API-key altool path
xcodebuild -workspace ios/JiggoMaxxing.xcworkspace \
  -scheme JiggoMaxxing -configuration Release \
  -destination "generic/platform=iOS" \
  -archivePath build/JIGGO.xcarchive \
  -allowProvisioningUpdates archive

xcodebuild -exportArchive \
  -archivePath build/JIGGO.xcarchive \
  -exportPath build/ipa \
  -exportOptionsPlist ios/ExportOptions.plist

xcrun altool --upload-app -f build/ipa/JiggoMaxxing.ipa \
  --apiKey "$ASC_KEY_ID" --apiIssuer "$ASC_ISSUER"
```

Wait for processing (5–15 min), then submit via `asc apps submit`.

## Known pre-flight checks

- `app.json` version `1.0.0` ✓
- ITSAppUsesNonExemptEncryption: false ✓ (in app.json infoPlist)
- NSCameraUsageDescription / NSPhotoLibraryUsageDescription / NSPhotoLibraryAddUsageDescription ✓
- `expo-notifications` config plugin present ✓
- `expo-file-system` explicit dependency ✓
- Local-only data (no analytics, no accounts) ✓
- No visible purchase flow (PRO_ENABLED = false) — no 3.1.1 risk ✓
- Scan dimensions are controllable inputs only — no PSL/symmetry scoring ✓
- Privacy policy page written (`docs/privacy.html`) — needs hosting
- Privacy "nutrition label" publish must be done in ASC web UI (no public API)

## App Review notes (anticipate the reviewer)

If the reviewer questions the **scan** feature: it does not rate
attractiveness. The six dimensions are controllable inputs (skin, recovery,
grooming upkeep, brow upkeep, posture, hair upkeep), processed entirely
on-device, never uploaded, with no PSL/tier/ranking vocabulary anywhere. The
in-app `/why` essay and the onboarding pact both state this explicitly.

If the reviewer questions the **BYO API key**: the user supplies their own
Anthropic key, stored only in the device keychain, and pays Anthropic
directly — JIGGO is not reselling or proxying a paid service, so 3.1.1 does
not apply. The Coach is fully optional; the app is complete without it.
