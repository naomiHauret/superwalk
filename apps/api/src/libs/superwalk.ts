import {
  getContract,
  prepareContractCall,
  sendBatchTransaction,
  sendTransaction,
  waitForReceipt,
} from 'thirdweb'
import { thirdwebClient } from './thirdweb'
import { baseSepolia, optimismSepolia } from 'thirdweb/chains'
import { privateKeyToAccount, smartWallet } from 'thirdweb/wallets'

enum StepCountReportSource {
  self = 'SELF',
  // other source of step count would include HealthConnect dataOrigin
  // eg: com.fitbit.FitbitMobile
  // since the HealthConnect API doesn't properly return the recording method
  // we have to rely on the device sensor to record steps
  // not ideal, but there's no other choice if we want to insure a fair game
}

enum GameItemEffectType {
  OFFENSIVE = 0,
  DEFENSIVE = 1,
  BOOST = 2,
}

enum GameItemEffectValueType {
  PERCENT = 0,
  ABSOLUTE = 1,
}

/**
 * @param chainId ID of chain on which the SuperwalkCompetition contract is deployed
 * @returns SuperwalkCompetition contract on which to perform read/write operations
 */
function getCompetitionSmartContract(chainId: number) {
  let chain = baseSepolia
  let address
  switch (chainId) {
    case baseSepolia.id:
      chain = baseSepolia
      address = '0x716cD40b5C33C261D9318Bf80d5cdF5503Ff320e'
      break
    case optimismSepolia.id:
      chain = optimismSepolia
      address = '0x716cD40b5C33C261D9318Bf80d5cdF5503Ff320e'
      break
  }
  return getContract({
    client: thirdwebClient,
    chain: chain,
    address: address as string,
  })
}

/**
 * Get Game Master smart wallet
 * @param chainId chain on which the game master account factory is available
 * @returns game master smart account that can perform specific write operation on Superwalk smart contract
 */
async function getGameMaster(chainId: number) {
  const backendWallet = privateKeyToAccount({
    client: thirdwebClient,
    privateKey: process.env.BACKEND_WALLET_PK as string,
  })
  let chain = baseSepolia
  let factoryAddress = '0x22e1b4C215ad327BfcB6383A132FC02fb2fCAEf6' // Factory address is the same on all chain
  switch (chainId) {
    case baseSepolia.id:
      chain = baseSepolia
      break
    case optimismSepolia.id:
      chain = optimismSepolia
      break
  }
  const wallet = smartWallet({
    chain,
    factoryAddress,
    sponsorGas: false,
  })

  const smartAccountGameMaster = await wallet.connect({
    client: thirdwebClient,
    personalAccount: backendWallet, // pass the admin account
  })

  return smartAccountGameMaster
}

export type RecordLastStepsCount = { player: string; updated_count: number }

/**
 * Updates the step count of all players with the most recent data from the database. Batch transaction to be more efficient.
 * @param records database records of most recent steps count update per each player today
 * @param chainId chain on which to perform the update
 */
async function batchUpdateAllPlayersStepsCount(
  records: Array<{ player: string; updated_count: number }>,
  chainId: number,
) {
  try {
    const contract = getCompetitionSmartContract(chainId)
    const writeOperations = records.map((record) => {
      return prepareContractCall({
        contract,
        method: 'function reportSteps(address _player,uint256 updatedStepsCount)',
        params: [record.player, BigInt(record.updated_count)],
      })
    })
    const transactions = writeOperations
    const account = await getGameMaster(chainId)
    const receipt = await sendBatchTransaction({
      transactions,
      account,
    })

    const txResult = await waitForReceipt(receipt)
    return txResult
  } catch (error) {
    console.error('something went wrong:')
    console.error(error)
  }
}

/**
 * Calculate scores of each player by applying the modifiers casted this turn to the difference of their current step count and last turn step count
 * @param turnLogs - subgraph log of the actions of the turn to calculate the score for
 */
