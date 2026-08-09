import assert from "node:assert/strict";
import test from "node:test";

import { formatBadgeTime } from "./badge-counter.mjs";

test("formats the remaining pause time as minutes and seconds", () => {
  assert.equal(formatBadgeTime(10_000), "00:10");
  assert.equal(formatBadgeTime(5 * 60_000), "05:00");
  assert.equal(formatBadgeTime(60 * 60_000), "60:00");
});

test("rounds partial seconds up so the badge does not expire early", () => {
  assert.equal(formatBadgeTime(9_001), "00:10");
  assert.equal(formatBadgeTime(1), "00:01");
});

test("does not display negative time", () => {
  assert.equal(formatBadgeTime(0), "00:00");
  assert.equal(formatBadgeTime(-1_000), "00:00");
});
