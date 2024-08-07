import { useMutation } from '@tanstack/react-query'
import { useConnectModal } from 'thirdweb/react'
import { client } from './config'

function useConnectViaModal() {
  const { connect } = useConnectModal()
  const mutationConnectViaModal = useMutation({
    mutationFn: async () => {
      const wallet = await connect({ client })
      return wallet
    },
  })

  return {
    mutationConnectViaModal,
  }
}

export { useConnectViaModal }
