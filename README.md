# AlgoDeck 🧠

A spaced-repetition flashcard app for mastering LeetCode patterns. Built with React Native (Expo), TypeScript, and SQLite.

![AlgoDeck Banner](https://via.placeholder.com/1200x600.png?text=AlgoDeck+Banner)

## Features

- 🃏 **Spaced Repetition (SM-2)**: Smart algorithm schedules reviews based on your performance.
- 📱 **Mobile First**: Built for iOS and Android with a polished, dark-themed UI.
- 📷 **OCR Question Import**: Snap a photo of a problem statement to import it instantly.
- 👨‍💻 **Syntax Highlighting**: Beautiful code snippets for Python, Java, and C++.
- 🏷️ **Tagging System**: Organize by pattern (e.g., "Two Pointers", "DFS") or difficulty.
- 🌙 **Dark Mode**: sleek UI matching modern developer aesthetics.
- 💾 **Local First**: Offline-capable with SQLite database and local image storage.
- 📤 **Export/Import**: Backup your progress to JSON or Markdown.

## Tech Stack

- **Framework**: React Native (Expo SDK 54)
- **Language**: TypeScript
- **Database**: SQLite (via `expo-sqlite`)
- **State Management**: Zustand
- **Navigation**: React Navigation (Bottom Tabs + Native Stack)
- **OCR**: Tesseract.js
- **Storage**: AsyncStorage + Expo FileSystem

## Getting Started

### Prerequisites

- Node.js (LTS)
- npm or yarn
- Android Studio (for Android emulator) or Xcode (for iOS simulator)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/algodeck.git
   cd algodeck
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npx expo start
   ```

### Running on Android

To run the native Android build (required for SQLite/OCR performance):

1. Ensure Android Studio is installed and an emulator is created/running.
2. Run:
   ```bash
   npx expo run:android
   ```

### Running on Web

AlgoDeck has limited web support (OCR disabled on web for stability).

```bash
npx expo start --web
```

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License

[MIT](LICENSE)
