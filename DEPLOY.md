# JIGGO MAXXING — App Store Deploy Playbook

Commands you (the user) need to run at the terminal. JS-side is complete and tsc + web-export clean.

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

Then ASO-friendly name + keywords. Suggested:
- **Name:** `JIGGO MAXXING: Edge Coach`
- **Subtitle:** `Grooming, physique, style, calm.`
- **Keywords:** `looksmaxxing,grooming,style,confidence,coach,habit,journal,wellness,routine,men`
- **Primary cat:** Health & Fitness · **Secondary:** Lifestyle

## 4) Privacy policy URL

Apple requires a hosted URL. Options:
- Add a `/why` static page to `meloxkgz.github.io/jiggo-maxxing/privacy.html` containing the same essay-form copy as `app/why.tsx`.
- Or use a one-page generator like `https://app-privacy-policy-generator.firebaseapp.com/`.

The in-app essay at `/why` is your source of truth. Mirror it to the URL.

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

## 6) Commerce model — DECIDE BEFORE METADATA

Coach currently uses **bring-your-own Anthropic API key** (stored in Keychain). Apple may treat this as:
- (a) acceptable — same as Things/Bear allowing local-only — BUT
- (b) risky — "third-party AI service" with no IAP

Two paths:

### Path A — Stay BYO-key (simpler, niche)
Mention "your own API key" in description + screenshot. App is free, no IAP.

### Path B — Add native StoreKit 2 subscription proxy (commercial)
- Server-side function relaying to Anthropic with rate limits
- StoreKit 2 weekly + yearly subscriptions ($4.99wk / $39.99yr suggested per `feedback_wellness_app_pricing.md`)
- Hide the BYO key option behind a "I have my own key" advanced toggle in Settings
- Larger scope — 2–3 days work

Recommendation: ship as **Path A** first, learn from Review, then iterate to Path B once revenue justifies the proxy infra.

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

- ITSAppUsesNonExemptEncryption: false  ✓ (in app.json infoPlist)
- NSCameraUsageDescription ✓
- NSPhotoLibraryUsageDescription ✓
- Local-only data (no analytics, no accounts) ✓
- Privacy publish must be done in ASC web UI (no public API)
