import type { DecodedStreamEvent } from "./indexer/watchStreams.js";

export interface StreamState {
  streamId: string;
  amount: string;
  duration: string;
  startedAt: string;
  withdrawn: string;
  vested: string;
  available: string;
  refunded: string;
  status: "active" | "fully_vested" | "completed" | "cancelled";
  eventCount: number;
  createdTxHash: string;
}

// Rebuilds each stream's current state by replaying its events.
// Amounts are in stroops (1 XLM = 10,000,000), returned as strings.
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
    const withdrawnByRecipient = list
      .filter((e) => e.type === "withdraw")
      .reduce((sum, e) => sum + BigInt(e.amount ?? "0"), BigInt(0));

    const base = {
      streamId,
      amount: total.toString(),
      duration: duration.toString(),
      startedAt: created.ledgerClosedAt,
      eventCount: list.length,
      createdTxHash: created.txHash,
    };

    // A cancel event carries what was paid to the recipient and what was refunded to the sender
    const cancel = list.find((e) => e.type === "cancel");
    if (cancel) {
      const paidAtCancel = BigInt(cancel.amount ?? "0");
      const refunded = BigInt(cancel.refunded ?? "0");
      const paidOut = withdrawnByRecipient + paidAtCancel;
      streams.push({
        ...base,
        withdrawn: paidOut.toString(),
        vested: paidOut.toString(),
        available: "0",
        refunded: refunded.toString(),
        status: "cancelled",
      });
      continue;
    }

    const elapsedMs = now.getTime() - new Date(created.ledgerClosedAt).getTime();
    const elapsed = BigInt(Math.max(0, Math.floor(elapsedMs / 1000)));
    const vested = duration === BigInt(0) || elapsed >= duration ? total : (total * elapsed) / duration;
    const available = vested > withdrawnByRecipient ? vested - withdrawnByRecipient : BigInt(0);

    let status: StreamState["status"] = "active";
    if (withdrawnByRecipient >= total) status = "completed";
    else if (elapsed >= duration) status = "fully_vested";

    streams.push({
      ...base,
      withdrawn: withdrawnByRecipient.toString(),
      vested: vested.toString(),
      available: available.toString(),
      refunded: "0",
      status,
    });
  }

  return streams.sort((a, b) => Number(b.streamId) - Number(a.streamId));
}
