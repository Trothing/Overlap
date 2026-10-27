# Overlap

Add people with their time zones, see each person's day on one shared axis, find the best call windows, and share the chosen slot. React Native (Expo SDK 58), Android and iOS.

The plan is in [PLAN.md](PLAN.md). A clickable HTML prototype of the screens is in [design/](design/index.html).

## Screens

The app has two themes, Ink and steel (dark) and Paper (light). Settings has a Theme control; System, the default, follows the device. Captured from the web build at 390 by 844 (2x); native captures from a device are still to be added.

| | Timeline | Slot | Edit person |
| --- | --- | --- | --- |
| Dark | ![Timeline dark](docs/screenshots/dark/01-timeline.png) | ![Slot dark](docs/screenshots/dark/02-slot.png) | ![Edit person dark](docs/screenshots/dark/03-edit-person.png) |
| Light | ![Timeline light](docs/screenshots/light/01-timeline.png) | ![Slot light](docs/screenshots/light/02-slot.png) | ![Edit person light](docs/screenshots/light/03-edit-person.png) |

| | People | Settings | Slot page on the web |
| --- | --- | --- | --- |
| Dark | ![People dark](docs/screenshots/dark/04-people.png) | ![Settings dark](docs/screenshots/dark/05-settings.png) | ![Slot page dark](docs/screenshots/dark/06-web-slot.png) |
| Light | ![People light](docs/screenshots/light/04-people.png) | ![Settings light](docs/screenshots/light/05-settings.png) | ![Slot page light](docs/screenshots/light/06-web-slot.png) |

## Saved calls

From the slot sheet, **Save as weekly call** stores the weekday and time (in your time zone), the length and the people. The Calls tab lists each call with its next occurrence in everyone's local time, and shows a heads-up when a clock change will move the call for someone (`From Sun 1 Nov, your usual call time is 1 h earlier for Max`). Each call can have a local reminder 10, 30 or 60 minutes before, scheduled as a weekly notification on the device (`expo-notifications`). Reminders need notification permission and are not available in the web build. A call's time is fixed when it is saved; to change it, remove it and save a new one.

## City search

People are added by searching any populated place, from capitals to villages. The app queries the Open-Meteo geocoding service (place data from GeoNames, free for non-commercial use, attribution required) in English, Ukrainian and Spanish at once, so a name typed in one language finds the place named in any of them. Results are ordered by population and show the district, region and country so places with the same name can be told apart. The chosen place is stored with its name in the interface language and its time zone. Only the text typed in the field is sent. Without a connection the field falls back to a built-in list of about thirty cities.

## How suggestions work

Best times are the three highest-scoring slots in the next seven days, at least three hours apart, in the call length chosen in Settings. Each person gets a comfort value for every 15 minutes of the slot: working hours score 0.8 to 1 (highest in the middle of their shift), evening 0.5, late 0.2, asleep or day off 0. A slot scores 65% on its least comfortable person and 35% on the average, so a time that suits everyone beats one that is perfect for one person. When nobody can avoid a bad hour the list shows the least bad slots and says who is affected.

## Clock change notices

For each person the app compares their offset from yours over the next 14 days. When the gap changes it shows when, and how much earlier or later your usual call time lands for them. A slot sheet shows the same note when the chosen date is after a change. The notice covers both cases: the other person's clocks moving, and yours.

## Run

```bash
npm install
npx expo start
```

Open the project on a phone with Expo Go, or press `a` for an Android emulator.

## Time zone check on Hermes

The app ships a screen that runs the date logic directly on the device engine. From the home screen press **Run time zone check**. It reports the engine, the device zone, whether `Intl.supportedValuesOf` works, and passes or fails each of these cases:

- daylight saving changes in the US and the EU, one minute either side;
- quarter-hour and half-hour offsets (Kathmandu, Kolkata, Chatham Islands, Lord Howe);
- the length of a day on a change day (23 and 25 hours);
- unknown zones, the `Europe/Kiev` alias, and Ukrainian and Spanish labels.

The same cases run in Jest on Node, where all of them pass. The result on Hermes decides whether the domain code keeps using `Intl` directly or switches to a time library.

## Build for a phone

Expo Go is slower than a real build and does not register the `overlap://` scheme. To test a real build:

**Locally (no EAS account).** Install Android Studio (SDK, platform-tools and its bundled JDK), set `ANDROID_HOME` and `JAVA_HOME` (Android Studio's `jbr` folder), turn on USB debugging on the phone and connect it. Then:

```powershell
$env:EXPO_PUBLIC_APP_ENV = "dev"; npm run android:release
```

The first build takes 10 to 20 minutes. The APK is also left in `android/app/build/outputs/apk/release/`.

**In the cloud (EAS).** `eas login`, then `eas build --platform android --profile preview`. The profile in `eas.json` sets `EXPO_PUBLIC_APP_ENV=dev`, because `.env` is not uploaded.

The app id is `com.trothing.overlap`.

## Scripts

| Command | What it does |
| --- | --- |
| `npm test` | Jest for the domain logic in `src/domain` |
| `npm run typecheck` | `tsc --noEmit` |
| `npx expo-doctor` | Project health checks |

## Structure

```
app/            screens (expo-router): tabs for Timeline, Calls, People, Settings, plus the slot sheet and the person and call editors
src/domain/     pure logic, no React: time zones, statuses, window search, share text, slot links, .ics
src/features/   timeline panel with the cursor gesture, saved call reminders, calendar and file sharing for slots
src/i18n/       English, Ukrainian and Spanish strings and formatters
src/store/      zustand store persisted in AsyncStorage
src/ui/         design tokens and base components
design/         clickable prototype
web/            static page for shared slot links (see web/README.md)
```

Slot links depend on `EXPO_PUBLIC_APP_ENV` in `.env` (copy `.env.example`): `expogo` copies an `exp://` link for testing in Expo Go, while `dev`, `stage` and `prod` copy the web page address set in `EXPO_PUBLIC_SHARE_URL_DEV`, `..._STAGE` or `..._PROD`, or an `overlap://` link when that address is empty. Restart Metro with `npx expo start -c` after changing `.env`.
