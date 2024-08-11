import { getCompetitionSmartContract } from '@/services'
import {
  useActiveAccount,
  useActiveWalletChain,
  useReadContract,
  useSendAndConfirmTransaction,
} from 'thirdweb/react'
import { useMutation } from '@tanstack/react-query'
import { isAddress, prepareContractCall, toHex, waitForReceipt } from 'thirdweb'
import { client as thirdwebClient } from '../../thirdweb'

/**
 * Let current user see & manage their inventory
 */
function useInventory() {
  const activeUser = useActiveAccount()
  const activeChain = useActiveWalletChain()
  const mutationSendTransaction = useSendAndConfirmTransaction()

  const queryPlayerInventory = useReadContract(
    {
      //@ts-ignore
      contract: getCompetitionSmartContract(activeChain?.id!!),
      method: 'function getInventory()',
      params: [],
    },
    {
      enabled: isAddress(activeUser?.address!!),
    },
  )

  /**
   * Cast a claim random item intent transaction
   */
  async function _transactionClaimItem() {
    const randomBytes = crypto.getRandomValues(new Uint8Array(32))
    const randomHexValue = toHex(randomBytes)
    return await prepareContractCall({
      contract: getCompetitionSmartContract(activeChain?.id as number),
      method: 'function pickItem(bytes32 userProvidedRandomNumber)',
      params: [randomHexValue], // Invoking RNG
    })
  }

  /**
   *
   * Send claim item transaction
   */
  async function claimItem() {
    // Sadly gas fees are so high, even after multiple top off, I can't get enough gas to cover it :(
    const transaction = await _transactionClaimItem()
    const result = await mutationSendTransaction.mutateAsync(transaction)
    return result
  }

  /**
   * Mutation to claim an item (send transaction & wait receipt)
   */
  const mutationClaimItem = useMutation({
    mutationFn: async () => {
      if (mutationClaimItem.status !== 'pending') {
        mutationSendTransaction.reset()
        const { transactionHash } = await claimItem()
        const receipt = await waitForReceipt({
          client: thirdwebClient,
          chain: activeChain!!,
          transactionHash,
        })

        return receipt
      }

      return
    },
    onError(error, variables, context) {
      console.error(error)
    },
    onSuccess(data, variables, context) {
      console.log('success claiming object')
      console.log('data', data)
    },
  })

  return {
    mutationClaimItem,
    queryPlayerInventory,
  }
}

export { useInventory }
