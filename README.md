# Trickle Backend

Indexer and API for [Trickle](https://github.com/trickle-lab/trickle-contract), a Stellar streaming payments protocol. It watches the Trickle contract on Stellar testnet, decodes its events, and serves the current state of every payment stream so clients never have to query the chain themselves.

## Endpoints

| Endpoint | Description |
|---|---|
| `GET /health` | Service status |
| `GET /events` | Decoded, deduplicated contract events |
| `GET /streams` | Current state of every stream, rebuilt from its events |
| `GET /streams/:id` | State of a single stream |

Example `GET /streams/3`:

```json
{
  "streamId": "3",
  "amount": "10000000",
  "duration": "600",
  "startedAt": "2026-10-18T21:00:42Z",
  "withdrawn": "0",
  "vested": "10000000",
  "available": "10000000",
  "status": "fully_vested",
  "eventCount": 1,
  "createdTxHash": "32a336e5136895346b77f72770e33d89b8f970d60fb8cc13e7b85823a4f0c192"
}
```

Amounts are in stroops (1 XLM = 10,000,000) and returned as strings.

## How it works

1. Every 5 seconds the indexer asks the Soroban RPC for events emitted by the contract.
2. It decodes the `stream/created`, `stream/withdraw` and `stream/cancel` events and skips ones it has already seen.
3. Events are saved to `data/events.json`, so a restart keeps the history.
4. `/streams` replays each stream's events to work out how much has vested and how much is still available to withdraw.

## Configuration

| Variable | Purpose | Default |
|---|---|---|
| `PORT` | HTTP port | `4000` |
| `STELLAR_RPC_URL` | Soroban RPC endpoint | testnet public RPC |
| `CONTRACT_ID` | Deployed Trickle contract | required |
| `DATA_FILE` | Where events are saved | `data/events.json` |

## Known limitations (good first issues)

- Events are stored in a JSON file. Moving to Postgres is planned.
- `getEvents` is called with a limit of 50 and no pagination, so very busy contracts could drop events.
- RPC calls have no retry or backoff logic.

## Setup

See [CONTRIBUTING.md](./CONTRIBUTING.md).

![Trickle architecture](docs/architecture.png)

## Part of Trickle

- [trickle-contract](https://github.com/trickle-lab/trickle-contract)
- [trickle-backend](https://github.com/trickle-lab/trickle-backend) (this repo)
- [trickle-frontend](https://github.com/trickle-lab/trickle-frontend)

## License

Apache License 2.0