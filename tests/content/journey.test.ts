import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import { HomeWorkbenchPreview } from "../../src/components/home-workbench-preview";
import journeyFeedJson from "../../src/content/journey-public.json";
import journeyMomentsJson from "../../src/content/journey-moments.json";
import {
  JourneyContentSchema,
  JourneyFeedError,
  JourneyMomentContentSchema,
  computeJourneyContentSha256,
  computeJourneyMomentSha256,
  countJourneyInterviewReviews,
  loadJourneyFeed,
  loadJourneyMomentsFeed,
} from "../../src/content/journey";

type MutableFeed = {
  schemaVersion: string;
  entries: Array<Record<string, unknown>>;
};

const SYNTHETIC_PRIVATE_EMAIL = ["private", "example.com"].join("@");
const SYNTHETIC_PHONE = ["138", "0013", "8000"].join("");
const FEED_AS_OF_DATE = "2026-09-03";

function cloneFeed(): MutableFeed {
  return structuredClone(journeyFeedJson) as MutableFeed;
}

function expectFeedFailure(value: unknown, fragment: string): void {
  assert.throws(
    () => loadJourneyFeed(value, FEED_AS_OF_DATE),
    (error: unknown) => {
      assert.ok(error instanceof JourneyFeedError);
      assert.ok(error.errors.some((message) => message.includes(fragment)), error.errors.join("\n"));
      return true;
    },
  );
}

test("checked-in public journey feed passes", () => {
  const feed = loadJourneyFeed(journeyFeedJson, FEED_AS_OF_DATE);
  assert.equal(feed.entries.length, 11);
});

test("homepage review count excludes the origin and follows new interview entries", () => {
  const feed = loadJourneyFeed(journeyFeedJson, FEED_AS_OF_DATE);
  const origin = feed.entries.find((entry) => entry.interviewStatus === "起点");
  const interview = feed.entries.find((entry) => entry.interviewStatus !== "起点");
  const expectedCount = feed.entries.filter(
    (entry) => entry.interviewStatus !== "起点",
  ).length;
  const homepage = renderToStaticMarkup(HomeWorkbenchPreview());

  assert.ok(origin, "checked-in feed should contain the public journey origin");
  assert.ok(interview, "checked-in feed should contain a public interview entry");
  assert.equal(expectedCount, 10);
  assert.equal(countJourneyInterviewReviews(feed.entries), expectedCount);
  assert.equal(countJourneyInterviewReviews([origin]), 0);
  assert.equal(
    countJourneyInterviewReviews([...feed.entries, interview]),
    expectedCount + 1,
  );
  assert.match(homepage, new RegExp(`${expectedCount} 次面试复盘`));
});

test("pending journey entries are rejected by the public schema", () => {
  const feed = cloneFeed();
  feed.entries[0].publicationStatus = "pending-review";
  expectFeedFailure(feed, "publicationStatus");
});

