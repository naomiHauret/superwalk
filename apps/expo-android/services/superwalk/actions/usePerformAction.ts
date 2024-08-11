import { getCompetitionSmartContract } from '@/services'
import {
  useActiveAccount,
  useActiveWalletChain,
  useSendAndConfirmTransaction,
} from 'thirdweb/react'
import { useMutation } from '@tanstack/react-query'
import { prepareContractCall, toHex, waitForReceipt } from 'thirdweb'
import { client as thirdwebClient } from '../../thirdweb'

enum ActionType {
  UseItem = 0,
  Block = 1,
  Bribe = 2,
}

/**
 * Let player cast their move for this turn
 */
function useCastTurnAction() {
  const activeAccount = useActiveAccount()
  const activeChain = useActiveWalletChain()
  const mutationSendTransaction = useSendAndConfirmTransaction()

  /**
   * Function used under the hood by all 3 actions
   */
  async function _transactionCastAction(args: {
    actionType: ActionType
    itemId: number
    targetPlayer: `0x${string}`
  }) {
    // Sadly gas fees are so high, even after multiple top off, I can't get enough gas to cover it :(
    const randomBytes = crypto.getRandomValues(new Uint8Array(32))
    const randomHexValue = toHex(randomBytes)
    return await prepareContractCall({
      contract: getCompetitionSmartContract(activeChain?.id as number),
      method:
        'function performAction(ActionType actionType, uint256 itemId, address targetPlayer, bytes32 userRandomNumber)',
      params: [args.actionType, BigInt(args.itemId), args.targetPlayer, randomHexValue], // Invoking RNG
    })
  }

  /**
   * Action: bribe user
   */
  async function castBribe(targetPlayer: `0x${string}`) {
    const transaction = await _transactionCastAction({
      actionType: ActionType.Bribe,
      targetPlayer,
      itemId: 0, // @todo update contract to remove this param
    })
    const result = await mutationSendTransaction.mutateAsync(transaction)
    return result
  }

  const mutationCastBribe = useMutation({
    mutationFn: async (args: { targetPlayer: `0x${string}` }) => {
      if (
        ![mutationCastBlock.status, mutationCastBribe.status, mutationCastUseItem.status].includes(
          'pending',
        )
      ) {
        mutationSendTransaction.reset()
        const { transactionHash } = await castBribe(args.targetPlayer)
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
      console.log('success invoking cast bribe')
      console.log('data', data)
    },
  })

  /**
   * Action: block (cast move - not sure to succeed !)
   */
  async function castBlock() {
    const transaction = await _transactionCastAction({
      actionType: ActionType.Block,
      targetPlayer: activeAccount?.address as `0x${string}`,
      itemId: 0, // @todo update contract to remove this param
    })
    const result = await mutationSendTransaction.mutateAsync(transaction)
    return result
  }

  const mutationCastBlock = useMutation({
    mutationFn: async () => {
      if (
        ![mutationCastBlock.status, mutationCastBribe.status, mutationCastUseItem.status].includes(
          'pending',
        )
      ) {
        mutationSendTransaction.reset()
        const { transactionHash } = await castBlock()
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
      console.log('success invoking cast block')
      console.log('data', data)
    },
  })

  /**
   * Action: use item (cast move - not sure to succeed !)
   */
  async function castUseItem(itemId: number) {
    const transaction = await _transactionCastAction({
      actionType: ActionType.Block,
      targetPlayer: activeAccount?.address as `0x${string}`,
      itemId: itemId, // @todo update contract to remove this param
    })
    const result = await mutationSendTransaction.mutateAsync(transaction)
    return result
  }
  const mutationCastUseItem = useMutation({
    mutationFn: async (args: { itemId: number }) => {
      if (mutationCastBlock.status !== 'pending') {
        mutationSendTransaction.reset()
        const { transactionHash } = await castUseItem(args.itemId)
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
      console.log('success invoking cast use item')
      console.log('data', data)
    },
  })

  return {
    mutationCastUseItem,
  }
}

export { useCastTurnAction }
