import { subMinutes, getUnixTime } from 'date-fns'

/**
 * Get current turn number
 */
async function getCurrentTurn() {
  const query = `
        query CurrentTurn {
        turnEndeds(first: 1, orderBy: timestamp_, orderDirection: desc) {
            turnNumber
        }
    }`

  const response = await fetch(process.env.ENDPOINT_SUBGRAPH_SUPERWALK_URL!!, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  })

  const data = await response.json()
  return +data.data?.turnEndeds[0]?.turnNumber
}

/**
 * get most recently indexed step counts
 */

async function getTurnActions(turnNumber: number) {
  const now = new Date()
  const fiveMinutesAgo = subMinutes(now, 5)
  const timestamp = getUnixTime(fiveMinutesAgo)

  const query = `
    query TurnActions($turn: BigInt, $timestamp: BigInt) {
      stepsCountReporteds(where: { timestamp_gte: $timestamp }) {
        turnNumber
        player
        steps
        previousTurnSteps
        timestamp_
      }
      gameItemCreateds {
        itemId
        effectValue
        effectType
        effectValueType
      }
      itemUseds(where: { turnNumber: $turn, success: true }) {
        itemId
        player
        targetPlayer
      }
      blockeds(where: { turnNumber: $turn, success: true }) {
        id
        player
      }
      bribeSents(where: { turnNumber: $turn }) {
        toPlayer
        fromPlayer
        amount
      }
    }
  `

  const variables = {
    turn: turnNumber,
    timestamp,
  }

  const response = await fetch(process.env.ENDPOINT_SUBGRAPH_SUPERWALK_URL!!, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  })

  const data = await response.json()
  return data.data
}

export { getCurrentTurn, getTurnActions }
