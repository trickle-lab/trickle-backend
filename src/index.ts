import { setDefaultResultOrder } from "node:dns";
setDefaultResultOrder("ipv4first");
import net from "node:net";
net.setDefaultAutoSelectFamilyAttemptTimeout(5000);

import "dotenv/config";
import express from "express";
import cors from "cors";
import { startIndexer, streamEvents } from "./indexer/watchStreams.js";

const app = express();
app.use(cors());
const PORT = process.env.PORT || 4000;

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/events", (_req, res) => {
  res.json(streamEvents);
});

app.listen(PORT, () => {
  console.log(`Trickle backend listening on port ${PORT}`);
  startIndexer();
});