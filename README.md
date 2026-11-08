# 🛒 FamCart

A shared grocery list for the whole family. Make a **circle**, invite everyone with a 6-letter code, and add or tick off items together. When someone buys something, it shows up as *"Bought by Dad · 5:42 pm"* on everyone's phone right away, so nobody buys it twice.

Built with Expo (React Native) and Firebase (Auth + Firestore), and runs on Android, iOS and web.

## Features
- Email sign-up / sign-in, password reset, and login that survives app restarts
- Profile with a name, emoji avatar and colour
- Circles: create, join with an invite code, share the code, see members, leave
- The circle owner can rename it, remove members, change the invite code, or delete it
- Multiple lists per circle (e.g. Weekly, Party, Medicines)
- Live items: add with an optional quantity, tap to tick off, see who added or bought each item and when
- Long-press (or ⋯) to edit an item's name, quantity or note, or to delete it
- "Bought" section that can be collapsed, plus *Clear bought*
- Adding an item that was already bought puts it back on the list instead of duplicating it
- Firestore security rules so only circle members can see a circle's lists, tested against the emulator

## 1. Set up Firebase (one time, ~5 min)
1. Go to <https://console.firebase.google.com> and **Add project** (e.g. `famcart`). Analytics isn't needed.
2. **Build → Authentication → Get started → Sign-in method → Email/Password → Enable.**
3. **Build → Firestore Database → Create database.** Pick a location near you (e.g. `asia-south1`) and start in **production mode**.
4. **Project settings (⚙️) → Your apps → Web (`</>`)**, register an app, and copy the `firebaseConfig` values.
5. In this folder, copy `.env.example` to `.env.local` and paste those values in.
6. Deploy the security rules:
   ```sh
   npx firebase login
   npx firebase deploy --only firestore:rules --project <your-project-id>
   ```
   (Or paste the contents of `firestore.rules` into **Firestore → Rules** in the console and click Publish.)

## 2. Run it on your phone
```sh
npm install
npx expo start
```
Install **Expo Go** from the Play Store or App Store and scan the QR code. Your phone and laptop need to be on the same Wi-Fi; if they aren't, use `npx expo start --tunnel`.

Press `w` in the terminal to open it in a browser too.

## 3. Build an installable Android app (APK)
```sh
npx eas-cli@latest login
npx eas-cli@latest init
# Give the cloud build your Firebase config (not secret, it identifies the project):
npx eas-cli@latest env:push preview --path .env.local
npx eas-cli@latest build --profile preview --platform android
```
When the build finishes you get a link. Open it on each Android phone to install. iPhones need an Apple Developer account for installable builds, so iPhone users can keep using Expo Go.

## Development
```sh
npm run typecheck     # TypeScript
npm run test:rules    # Firestore security rules tests (needs Java 21+)
```

## How the data is stored
```
users/{uid}                                   name, emoji, color, email
invites/{CODE}                                circleId  (lookup by exact code only)
circles/{circleId}                            name, ownerId, memberIds[], inviteCode
circles/{circleId}/lists/{listId}             name, createdBy
circles/{circleId}/lists/{listId}/items/{id}  name, qty, note, addedBy, checked, checkedBy, checkedAt
```
