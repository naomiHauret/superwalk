import { getContract, prepareContractCall, sendBatchTransaction, waitForReceipt } from 'thirdweb'
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
      address = '0x8808B527848BA6a2C5401C3cD767783A2D1704A5'
      break
    case optimismSepolia.id:
      chain = optimismSepolia
      address = '0x8808B527848BA6a2C5401C3cD767783A2D1704A5'
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
    console.log(txResult)
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
async function batchUpdateAllPlayersScore(
  actions: Array<{ player: string; successful: boolean }>,
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
    console.log(txResult)
  } catch (error) {
    console.error('something went wrong:')
    console.error(error)
  }
}

export { StepCountReportSource, batchUpdateAllPlayersStepsCount }
