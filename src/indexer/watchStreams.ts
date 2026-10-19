import { rpc, scValToNative } from "@stellar/stellar-sdk";
import { loadState, saveState } from "../store.js";

const RPC_URL = process.env.STELLAR_RPC_URL || "https://soroban-testnet.stellar.org";
const CONTRACT_ID = process.env.CONTRACT_ID!;

const server = new rpc.Server(RPC_URL);

export interface DecodedStreamEvent {
  id: string;
  type: string;
  streamId: string;
  amount?: string;
  duration?: string;
  refunded?: string;
  ledger: number;
  ledgerClosedAt: string;
  txHash: string;
}

// Restore history saved by a previous run so a restart doesn't lose data
const saved = loadState(CONTRACT_ID);
export const streamEvents: DecodedStreamEvent[] = saved.events;
const seenEventIds = new Set<string>(streamEvents.map((e) => e.id));
let lastLedger: number | undefined = saved.lastLedger;

// Event payloads emitted by the contract:
//   stream/created  -> (stream_id, amount, duration)
//   stream/withdraw -> (stream_id, amount_withdrawn)
//   stream/cancel   -> (stream_id, paid_to_recipient, refunded_to_sender)
function decodeEvent(event: any): DecodedStreamEvent | null {
  try {
    const topic = event.topic.map((t: any) => scValToNative(t));
    if (topic[0] !== "stream") return null;

    const eventType = topic[1];
    const value = scValToNative(event.value);

    const decoded: DecodedStreamEvent = {
      id: event.id,
      type: eventType,
      streamId: value[0]?.toString(),
      amount: value[1]?.toString(),
      ledger: event.ledger,
      ledgerClosedAt: event.ledgerClosedAt,
      txHash: event.txHash,
    };

    if (eventType === "created" && value[2] !== undefined) {
      decoded.duration = value[2].toString();
    }
    if (eventType === "cancel" && value[2] !== undefined) {
      decoded.refunded = value[2].toString();
    }

    return decoded;
  } catch (err) {
    console.error("Failed to decode event:", err);
    return null;
  }
}

export async function pollEvents() {
  try {
    // getHealth avoids parsing full ledger metadata, which newer protocol versions break on
    const health = await server.getHealth();
    const latest = { sequence: health.latestLedger };
    const startLedger = Math.max(lastLedger ?? latest.sequence - 17280, health.oldestLedger);

    const response = await server.getEvents({
      startLedger,
      filters: [
        {
          type: "contract",
          contractIds: [CONTRACT_ID],
        },
      ],
      limit: 50,
    });

    let added = false;
    for (const event of response.events) {
      if (seenEventIds.has(event.id)) continue;

      const decoded = decodeEvent(event);
      if (decoded) {
        console.log("New stream event:", decoded);
        streamEvents.push(decoded);
        seenEventIds.add(event.id);
        added = true;
      }
    }

    lastLedger = latest.sequence;
    if (added) saveState({ contractId: CONTRACT_ID, events: streamEvents, lastLedger });
  } catch (err) {
    console.error("Error polling events:", (err as any)?.code ?? (err as any)?.message ?? err);
  }
}

export function startIndexer(intervalMs = 5000) {
  console.log(`Starting Trickle indexer (${streamEvents.length} saved events loaded)...`);
  pollEvents();
  setInterval(pollEvents, intervalMs);
}
