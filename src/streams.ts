
import type { DecodedStreamEvent } from "./indexer/watchStreams.js";

export interface StreamState {
  streamId: string;
  amount: string;
  duration: string;
  startedAt: string;
  withdrawn: string;
  vested: string;
  available: string;
  status: "active" | "fully_vested" | "completed";
  eventCount: number;
  createdTxHash: string;
}

// Rebuilds each stream's current state by replaying its events.
// Amounts are in stroops (1 XLM = 10,000,000), returned as strings.
// Note: the contract does not emit a "cancel" event yet, so cancelled streams
// cannot be detected here (tracked in the trickle-contract issues).
export function buildStreams(events: DecodedStreamEvent[], now: Date = new Date()): StreamState[] {
  const byStream = new Map<string, DecodedStreamEvent[]>();
  for (const e of events) {
    const list = byStream.get(e.streamId) ?? [];
    list.push(e);
    byStream.set(e.streamId, list);
  }

  const streams: StreamState[] = [];
  for (const [streamId, list] of byStream) {
    const created = list.find((e) => e.type === "created");
    if (!created || !created.amount || !created.duration) continue; // incomplete history

    const total = BigInt(created.amount);
    const duration = BigInt(created.duration);
    const withdrawn = list
      .filter((e) => e.type === "withdraw")
      .reduce((sum, e) => sum + BigInt(e.amount ?? "0"), BigInt(0));

    const elapsedMs = now.getTime() - new Date(created.ledgerClosedAt).getTime();
    const elapsed = BigInt(Math.max(0, Math.floor(elapsedMs / 1000)));
    const vested = duration === BigInt(0) || elapsed >= duration ? total : (total * elapsed) / duration;
    const available = vested > withdrawn ? vested - withdrawn : BigInt(0);

    let status: StreamState["status"] = "active";
    if (withdrawn >= total) status = "completed";
    else if (elapsed >= duration) status = "fully_vested";

    streams.push({
      streamId,
      amount: total.toString(),
      duration: duration.toString(),
      startedAt: created.ledgerClosedAt,
      withdrawn: withdrawn.toString(),
      vested: vested.toString(),
      available: available.toString(),
      status,
      eventCount: list.length,
      createdTxHash: created.txHash,
    });
  }

  return streams.sort((a, b) => Number(b.streamId) - Number(a.streamId));
}