function calculateScores(turnLogs: {
  stepsCountReporteds: Array<{
    turnNumber: number
    player: string
    steps: number
    previousTurnSteps: number
    timestamp_: number
  }>
  gameItemCreateds: Array<{
    itemId: number
    effectValue: number
    effectType: number
    effectValueType: number
  }>
  itemUseds: Array<{
    itemId: number
    player: string
    targetPlayer?: null | string
    turnNumber: number
  }>
  blockeds: Array<{
    player: string
  }>
  bribeSents: Array<{
    toPlayer: string
    fromPlayer: string
    amount: number
  }>
}) {
  const scores = {}

  const stepsReporteds = turnLogs.stepsCountReporteds
  const itemUseds = turnLogs.itemUseds
  const blockeds = turnLogs.blockeds
  const bribeSents = turnLogs.bribeSents

  // Initialize player scores based on step counts
  stepsReporteds.forEach((report) => {
    const player = report.player
    const currentSteps = report.steps
    const previousSteps = report.previousTurnSteps
    const baseScore = currentSteps - previousSteps
    scores[player] = {
      baseScore: baseScore,
      currentSteps,
      finalScore: currentSteps,
      modifiers: [],
    }
  })

  // Apply item effects
  itemUseds.forEach((itemUsed) => {
    const player = itemUsed.player
    const targetPlayer = itemUsed.targetPlayer
    const itemId = itemUsed.itemId

    const gameItem = turnLogs.gameItemCreateds.find((item) => item.itemId === itemId)
    const effectType = gameItem?.effectType
    const effectValue = gameItem?.effectValue
    const effectValueType = gameItem?.effectValueType

    if (effectType === GameItemEffectType.BOOST && player in scores) {
      const boost =
        effectValueType === GameItemEffectValueType.PERCENT
          ? scores[player].baseScore * (effectValue!! / 100)
          : effectValue
      scores[player].finalScore += boost
    }

    if (effectType === GameItemEffectType.OFFENSIVE && targetPlayer!! in scores) {
      const malus =
        effectValueType === GameItemEffectValueType.PERCENT
          ? scores[targetPlayer].baseScore * (effectValue!! / 100)
          : effectValue
      scores[targetPlayer].finalScore -= malus
      scores[targetPlayer].modifiers.push({ type: 'attack', player })
    }
  })

  // Apply bribe effects
  bribeSents.forEach((bribe) => {
    const fromPlayer = bribe.fromPlayer
    const toPlayer = bribe.toPlayer

    if (toPlayer in scores) {
      // Remove effects of attacks from the player who was bribed
      scores[toPlayer].modifiers = scores[toPlayer].modifiers.filter(
        (modifier) => modifier.type !== 'attack' || modifier.player !== fromPlayer,
      )
    }
  })
  return scores
}

/**
 * Updates the scores of all players based on the different actions during this turn
 * @param records database records of most recent actions
 * @param chainId chain on which to perform the update
 */
async function batchUpdateAllPlayersScores(
  data: {
    [player: string]: {
      baseScore: number
      currentSteps: number
      finalScore: number
    }
  },
  chainId: number,
) {
  try {
    const contract = getCompetitionSmartContract(chainId)
    const writeOperations = Object.keys(data).map((player) => {
      return prepareContractCall({
        contract,
        method: 'function reportScore(address _player,uint256 updatedStepsCount)',
        params: [player, BigInt(data[player].finalScore)],
      })
    })
    const transactions = writeOperations
    const account = await getGameMaster(chainId)
    const receipt = await sendBatchTransaction({
      transactions,
      account,
    })

    const txResult = await waitForReceipt(receipt)
    return txResult
  } catch (error) {
    console.error('something went wrong:')
    console.error(error)
  }
}

/**
 * Updates the scores of all players based on the different actions during this turn
 * @param records database records of most recent actions
 * @param chainId chain on which to perform the update
 */
async function endTurn(chainId: number) {
  try {
    const contract = getCompetitionSmartContract(chainId)
    const transaction = await prepareContractCall({
      contract,
      method: 'function endTurn()',
      params: [],
    })
    const account = await getGameMaster(chainId)
    const receipt = await sendTransaction({
      transaction,
      account,
    })

    const txResult = await waitForReceipt(receipt)
    return txResult
  } catch (error) {
    console.error('something went wrong:')
    console.error(error)
  }
}

export {
  StepCountReportSource,
  batchUpdateAllPlayersStepsCount,
  endTurn,
  calculateScores,
  batchUpdateAllPlayersScores,
}
