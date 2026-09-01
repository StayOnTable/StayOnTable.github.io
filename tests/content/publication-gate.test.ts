import assert from "node:assert/strict";
import { test } from "node:test";

import manifestJson from "../../src/content/publications.json";
import {
  PublicationGateError,
  readPublicationRepositoryInputs,
  sha256Text,
  validatePublicationGate,
} from "../../scripts/content/publication-gate";

type MutableManifest = {
  schemaVersion: string;
  timezone: string;
  publications: Array<Record<string, unknown>>;
};

function cloneManifest(): MutableManifest {
  return structuredClone(manifestJson) as MutableManifest;
}

function onePage(
  sourceText: string,
  overrides: Record<string, unknown> = {},
): { manifest: unknown; files: ReadonlyMap<string, string> } {
  const source = "src/app/notes/approved/page.mdx";
  return {
    manifest: {
      schemaVersion: "publication-manifest-v1",
      timezone: "Asia/Shanghai",
      publications: [
        {
          source,
          route: "/notes/approved/",
          title: "Approved note",
          contentType: "note",
          publishedAt: "2026-08-31",
          publicationStatus: "approved",
          placeholder: false,
          sha256: sha256Text(sourceText),
          ...overrides,
        },
      ],
    },
    files: new Map([[source, sourceText]]),
  };
}

function expectGateFailure(run: () => unknown, fragment: string): void {
  assert.throws(run, (error: unknown) => {
    assert.ok(error instanceof PublicationGateError);
    assert.ok(error.errors.some((message) => message.includes(fragment)), error.errors.join("\n"));
    return true;
  });
}

test("checked-in manifest covers and validates every MDX page", async () => {
  const inputs = await readPublicationRepositoryInputs(process.cwd());
  const result = validatePublicationGate(inputs, "2026-09-01");
  assert.equal(result.publications.length, 5);
});

test("an unregistered MDX page fails closed", async () => {
  const inputs = await readPublicationRepositoryInputs(process.cwd());
  const files = new Map(inputs.files);
  files.set("src/app/notes/unregistered/page.mdx", "# unregistered");
  expectGateFailure(
    () => validatePublicationGate({ manifest: inputs.manifest, files }, "2026-09-01"),
    "not registered",
  );
});

test("pending content, including an investment review, cannot build", async () => {
  const inputs = await readPublicationRepositoryInputs(process.cwd());
  const manifest = cloneManifest();
  const investment = manifest.publications.find(
    (entry) => entry.contentType === "investment-review",
  );
  assert.ok(investment);
  investment.publicationStatus = "pending-review";
  investment.placeholder = false;
  expectGateFailure(
    () => validatePublicationGate({ manifest, files: inputs.files }, "2026-09-01"),
    "pending-review",
  );
});

test("future publication dates fail in Asia/Shanghai", () => {
  const source = "export default function Note() { return <p>ready</p>; }";
  expectGateFailure(
    () =>
      validatePublicationGate(
        onePage(source, { publishedAt: "2026-09-02" }),
        "2026-09-01",
      ),
    "future",
  );
});

test("approved content requires the exact approved revision hash", () => {
  const source = "export default function Note() { return <p>ready</p>; }";
  validatePublicationGate(onePage(source), "2026-09-01");
  expectGateFailure(
    () =>
      validatePublicationGate(
        onePage(source, { sha256: "0".repeat(64) }),
        "2026-09-01",
      ),
    "exact source bytes",
  );
});

test("placeholder status must be explicit and visibly labelled", () => {
  const source = "<article><p>draft</p></article>";
  expectGateFailure(
    () =>
      validatePublicationGate(
        onePage(source, {
          publicationStatus: "placeholder",
          placeholder: true,
          sha256: null,
        }),
        "2026-09-01",
      ),
    "visible placeholder ContentNotice",
  );

  const labelled = "<ContentNotice>这是明确的占位内容。</ContentNotice>";
  validatePublicationGate(
    onePage(labelled, {
      publicationStatus: "placeholder",
      placeholder: true,
      sha256: null,
    }),
    "2026-09-01",
  );
});

test("approved content cannot retain a placeholder notice", () => {
  const source = "<ContentNotice>这是示例内容。</ContentNotice>";
  expectGateFailure(
    () => validatePublicationGate(onePage(source), "2026-09-01"),
    "still carries a placeholder",
  );
});

test("placeholder content is still scanned for private fields and credentials", () => {
  const source = [
    "<ContentNotice>这是占位示例。</ContentNotice>",
    "eventAt: 2026-08-20",
    "联系 example@example.com 或 13800138000",
    "api_key=do-not-publish",
    "/Users/example/private.json",
  ].join("\n");
  const input = onePage(source, {
    publicationStatus: "placeholder",
    placeholder: true,
    sha256: null,
  });
  expectGateFailure(
    () => validatePublicationGate(input, "2026-09-01"),
    "private field marker",
  );
  expectGateFailure(() => validatePublicationGate(input, "2026-09-01"), "email address");
  expectGateFailure(
    () => validatePublicationGate(input, "2026-09-01"),
    "mainland phone number",
  );
  expectGateFailure(
    () => validatePublicationGate(input, "2026-09-01"),
    "credential assignment",
  );
});
