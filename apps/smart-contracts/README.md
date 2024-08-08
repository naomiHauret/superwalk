# @superwalk/smart-contracts

Smart contracts for Superwalk, a turn-based game that uses the players' real world step count to influence the competition.

## Features

- **On-chain track records**: from the moment they join, the actions of every players are recorded in the blockchain, ensuring complete traceability from one hand, and an easy access to the leaderboard from another ;
- **Turn-based gameplay**: The game operates in turns, with specific actions and events occurring within defined time windows.
- **Corruption as a gameplay mechanic**: players can cancel out the attack of another player by bribing them via a simple ERC20 transfer from the briber to the bribee, with the bribe being proportional to the briber's step count (the higher the steps, the higher the bribe will be) ;
- **Weighted randomness**: the smart contract integrates [Pyth Network Entropy](https://docs.pyth.network/entropy) to ensure fair randomness for item picking and action outcomes, insuring that even though some outcomes are more likely to occur, the RNG can still change the game ;

## Gameplay

### Overview

The game continuously runs for 24 hours, divided into 60-minute turns, during which each player's step count is automatically reported every 10 minutes, with an automatic reset for every player everyday.

At the beginning of every turn, players can earn new in-game items, as long as their step count increased compared to the previous turn. These items can be offensive, defensive, or have a boosting effect, with each items having their own success rate to keep the game fun and unpredictable.

During the first 20 minutes of each turn, players can decide to either use of their items to change the course of the competition, or bribe another user to cancel their attack.

### Game mechanics breakdown

- Turns: Each turn lasts 1 hour, during which players can perform actions or pick items. The game operates in a turn-based manner, and the turn number is incremented by the contract owner.

- Inventory & item airdrop: Players can pick a random item if they have taken at least 100 steps more than their last step count, provided their inventory is not full.

- Actions: Players can perform actions such as using items, blocking, or bribing other players. Actions are subject to a **cooldown period** and can only be performed **within a specific time window**.

- Time constraints: All actions (getting a new item, bribing, using an object, blocking attacks) are subject to **time constraints** and can only be performed **within a specific time window**, the 20 first minutes of each turn.

## Functions Overview

- `createGameItemType`: Creates a new game item that players can use.
- `joinCompetition`: Allows a player to join the competition.
- `pickItem`: Allows a player to pick a random item at the beginning of a turn.
- `performAction`: Allows a player to perform an action (`UseItem`, `Block`, `Bribe`) during the action window.
- `reportSteps`: Updates a player's step count.
- `endTurn`: Advances the game to the next turn.
- `reportScore`: Updates a player's score.

## Events

The contract emits several events to track its state and interactions:

- `GameItemCreated`: Emitted when a new game item is created.
- `PlayerJoined`: Emitted when a player joins the competition.
- `StepsCountReported`: Emitted when a player's steps are reported.
- `PerformActionRequested`: Emitted when a player requests to perform an action.
- `ScoreUpdated`: Emitted when a player's score is updated.
- `TurnEnded`: Emitted when a turn ends.
- `BribeSent`: Emitted when a bribe is sent from one player to another.
- `ItemPicked`: Emitted when a player successfully picks a random item.
- `ItemUsed`: Emitted when a player uses an item.
- `ItemPickRequested`: Emitted when a player requests to pick an item.

---

> This project was bootstrapped using `thirdweb create contract`. Read more on [Thirdweb documentation](https://portal.thirdweb.com/contracts/build/get-started).

## Getting Started

Create a project using this example:

```bash
npx thirdweb create --contract --template hardhat-javascript-starter
```
To add functionality to your contracts, you can use the `@thirdweb-dev/contracts` package which provides base contracts and extensions to inherit. The package is already installed with this project. Head to Thirdweb [Contracts Extensions Docs](https://portal.thirdweb.com/contractkit) to learn more.

## Building the project

After any changes to the contract, run:

```bash
npm run build
# or
yarn build
```

to compile your contracts. This will also detect the [Contracts Extensions Docs](https://portal.thirdweb.com/contractkit) detected on your contract.

## Deploying Contracts

When you're ready to deploy your contracts, just run one of the following command to deploy your contracts:

```bash
npm run deploy
# or
yarn deploy
```

## Releasing Contracts

If you want to release a version of your contracts publicly, you can use one of the followings command:

```bash
npm run release
# or
yarn release
```

## Join our Discord!

For any questions, suggestions, join Thirdweb discord at [https://discord.gg/thirdweb](https://discord.gg/thirdweb).
