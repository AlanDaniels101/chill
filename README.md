# Chill – Hangouts

**Sustain meaningful connections.**

Chill is a mobile app for organizing casual hangouts within friend groups. It removes the social pressure of coordinating plans by letting people express interest anonymously — no one sees who's interested until enough people are in. Groups can create hangout events, vote on times with polls, share invite links, and get notified when plans come together.

Available on the [App Store](https://apps.apple.com/us/app/chill-hangouts/id6744852495). Android support is in closed beta.

Licensed under the [MIT License](LICENSE).

---

## Features

- 👥 **Friend groups** — Create and manage groups, invite members via QR code or shareable link.
- 🎉 **Hangout events** — Propose hangouts within a group with a title, description, date, and location.
- 🕵️ **Anonymous interest** — Express interest in a hangout anonymously; identity is only revealed to the organizer once a quorum is reached.
- 🗳️ **Time polls** — When a date isn't set, create a poll to find a time that works for everyone.
- 🔔 **Push notifications** — Get notified about new hangouts, poll closings, and other group activity.
- 📅 **Calendar integration** — Add confirmed hangouts directly to your device calendar.
- 📷 **QR code invites** — Invite people to a group by scanning a QR code generated in-app.
- 🔗 **Deep links** — Open hangout details or join a group directly from a shared URL.
- 🗺️ **Maps integration** — Tap a hangout location to open it directly in your device's maps app.
- 🖼️ **Group icons** — Customize each group with a preset icon or a custom image URL.

### Under the hood

- 🧭 **Navigation** — File-based routing via Expo Router; a tab navigator for the main sections with a stack navigator nested inside for group and hangout detail screens.
- 📱 **Firebase Auth** — Phone number sign-in via SMS verification.
- 🛡️ **Firebase App Check** — Device integrity verification to protect backend resources from abuse.
- ⚡ **Firebase Realtime Database** — Live data sync across all connected clients.
- 📣 **Firebase Cloud Messaging (FCM)** — Push notification delivery.
- 🔗 **Universal Links / App Links** — Native deep link handling on iOS and Android.
- 🔒 **Firebase Database Security Rules** — Server-enforced access control ensuring users can only read and write data they are authorized to access (e.g. group membership checks, hangout visibility).
- 🧪 **Unit tests** — Security rules are covered by a Jest test suite (`tests/database.rules.test.ts`) that runs against the Firebase emulator, verifying that data access is correctly allowed or denied for different user contexts.

---

## Website

The [chillhangouts.ca](https://chillhangouts.ca) website is hosted via GitHub Pages and lives in the [`docs/`](docs/) directory. It is built with Jekyll using the default minima theme.

| Page | URL | Purpose |
|------|-----|---------|
| Home | `chillhangouts.ca` | App description and support links |
| App | `chillhangouts.ca/app` | Deep link landing page — prompts users to open or download the app |

The `docs/.well-known/` directory contains:
- `apple-app-site-association` — enables Universal Links on iOS
- `assetlinks.json` — enables App Links on Android

To preview the site locally:

```bash
cd docs
python3 -m http.server 4000
```

Then open `http://localhost:4000`.

---

## Contributing

Contributions are welcome. Please submit a PR or open a [GitHub issue](https://github.com/AlanDaniels101/chill/issues) to discuss.

### Prerequisites

- [Node.js](https://nodejs.org/) (LTS)
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- [EAS CLI](https://docs.expo.dev/eas/) — for building and submitting
- A Firebase project with Authentication, Realtime Database, App Check, and Cloud Messaging enabled
- `GoogleService-Info.plist` (iOS) and `google-services.json` (Android) placed at the project root

### Getting started

```bash
git clone https://github.com/AlanDaniels101/chill.git
cd chill
npm install
npx expo start
```

Use Expo development builds for hot-reload and fast iteration. Otherwise, use preview/production builds.

Tested on the following devices:

* Pixel 9 Pro Emulator (API ver 35)
* iPhone 15 Pro Max (iOS ver 26.3.1)
* Galaxy A17 (Android ver 16)

### Building

Preview and production builds are managed via EAS:

```bash
# Android preview build
eas build --platform android --profile preview

# iOS preview build
eas build --platform ios --profile preview
```

### Firebase Functions

See [`functions/README.MD`](functions/README.MD) for setup and deployment instructions for the backend Cloud Functions.

### Testing

Database security rules are tested with the Firebase emulator:

```bash
npm test
```
