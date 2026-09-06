import assert from "node:assert/strict";
import test from "node:test";
import {
  computeLibraryRecordSha256,
  libraryRecordContentSchema,
  libraryRecordSchema,
  libraryRecords,
  loadLibraryRecords,
} from "../../src/app/library/library-records";

test("library cards preserve explicit placeholders and all supported formats", () => {
  assert.equal(libraryRecords.length, 4);
  assert.ok(libraryRecords.every((record) => record.placeholder));
  assert.ok(libraryRecords.some((record) => record.sourceType === "文章"));
  assert.ok(libraryRecords.some((record) => record.sourceType === "视频"));
  assert.ok(libraryRecords.some((record) => record.sourceType === "播客"));
});

test("the existing library detail route remains available", () => {
  const detailRecord = libraryRecords.find((record) => record.id === "collection-to-opinion");
  assert.equal(detailRecord?.href, "/library/2026-08-31/");
});

test("real records require a public original source URL", () => {
  const result = libraryRecordSchema.safeParse({
    ...libraryRecords[0],
    publicationStatus: "approved",
    placeholder: false,
    sourceUrl: null,
    contentSha256: "0".repeat(64),
  });
  assert.equal(result.success, false);
});

test("approved library content is pinned to the reviewed canonical hash", () => {
  const source = libraryRecords[0];
  const content = libraryRecordContentSchema.parse({
    id: source.id,
    date: source.date,
    title: source.title,
    takeaway: source.takeaway,
    sourceType: source.sourceType,
    creator: "真实作者",
    sourceUrl: "https://example.com/article",
    topic: source.topic,
    topicId: source.topicId,
    href: source.href,
    thumbnail: source.thumbnail,
    expanded: source.expanded,
  });
  const approved = {
    ...content,
    publicationStatus: "approved" as const,
    placeholder: false as const,
    contentSha256: computeLibraryRecordSha256(content),
  };

  loadLibraryRecords([approved], "2026-09-01");
  assert.throws(
    () => loadLibraryRecords([{ ...approved, takeaway: "审批后被改写" }], "2026-09-01"),
    /SHA-256/,
  );
  assert.throws(
    () => loadLibraryRecords([{ ...approved, date: "2026-09-02" }], "2026-09-01"),
    /future/,
  );
});

test("future thumbnails accept local or http(s) assets only", () => {
  const localThumbnail = libraryRecordSchema.safeParse({
    ...libraryRecords[0],
    thumbnail: { src: "/images/library/example.webp", alt: "内容缩略图" },
  });
  const unsafeThumbnail = libraryRecordSchema.safeParse({
    ...libraryRecords[0],
    thumbnail: { src: "javascript:alert(1)", alt: "内容缩略图" },
  });

  assert.equal(localThumbnail.success, true);
  assert.equal(unsafeThumbnail.success, false);
});

test("library links stay on site or use public http(s) sources", () => {
  assert.equal(libraryRecordSchema.safeParse({
    ...libraryRecords[0],
    href: "//example.com/escape",
  }).success, false);
  assert.equal(libraryRecordSchema.safeParse({
    ...libraryRecords[0],
    sourceUrl: "javascript:alert(1)",
  }).success, false);
});
