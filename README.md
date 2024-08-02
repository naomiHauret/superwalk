# superwalk

> A competitive steps-tracking game where walking more isn’t just about winning — it’s about outsmarting your opponents (and occasionally having them slip on a banana peel).

Entry for [Superhack 2024 hackathon](https://ethglobal.com/events/superhack2024).

**Superwalk** is an Android app that blends your regular step tracker with a party game that’s so fun and simple, you’ll want to play it with everyone — even your grandma.

The game runs for 24 hours, divided into 60-minute turns, during which each player's step count is automatically reported every 10 minutes.

At the beginning of every turn, players can earn new in-game items, as long as their step count increased compared to the previous turn. These items can be offensive, defensive, or have a boosting effect, with each items having their own success rate to keep the game fun and balanced.

During the first 15 minutes of each turn, players can decide to either use of their items to change the course of the competition, or bribe another user to cancel their attack.

Every players' step count resets veryday at 12 AM UTC+0, challenging them to keep a streak and trying out new strategies to climb in the leaderboard.

---

> This repository is monorepo for Superwalk products that relies on [pnpm workspaces](https://pnpm.sh/guides/install/workspaces) and [Turborepo](https://turbo.build/repo/docs). It was bootstrapped using Turborepo CLI.

You will find the following workspaces :

1. **Tooling**

2. **Internal packages**

3. **Applications and products**

# Get started

> Pre-requisites: have `node` (>=21.5.0) and `pnpm` installed

## Front-end

### Android app

### Webapp

### Docs

## Smart contracts and ABIs

## Monorepo and development tasks

### How to...

1. Install a package in a specific workspace: `pnpm -F <workspace> add <package name(s)>`

Example:

```bashrc
# install the package `@wagmi/core` in @superwalk/webapp
pnpm -F @superwalk/webapp add @wagmi/core
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

4. Format code : `pnpm run format`

---

## Recommended resources

- [Turborepo examples](https://github.com/vercel/turbo/tree/main/examples)
- [Turborepo monorepo handbook](https://turbo.build/repo/docs/handbook/dev)
