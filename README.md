# Trickle Backend

Indexer and API for [Trickle](https://github.com/trickle-lab/trickle-contract), a Stellar streaming payments protocol. Listens for on-chain contract events (stream created, withdrawn, cancelled), decodes them, and serves clean JSON so clients don't need to query the chain directly.

## Endpoints
- `GET /health` — service status
- `GET /events` — decoded, deduplicated stream events

## Status
Live indexer polling Stellar testnet RPC, decoding real contract events. In-memory storage for now (Postgres migration planned — see open issues).

## Setup
See [CONTRIBUTING.md](./CONTRIBUTING.md).

## Part of Trickle
- [trickle-contract](https://github.com/trickle-lab/trickle-contract)
- [trickle-backend](https://github.com/trickle-lab/trickle-backend) (this repo)
- [trickle-frontend](https://github.com/trickle-lab/trickle-frontend)

## License
Apache License 2.0