import assert from "node:assert/strict";
import test from "node:test";
import { chatTurns } from "./chatTurns.ts";

const row = (overrides = {}) => ({
  _id: "row-1",
  _creationTime: 1,
  ownerId: "alice",
  feature: "chat",
  turnId: "message-1",
  turnRequest: true,
  model: "model",
  latencyMs: 100,
  ttfbMs: 40,
  status: "ok",
  createdAt: 1000,
  costUsd: 0.01,
  ...overrides,
});

test("groups resumed requests as one turn while keeping follow-ups and users separate", () => {
  const turns = chatTurns([
    row({ _id: "resume", createdAt: 1500, latencyMs: 200, ttfbMs: 15, costUsd: 0.03 }),
    row({ _id: "first" }),
    row({ _id: "follow-up", turnId: "message-2", createdAt: 1800 }),
    row({ _id: "other-user", ownerId: "bob", createdAt: 1700 }),
    row({ _id: "old", turnId: undefined }),
    row({ _id: "gate", feature: "commentsGate", turnRequest: undefined, createdAt: 950 }),
    row({ _id: "writer", turnRequest: undefined, createdAt: 980, latencyMs: 50, ttfbMs: undefined, costUsd: 0.02 }),
    row({ _id: "diagram", feature: "diagram", turnRequest: undefined, createdAt: 1400, costUsd: 0.04 }),
  ]);
  assert.equal(turns.length, 3);
  const first = turns.find((turn) => turn.ownerId === "alice" && turn.id === "message-1");
  assert.deepEqual(first.rows.map((call) => call._id), ["gate", "writer", "first", "diagram", "resume"]);
  assert.equal(first.requestCount, 2);
  assert.equal(first.requestMs, 300);
  assert.equal(first.elapsedMs, 600);
  assert.equal(first.ttfbMs, 40);
  assert.equal(first.costUsd, 0.11);
});

test("a failed request is visible, and unknown cost remains unknown", () => {
  const [turn] = chatTurns([
    row({ _id: "failed", status: "error", costUsd: undefined }),
    row({ _id: "resume", status: "ok", costUsd: undefined, createdAt: 1200 }),
  ]);
  assert.equal(turn.status, "error");
  assert.equal(turn.costUsd, undefined);
});

test("first output comes from the earliest request even when its ledger write lands later", () => {
  const [turn] = chatTurns([
    row({ _id: "first", createdAt: 1300, latencyMs: 400, ttfbMs: 80 }),
    row({ _id: "resume", createdAt: 1200, latencyMs: 100, ttfbMs: 5 }),
  ]);
  assert.equal(turn.ttfbMs, 80);
  assert.equal(turn.elapsedMs, 400);
});
