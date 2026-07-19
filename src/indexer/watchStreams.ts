import { rpc, scValToNative } from "@stellar/stellar-sdk";

const RPC_URL = process.env.STELLAR_RPC_URL || "https://soroban-testnet.stellar.org";
const CONTRACT_ID = process.env.CONTRACT_ID!;

const server = new rpc.Server(RPC_URL);

export interface DecodedStreamEvent {
  id: string;
  type: string;
  streamId: string;
  amount?: string;
  duration?: string;
  ledger: number;
  ledgerClosedAt: string;
  txHash: string;
}

export const streamEvents: DecodedStreamEvent[] = [];
const seenEventIds = new Set<string>();

let lastLedger: number | undefined;

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

    return decoded;
  } catch (err) {
    console.error("Failed to decode event:", err);
    return null;
  }
}

export async function pollEvents() {
  try {
    const latest = await server.getLatestLedger();
    const startLedger = lastLedger ?? latest.sequence - 1000;

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

    for (const event of response.events) {
      if (seenEventIds.has(event.id)) continue;

      const decoded = decodeEvent(event);
      if (decoded) {
        console.log("New stream event:", decoded);
        streamEvents.push(decoded);
        seenEventIds.add(event.id);
      }
    }

    lastLedger = latest.sequence;
  } catch (err) {
    console.error("Error polling events:", err);
  }
}

export function startIndexer(intervalMs = 5000) {
  console.log("Starting Trickle indexer...");
  pollEvents();
  setInterval(pollEvents, intervalMs);
}
