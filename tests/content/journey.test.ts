import assert from "node:assert/strict";
import { test } from "node:test";

import journeyFeedJson from "../../src/content/journey-public.json";
import {
  JourneyContentSchema,
  JourneyFeedError,
  computeJourneyContentSha256,
  loadJourneyFeed,
} from "../../src/content/journey";

type MutableFeed = {
  schemaVersion: string;
  entries: Array<Record<string, unknown>>;
};

function cloneFeed(): MutableFeed {
  return structuredClone(journeyFeedJson) as MutableFeed;
}

function expectFeedFailure(value: unknown, fragment: string): void {
  assert.throws(
    () => loadJourneyFeed(value, "2026-09-01"),
    (error: unknown) => {
      assert.ok(error instanceof JourneyFeedError);
      assert.ok(error.errors.some((message) => message.includes(fragment)), error.errors.join("\n"));
      return true;
    },
  );
}

test("checked-in public journey feed passes", () => {
  const feed = loadJourneyFeed(journeyFeedJson, "2026-09-01");
  assert.equal(feed.entries.length, 3);
});

test("pending journey entries are rejected by the public schema", () => {
  const feed = cloneFeed();
  feed.entries[0].publicationStatus = "pending-review";
  expectFeedFailure(feed, "publicationStatus");
});

test("approved journey content requires the canonical content hash", () => {
  const content = JourneyContentSchema.parse({
    schemaVersion: "journey-public-v1",
    slug: "approved-entry",
    title: "Approved entry",
    company: "公开别名",
    role: "公开角色",
    round: "公开轮次",
    interviewStatus: "已完成",
    publishedAt: "2026-08-31",
    summary: "Public summary",
    body: "Public body",
    tags: ["公开"],
    href: "/journey/approved-entry/",
  });
  const approved = {
    ...content,
    publicationStatus: "approved",
    placeholder: false,
    contentSha256: computeJourneyContentSha256(content),
  };
  loadJourneyFeed(
    { schemaVersion: "journey-public-feed-v1", entries: [approved] },
    "2026-09-01",
  );

  expectFeedFailure(
    {
      schemaVersion: "journey-public-feed-v1",
      entries: [{ ...approved, contentSha256: "0".repeat(64) }],
    },
    "SHA-256",
  );
});

test("future journey entries fail closed", () => {
  const feed = cloneFeed();
  feed.entries[0].publishedAt = "2026-09-02";
  expectFeedFailure(feed, "future");
});

test("private event dates cannot enter the strict public feed", () => {
  const feed = cloneFeed();
  feed.entries[0].eventAt = "2026-08-20";
  expectFeedFailure(feed, "Unrecognized key");
});

test("placeholder journey prose is still scanned for private contact data", () => {
  const feed = cloneFeed();
  feed.entries[0].body = "请联系 private@example.com 或 13800138000";
  expectFeedFailure(feed, "email address");
  expectFeedFailure(feed, "mainland phone number");
});

test("journey href must be the canonical route for its slug", () => {
  const feed = cloneFeed();
  feed.entries[0].href = "/journey/wrong/";
  expectFeedFailure(feed, "canonical slug route");
});
