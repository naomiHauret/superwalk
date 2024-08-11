import React, { useState, type FC } from 'react'
import {
  client,
  useAccountPlayer,
  useCurrentTurn,
  useInventory,
  useSyncTrackSteps,
} from '@/services'
import { useActiveAccount, useBuyWithFiatQuote, useActiveWalletChain } from 'thirdweb/react'
import {
  YStack,
  Button,
  Paragraph,
  ScrollView,
  Card,
  SizableText,
  XStack,
  H1,
  Image,
  Spinner,
  Sheet,
  H2,
  Anchor,
} from 'tamagui'
import { useQuery } from '@tanstack/react-query'
import { isAddress } from 'thirdweb'
import { addMinutes, isWithinInterval, startOfHour } from 'date-fns'
import { base } from 'thirdweb/chains'

const ScreenTracker: FC = () => {
  const { currentTurn } = useCurrentTurn()
  const playerAccount = useActiveAccount()
  const activeChain = useActiveWalletChain()
  const quote = useBuyWithFiatQuote({
    client: client, // thirdweb client
    fromCurrencySymbol: 'USD', // fiat currency symbol
    toChainId: base?.id as number, // /!\ Base Sepolia USDC is not supported, for the sake of example we use Base instead, don't buy anything , this is mainnet
    toAmount: '10', // amount of token to buy
    toTokenAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // hardcoded as I need to demo this soon ! usdc on base sepolia
    toAddress: playerAccount?.address as string, // user's wallet address
  })

  const {
    machineTrackSteps: [state, send],
    queryStartTrackerSteps,
    mutationRequestPermissionAccess,
  } = useSyncTrackSteps()
  const { mutationClaimItem } = useInventory()
  const { queryIsAccountRegisteredAsPlayer, isAccountRegisteredAsPlayer, mutationJoinCompetition } =
    useAccountPlayer()

  /*
  const queryUserLastRecords = useQuery({ 
    enabled: isAddress(playerAccount?.address!!) && isAccountRegisteredAsPlayer,
    queryKey: ["account-score"],
    queryFn: async () => {
      const response = await fetch(process.env.ENDPOINT_SUBGRAPH_SUPERWALK_URL!!, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query:`
          query ScoreLastRound($address: String) {
            scoreUpdateds(first: 1, orderBy: timestamp_, orderDirection: desc,  where: {
              player: $address,
            }) {
              score
            }
               stepsCountReporteds(first: 1, orderBy: timestamp_, orderDirection: desc,  where: {
                player: $address,
              }) {
                steps
                previousTurnSteps
              }
          }

        `
          , variables: {
            address: playerAccount?.address.toLowerCase()
          } }),
      })

      console.log("playerAccount?.address", playerAccount?.address)
      const data = await response.json()

      return {
        lastScore: data?.data?.scoreUpdateds?.[0]?.score ?? 0,
        lastStepsRecorded: data?.data?.stepsCountReporteds?.[0]?.previousTurnSteps ?? 0,
      }
    }
    
  })

  */
  const queryGetGamePhase = useQuery({
    queryKey: ['current-game-phase'],
    queryFn: () => {
      if (
        isWithinInterval(new Date(), {
          start: startOfHour(new Date()),
          end: addMinutes(startOfHour(new Date()), 20),
        })
      ) {
        return 'ACTION'
      }
      return 'WALK'
    },
    refetchInterval: 60000,
  })

  const [sheetBribe, setSheetBribeOpen] = useState(false)
  const [sheetInventory, setSheetInventoryOpen] = useState(false)

  return (
    <>
      <YStack theme="blue_alt1" f={1} px="$4" py="$8">
        {/** Getting user account back */}
        {queryIsAccountRegisteredAsPlayer?.status === 'pending' && (
          <YStack px="$4" jc="center" f={1}>
            <H1 ta="center" size="$3">
              Counting your steps back, one second...
            </H1>
          </YStack>
        )}

        {queryIsAccountRegisteredAsPlayer?.status === 'success' && (
          <>
            {isAccountRegisteredAsPlayer ? (
              <>
                {state.context.canAccessStepTracker ? (
                  <YStack f={1} gap="$6" ai="center" jc="space-between">
                    <XStack ai="center" themeInverse>
                      <SizableText px="$4" size="$3" py="$1" br="$10" themeInverse>
                        Score - 255
                      </SizableText>
                    </XStack>

                    <YStack ai="center" marginTop="auto" flexWrap="wrap">
                      <Paragraph theme="alt2" w="100%" size="$12" fontWeight="900">
                        {state.context.stepsCountSinceAppBooted}
                      </Paragraph>
                      <Paragraph
                        w="100%"
                        fontWeight="700"
                        tt="uppercase"
                        size="$4"
                        opacity={0.85}
                        theme="active"
                      >
                        steps
                      </Paragraph>
                      <SizableText size="$1" theme="active" opacity={0.75}>
                        since opening the app
                      </SizableText>
                    </YStack>

                    <YStack theme="blue_surface2">
                      <Paragraph ta="center" opacity={0.5} size="$1">
                        Turn {currentTurn}
                      </Paragraph>

                      <Paragraph size="$3">Phase - {queryGetGamePhase.data}</Paragraph>
                    </YStack>
                    <Card theme="light" p="$3" br="$12">
                      <XStack gap="$4" flexWrap="wrap" jc="center" ai="center">
                        <Button
                          onPress={async () => {
                            if (mutationClaimItem.status !== 'pending')
                              await mutationClaimItem.mutateAsync()
                          }}
                        >
                          Claim item
                        </Button>
                        <Button disabled={queryGetGamePhase.data !== 'ACTION'}>Use item</Button>
                        <Button disabled={queryGetGamePhase.data !== 'ACTION'}>Defend</Button>
                        <Button
                          disabled={queryGetGamePhase.data !== 'ACTION'}
                          onPress={() => setSheetBribeOpen(true)}
                        >
                          Bribe
                        </Button>
                      </XStack>
                    </Card>
                  </YStack>
                ) : (
                  <YStack f={1} gap="$6" ai="center" jc="flex-end">
                    <Image
                      source={{
                        uri: 'https://cdn3d.iconscout.com/3d/premium/thumb/approved-stamp-4620975-3839989.png?f=webp',
                        width: 200,
                        height: 300,
                      }}
                    />

                    <Card p="$4" theme="blue_surface4">
                      <Paragraph ta="center" pb="$2" theme="alt2" size="$2">
                        Superwalk needs access to the pedometer of your device to start tracking
                        your step count.
                      </Paragraph>
                      <Button
                        mb="$4"
                        disabledStyle={{
                          opacity: 0.85,
                        }}
                        themeInverse={
                          mutationRequestPermissionAccess.status === 'pending' ? false : true
                        }
                        onPress={async () =>
                          mutationRequestPermissionAccess.status !== 'pending' &&
                          (await mutationRequestPermissionAccess.mutateAsync())
                        }
                        fontWeight="bold"
                      >
                        Grant access
                      </Button>
                      {mutationRequestPermissionAccess.status === 'pending' && (
                        <Spinner color="blue" theme="blue" />
                      )}
                    </Card>
                  </YStack>
                )}
              </>
            ) : (
              <YStack f={1} ai="center" jc="flex-end">
                <Image
                  source={{
                    uri: 'https://cdn3d.iconscout.com/3d/premium/thumb/yes-you-can-10364125-8363011.png?f=webp',
                    width: 320,
                    height: 300,
                  }}
                />

                <Card p="$4" theme="blue_surface4">
                  <Paragraph ta="center" pb="$4" fontWeight="bold" theme="alt2" size="$4">
                    It seems you didn't join the competition yet. Other players are getting some
                    advance on you already...
                  </Paragraph>
                  <Button
                    mb="$4"
                    disabledStyle={{
                      opacity: 0.85,
                    }}
                    themeInverse={mutationJoinCompetition.status === 'pending' ? false : true}
                    onPress={async () =>
                      mutationJoinCompetition.status !== 'pending' &&
                      (await mutationJoinCompetition.mutateAsync())
                    }
                    fontWeight="bold"
                  >
                    Change that now
                  </Button>
                  {mutationRequestPermissionAccess.status === 'pending' && (
                    <Spinner color="blue" theme="blue" />
                  )}
                </Card>
              </YStack>
            )}
          </>
        )}
      </YStack>

      <Sheet open={sheetInventory} onOpenChange={(value: boolean) => setSheetInventoryOpen(value)}>
        <Sheet.Overlay />
        <Sheet.Handle />
        <Sheet.Frame>
          <ScrollView>
            <YStack gap="$4" p="$4" theme="blue">
              <H1 fontWeight="800" size="$8">
                My inventory
              </H1>
              <Paragraph>
                Every turn, if you walked more than your previous step count, you can unlock a new
                item.
              </Paragraph>
              <Paragraph>
                In Superwalk, you can cancel another player's attack by bribing them.
              </Paragraph>
              <Paragraph>
                Those items can boost you, protect you from attacks, or be used against other
                players.
              </Paragraph>
              <Paragraph>
                Using an item will sometimes block your action for X amout of turn, so think well
                before your next move !.
              </Paragraph>
            </YStack>
          </ScrollView>
        </Sheet.Frame>
      </Sheet>
      <Sheet open={sheetBribe} onOpenChange={(value: boolean) => setSheetBribeOpen(value)}>
        <Sheet.Overlay />
        <Sheet.Handle />
        <Sheet.Frame>
          <ScrollView>
            <YStack gap="$4" p="$4" theme="blue">
              <H1 fontWeight="800" size="$8">
                Bribe another player
              </H1>
              <Paragraph>
                Much like in real-life, some problems can disappear - as long as you throw enough
                money at it.
              </Paragraph>
              <Paragraph>
                In Superwalk, you can cancel another player's attack by bribing them.
              </Paragraph>
              <Paragraph>
                To bribe a player, you need to hold USDC in your wallet. The higher the other player
                walked, the more you will need to bribe them for the attack to be cancelled.
              </Paragraph>
              <Paragraph>
                Make sure to have at least 5 USDC during your session - it should be plenty enough
                to cover you during several days of playing !
              </Paragraph>
              <Paragraph>
                The minimum purchase amount is 5 USDC; if you agree with it, proceed.
              </Paragraph>
              <Paragraph>
                Otherwise; if you are comfortable enough, you can top-up your account by sending the
                amount of USDC you want on {activeChain?.name} at address {playerAccount?.address}{' '}
                (your account).
              </Paragraph>

              <Paragraph fontWeight="bold">
                By clicking the link below, you will be redirected out of Superwalk to a secure
                website that allows purchasing USDC easily. The bribe will be sent automatically to
                the last player that attacked you when you click "Bribe last attacker", you don't
                need to do anything else or send the USDC yourself.
              </Paragraph>

              <XStack gap="$6" ai="center" jc="center" py="$4">
                <Button>Bribe last attacker</Button>

                {quote.data && (
                  <Anchor
                    ta="center"
                    fontWeight="bold"
                    theme="alt2"
                    href={quote.data.onRampLink}
                    target="_blank"
                  >
                    Buy USDC
                  </Anchor>
                )}
              </XStack>
            </YStack>
          </ScrollView>
        </Sheet.Frame>
      </Sheet>
    </>
  )
}

export { ScreenTracker }
export default ScreenTracker
