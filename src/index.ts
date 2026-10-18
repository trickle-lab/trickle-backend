import { setDefaultResultOrder } from "node:dns";
setDefaultResultOrder("ipv4first");
import net from "node:net";
net.setDefaultAutoSelectFamilyAttemptTimeout(5000);

import "dotenv/config";
import express from "express";
import cors from "cors";
import { startIndexer, streamEvents } from "./indexer/watchStreams.js";
import { buildStreams } from "./streams.js";

const app = express();
app.use(cors());
const PORT = process.env.PORT || 4000;

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/events", (_req, res) => {
  res.json(streamEvents);
});

app.get("/streams", (_req, res) => {
  res.json(buildStreams(streamEvents));
});

app.get("/streams/:id", (req, res) => {
  const stream = buildStreams(streamEvents).find((s) => s.streamId === req.params.id);
  if (!stream) {
    res.status(404).json({ error: "stream not found" });
    return;
  }
  res.json(stream);
});

app.listen(PORT, () => {
  console.log(`Trickle backend listening on port ${PORT}`);
  startIndexer();
});