test("approved journey content requires the canonical content hash", () => {
  const content = JourneyContentSchema.parse({
    schemaVersion: "journey-public-v2",
    slug: "approved-entry",
    title: "Approved entry",
    company: "公开别名",
    role: "公开角色",
    round: "公开轮次",
    interviewStatus: "已完成",
    eventDate: "2026-08-27",
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
    { schemaVersion: "journey-public-feed-v2", entries: [approved] },
    "2026-09-01",
  );

  expectFeedFailure(
    {
      schemaVersion: "journey-public-feed-v2",
      entries: [{ ...approved, contentSha256: "0".repeat(64) }],
    },
    "SHA-256",
  );
});

test("eventDate is required for approved and placeholder entries", () => {
  const placeholderFeed = cloneFeed();
  delete placeholderFeed.entries[0].eventDate;
  expectFeedFailure(placeholderFeed, "eventDate");

  const content = JourneyContentSchema.parse({
    schemaVersion: "journey-public-v2",
    slug: "approved-with-event-date",
    title: "Approved entry",
    company: "公开别名",
    role: "公开角色",
    round: "公开轮次",
    interviewStatus: "已完成",
    eventDate: "2026-08-27",
    publishedAt: "2026-08-31",
    summary: "Public summary",
    body: "Public body",
    tags: ["公开"],
    href: "/journey/approved-with-event-date/",
  });
  const approved = {
    ...content,
    publicationStatus: "approved" as const,
    placeholder: false as const,
    contentSha256: computeJourneyContentSha256(content),
  };
  const approvedWithoutEventDate = { ...approved } as Record<string, unknown>;
  delete approvedWithoutEventDate.eventDate;
  expectFeedFailure(
    { schemaVersion: "journey-public-feed-v2", entries: [approvedWithoutEventDate] },
    "eventDate",
  );
});

test("eventDate is validated as a real date but may be in the future", () => {
  const futureEventFeed = cloneFeed();
  futureEventFeed.entries[0].eventDate = "2099-12-31";
  const futureEventContent = Object.fromEntries(
    Object.entries(futureEventFeed.entries[0]).filter(
      ([key]) => !["publicationStatus", "placeholder", "contentSha256"].includes(key),
    ),
  );
  futureEventFeed.entries[0].contentSha256 = computeJourneyContentSha256(
    JourneyContentSchema.parse(futureEventContent),
  );
  loadJourneyFeed(futureEventFeed, FEED_AS_OF_DATE);

  const invalidEventFeed = cloneFeed();
  invalidEventFeed.entries[0].eventDate = "2026-02-30";
  expectFeedFailure(invalidEventFeed, "real calendar date");
});

test("approved journey hash covers eventDate", () => {
  const content = JourneyContentSchema.parse({
    schemaVersion: "journey-public-v2",
    slug: "event-date-hash",
    title: "Approved entry",
    company: "公开别名",
    role: "公开角色",
    round: "公开轮次",
    interviewStatus: "已完成",
    eventDate: "2026-08-27",
    publishedAt: "2026-08-31",
    summary: "Public summary",
    body: "Public body",
    tags: ["公开"],
    href: "/journey/event-date-hash/",
  });
  const approved = {
    ...content,
    publicationStatus: "approved" as const,
    placeholder: false as const,
    contentSha256: computeJourneyContentSha256(content),
  };

  expectFeedFailure(
    {
      schemaVersion: "journey-public-feed-v2",
      entries: [{ ...approved, eventDate: "2026-08-28" }],
    },
    "SHA-256",
  );
});

test("future journey publishedAt values fail closed", () => {
  const feed = cloneFeed();
  feed.entries[0].publishedAt = "2026-09-04";
  expectFeedFailure(feed, "future");
});

test("unknown private eventAt still cannot enter the strict public feed", () => {
  const feed = cloneFeed();
  feed.entries[0].eventAt = "2026-08-20";
  expectFeedFailure(feed, "Unrecognized key");
});

test("placeholder journey prose is still scanned for private contact data", () => {
  const feed = cloneFeed();
  feed.entries[0].body = `请联系 ${SYNTHETIC_PRIVATE_EMAIL} 或 ${SYNTHETIC_PHONE}`;
  expectFeedFailure(feed, "email address");
  expectFeedFailure(feed, "mainland phone number");
});

test("journey href must be the canonical route for its slug", () => {
  const feed = cloneFeed();
  feed.entries[0].href = "/journey/wrong/";
  expectFeedFailure(feed, "canonical slug route");
});

test("checked-in journey moments are explicit, safe placeholders", () => {
  const feed = loadJourneyMomentsFeed(journeyMomentsJson, "2026-09-01");
  assert.equal(feed.entries.length, 2);
  assert.ok(feed.entries.every((entry) => entry.publicationStatus === "placeholder"));
  assert.ok(feed.entries.every((entry) => entry.placeholder));
});

test("approved journey moments require the exact content hash", () => {
  const content = JourneyMomentContentSchema.parse({
    schemaVersion: "journey-moment-v1",
    slug: "approved-short-note",
    publishedAt: "2026-08-31",
    text: "一条经过确认的公开短句。",
  });
  const approved = {
    ...content,
    publicationStatus: "approved" as const,
    placeholder: false as const,
    contentSha256: computeJourneyMomentSha256(content),
  };

  loadJourneyMomentsFeed(
    { schemaVersion: "journey-moments-feed-v1", entries: [approved] },
    "2026-09-01",
  );

  assert.throws(
    () => loadJourneyMomentsFeed(
      {
        schemaVersion: "journey-moments-feed-v1",
        entries: [{ ...approved, text: "审批之后被修改的短句。" }],
      },
      "2026-09-01",
    ),
    (error: unknown) => {
      assert.ok(error instanceof JourneyFeedError);
      assert.ok(error.errors.some((message) => message.includes("SHA-256")));
      return true;
    },
  );
});

test("journey moments reject future dates and private contact data", () => {
  const futureFeed = structuredClone(journeyMomentsJson);
  futureFeed.entries[0].publishedAt = "2026-09-02";
  assert.throws(() => loadJourneyMomentsFeed(futureFeed, "2026-09-01"));

  const privateFeed = structuredClone(journeyMomentsJson);
  privateFeed.entries[0].text = `示例手记：请联系 ${SYNTHETIC_PRIVATE_EMAIL}`;
  assert.throws(
    () => loadJourneyMomentsFeed(privateFeed, "2026-09-01"),
    (error: unknown) => {
      assert.ok(error instanceof JourneyFeedError);
      assert.ok(error.errors.some((message) => message.includes("email address")));
      return true;
    },
  );
});
