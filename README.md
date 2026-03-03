<p align="center">
  <img src="assets/logo.png" width="140" alt="AlgoDeck Logo" />
</p>

<h1 align="center">AlgoDeck</h1>

<p align="center">
  <strong>Master LeetCode patterns with spaced repetition.</strong><br/>
  A beautiful, offline-first flashcard app built for developers preparing for coding interviews.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/platform-Android-3ddc84?logo=android&logoColor=white" />
  <img src="https://img.shields.io/badge/built_with-React_Native-61dafb?logo=react&logoColor=white" />
  <img src="https://img.shields.io/badge/Expo_SDK-54-000020?logo=expo&logoColor=white" />
  <img src="https://img.shields.io/badge/language-TypeScript-3178c6?logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/license-MIT-green" />
</p>

---

## 📲 Download

Head to the [**Releases**](../../releases) page to grab the latest APK and install it directly on your Android device.

> No Play Store needed — just download, install, and start reviewing.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🧠 **Spaced Repetition (SM-2)** | Smart scheduling with customizable intervals — Again, Hard, Good, Easy |
| 📓 **Notebooks** | Color-coded collections to organize questions by topic or study plan |
| 💻 **Tiered Solutions** | Store Brute Force 🐢, Optimized ⚡, and Best 🚀 solutions per question |
| 🎨 **Syntax Highlighting** | Beautiful code rendering for Python, Java, and C++ |
| 🔍 **Full-Text Search** | Instant FTS5-powered search across all questions and tags |
| 📷 **OCR Import** | Snap a screenshot of a problem and extract text automatically |
| 🖼️ **Zoomable Images** | Pinch-to-zoom on attached screenshots |
| 🔄 **Fullscreen Code** | Expand any code block to fullscreen with landscape rotation support |
| ⭐ **Starred Questions** | Bookmark important problems for quick access |
| 📊 **Statistics** | Track streaks, review counts, rating breakdowns, and weekly activity |
| 🔔 **Daily Reminders** | Schedule push notifications to stay consistent |
| 📦 **Export / Import** | Full ZIP backup with images — share across devices or keep a backup |
| 🌙 **Dark & Light Mode** | Gorgeous themes that match your preference |
| 📳 **Haptic Feedback** | Tactile response on interactions for a polished feel |
| 🔒 **Offline First** | Everything stored locally in SQLite — no account, no internet needed |

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | [React Native](https://reactnative.dev/) via [Expo SDK 54](https://expo.dev/) |
| **Language** | [TypeScript](https://www.typescriptlang.org/) |
| **Database** | [SQLite](https://www.sqlite.org/) with FTS5 (via `expo-sqlite`) |
| **State** | [Zustand](https://zustand-demo.pmnd.rs/) |
| **Navigation** | [React Navigation](https://reactnavigation.org/) — Bottom Tabs + Native Stack |
| **OCR** | [react-native-mlkit-ocr](https://github.com/nicholasgasior/react-native-mlkit-ocr) |
| **Storage** | AsyncStorage + Expo FileSystem |
| **Notifications** | [expo-notifications](https://docs.expo.dev/versions/latest/sdk/notifications/) |
| **Haptics** | [expo-haptics](https://docs.expo.dev/versions/latest/sdk/haptics/) |
| **Orientation** | [expo-screen-orientation](https://docs.expo.dev/versions/latest/sdk/screen-orientation/) |

---

## 📁 Project Structure

```
src/
├── components/        # Reusable UI components
│   ├── CodeBlock       — Syntax-highlighted code with fullscreen viewer
│   ├── FlashCard       — Flip card for revision sessions
│   ├── QuestionCard    — Question list item card
│   ├── SearchBar       — Full-text search input
│   ├── SolutionTabs    — Tabbed solution viewer (Brute/Optimized/Best)
│   ├── SyntaxHighlighter — Token-based code colorizer
│   └── TagChip         — Tag badge component
├── db/                # Database layer
│   ├── schema          — Table definitions & migrations
│   ├── database        — Connection & initialization
│   ├── questionService — CRUD for questions
│   ├── solutionService — CRUD for solutions
│   ├── revisionService — Review log operations
│   └── notebookService — Notebook management
├── screens/           # App screens
│   ├── Dashboard       — Home with stats, notebooks, quick actions
│   ├── Browse          — Search & filter all questions
│   ├── Revision        — Flashcard review session
│   ├── QuestionDetail  — Full question view with solutions
│   ├── AddQuestion     — Create questions with OCR
│   ├── AddSolution     — Add tiered solutions with code
│   ├── Settings        — Preferences, reminders, intervals
│   └── Stats           — Analytics & activity tracking
├── services/          # Business logic
│   ├── sm2             — SM-2 algorithm implementation
│   ├── sm2Intervals    — Customizable interval settings
│   ├── exportService   — ZIP export with images
│   ├── importService   — Smart import with notebook merge
│   ├── haptics         — Haptic feedback wrapper
│   ├── notificationService — Reminder scheduling
│   └── ocr             — Text extraction from images
├── store/             # Zustand state stores
│   ├── useQuestionStore
│   ├── useRevisionStore
│   ├── useNotebookStore
│   └── useThemeStore
├── theme/             # Theming
│   ├── theme           — Colors, typography, spacing
│   └── useAppTheme     — Dark/light mode hook
├── types/             # TypeScript type definitions
└── navigation/        # React Navigation setup
```

---

## 🚀 Building from Source

### Prerequisites

- **Node.js** (LTS recommended)
- **Java 17** (required for Android builds — [SDKMAN](https://sdkman.io/) recommended)
- **Android SDK** (via Android Studio or standalone)

### Setup

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/AlgoDeck.git
cd AlgoDeck

# 2. Install dependencies
npm install

# 3. Set Java 17 (if using SDKMAN)
sdk use java 17.0.13-tem   # or your installed 17.x version

# 4. Generate native Android project
npx expo prebuild --platform android --clean

# 5. Build a release APK
cd android && ./gradlew assembleRelease

# The APK will be at:
# android/app/build/outputs/apk/release/app-release.apk
```

### Development

```bash
# Start the Expo dev server
npx expo start

# Run on a connected Android device / emulator
npx expo run:android

# Run the web version in a browser
npx expo start --web
# or build a production static bundle:
npm run build:web
```

> **Note:** This is an Expo dev-client project. Features like SQLite, OCR, and haptics require a native build — Expo Go will not work.

### Web Version

The web version runs entirely in the browser using `localStorage` instead of SQLite. It supports the full question/solution editing workflow and exports in the same **v3 `.algodeck`** format, so you can:

1. Create and manage flashcards on **web** → click **Export** (Settings tab) → downloads an `.algodeck` file
2. Open the **mobile app** → Settings → Import → pick the `.algodeck` file → all your cards appear instantly

Features disabled on web (native-only): push notifications, haptic feedback, screen rotation lock.

---

## 📸 Screenshots

<!-- Add your screenshots here -->
<!-- <img src="assets/screenshots/dashboard.png" width="250" /> <img src="assets/screenshots/revision.png" width="250" /> <img src="assets/screenshots/browse.png" width="250" /> -->

*Coming soon — feel free to contribute screenshots!*

---

## 🤝 Contributing

Contributions are welcome! If you have ideas for new features or find a bug:

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

<p align="center">
  <sub>Built with ☕ and spaced repetition.</sub>
</p>
