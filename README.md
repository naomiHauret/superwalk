# superwalk

> A competitive steps-tracking game where walking more isn’t just about winning — it’s about outsmarting your opponents (and occasionally having them slip on a banana peel).

Entry for [Superhack 2024 hackathon](https://ethglobal.com/events/superhack2024).

**Superwalk** is an Android app that blends your regular step tracker with a party game that’s so fun and simple, you’ll want to play it with everyone — even your grandma.

The game runs for 24 hours, divided into 60-minute turns, during which each player's step count is automatically reported every 10 minutes.

At the beginning of every turn, players can earn new in-game items, as long as their step count increased compared to the previous turn. These items can be offensive, defensive, or have a boosting effect, with each items having their own success rate to keep the game fun and balanced.

During the first 15 minutes of each turn, players can decide to either use of their items to change the course of the competition, or bribe another user to cancel their attack.

Every players' step count resets veryday at 12 AM UTC+0, challenging them to keep a streak and trying out new strategies to climb in the leaderboard.

---

> This repository is monorepo for Superwalk products that relies on [bun workspaces](https://bun.sh/guides/install/workspaces) and [Turborepo](https://turbo.build/repo/docs). It was bootstrapped using Turborepo CLI.

You will find the following workspaces :

1. **Tooling**

2. **Internal packages**

3. **Applications and products**

# Get started

> Pre-requisites: have `node` (>=21.5.0), `bun`, [Android Studio](https://developer.android.com) and **Java 17** installed ; an Android device running version >=9 ; preferrably have the [Healthconnect](https://play.google.com/store/apps/details?id=com.google.android.apps.healthdata&hl=en_US) app installed on this device if you're using Android < 14

Install dependencies with `bun install`.

## Front-end

### Android app

> Make sure to read `apps/expo-android/README.md` for setup instructions first !

- Run `bun run android:start` to launch `@superwalk/expo-android` (Android app) on your device (if you're using a physical device, make sure to connect it to your computer via USB and activate debug mode)

## Smart contracts and ABIs

## Monorepo and development tasks

### How to...

1. Add dependency to a workspace :
   `cd` to the workspace and run `bun add <dependency name>`. Bun will detect that you are in a workspace and hoist the dependency as needed.

Example :

```bashrc
# add `tamagui` to the expo-android workspace

cd apps/expo-android && bun add tamagui
```

2. Launch a script in all workspaces where this script is defined: `turbo run <script name>`

Examples :

```bashrc
# run the `dev` script for all workspaces that have a `dev` script defined
turbo run dev
```

```bashrc
#  run the `build` script for all workspaces that have a `dev` script defined
turbo run build
```

3. Launch a script in specific workspaces only: `turbo run <task name> -F <workspaces>`

Examples :

```bashrc
# only run the `dev` script of the @superwalk/webapp workspace
turbo run dev -F @superwalk/webapp
```

```bashrc
# only run the `build` script of the @superwalk/expo-android workspace
turbo run build -F @superwalk/expo-android
```

4. Format code : simply use `bun run format`

---

## Recommended resources

- [Turborepo examples](https://github.com/vercel/turbo/tree/main/examples)
- [Turborepo monorepo handbook](https://turbo.build/repo/docs/handbook/dev)
