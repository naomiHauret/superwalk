# @superwalk/subgraph

No-code subgraphs for Superwalk.
Made with [Goldsky no-code tool](https://docs.goldsky.com/subgraphs/guides/create-a-no-code-subgraph#video-walkthrough).

- [Superwalk game subgraph](https://api.goldsky.com/api/public/project_clzbhwx2klyjj01xs95bx1d75/subgraphs/game-base-sepolia/1.0/gn)

> Prerequisite : have a Goldsky account & API key, a deployed smart contract, and have the Goldsky CLI installed


## How to...

### Update subraph

After redeploying your contract :

1. Copy the updated ABI of the smart contract and paste the updated version in `./abis` ;
2. Copy the newly deployed contract address and paste it in the `address` property of the proper instance of `instances` in `./instant_config.json` ;
3. Copy the block number from which you want to index events (for instance the block on which the contract was deployed) and paste it in the `startBlock` property of the proper instance of `instances` in `./instant_config.json` ;

Your config should look like this :

```
{
    "version": "1",
    "name": "superwalk",
    "abis": {
        "game": {
            "path": "./abis/Superwalk.json"
        }
    },
    "chains": ["base-sepolia"],
    "instances": [
        {
            "abi": "game",
            "address": "0x8808B527848BA6a2C5401C3cD767783A2D1704A5",
            "chain": "base-sepolia",
            "startBlock": 13755736
        }
    ]
}
```

4. Deploy with `goldsky subgraph deploy <subgraph name>/<version number> --from-abi <path to config file>.json`

For instance `goldsky subgraph deploy game/1.0 --from-abi superwalk-game-config.json`