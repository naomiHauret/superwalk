import { optimismSepolia } from 'thirdweb/chains'
import {
  chain as defaultChain,
  mappingChainIdToChainDefinition,
  client as thirdwebClient,
} from './../thirdweb'
import { getContract } from 'thirdweb'
/**
 * @param chainId ID of chain on which the SuperwalkCompetition contract is deployed
 * @returns SuperwalkCompetition contract on which to perform read/write operations
 */
function getCompetitionSmartContract(chainId: number) {
  let chain = mappingChainIdToChainDefinition[chainId]
  let address
  switch (chainId) {
    case defaultChain.id:
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

export { getCompetitionSmartContract }
