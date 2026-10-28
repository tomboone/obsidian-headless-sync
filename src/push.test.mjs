import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { pushStatus } from "./push.mjs";

const URL_ = "http://kuma.test/api/push/abc";
const realFetch = globalThis.fetch;
const realError = console.error;
let calls;
let errors;

function mockFetch(impl) {
  globalThis.fetch = async (url, opts) => {
    calls.push({ url, opts });
    return impl();
  };
}

beforeEach(() => {
  calls = [];
  errors = [];
  console.error = (...args) => errors.push(args.join(" "));
});

afterEach(() => {
  globalThis.fetch = realFetch;
  console.error = realError;
});

test("up sends msg=OK", async () => {
  mockFetch(() => new Response("ok"));
  await pushStatus(URL_, "up", "OK");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, `${URL_}?status=up&msg=OK`);
  assert.ok(calls[0].opts.signal instanceof AbortSignal);
  assert.deepEqual(errors, []);
});

test("down sends the message encoded and truncated to 200", async () => {
  mockFetch(() => new Response("ok"));
  const msg = `2026-10-28: GitHub personal: 401 Bad credentials ${"x".repeat(300)}`;
  await pushStatus(URL_, "down", msg);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, `${URL_}?status=down&msg=${encodeURIComponent(msg.slice(0, 200))}`);
  assert.ok(calls[0].url.includes("2026-10-28%3A%20GitHub"));
});

for (const url of [undefined, ""]) {
  test(`no call when the URL is ${JSON.stringify(url)}`, async () => {
    mockFetch(() => new Response("ok"));
    await pushStatus(url, "up", "OK");
    assert.equal(calls.length, 0);
  });
}

test("a rejected request logs and resolves", async () => {
  mockFetch(() => Promise.reject(new Error("ECONNREFUSED")));
  await pushStatus(URL_, "up", "OK");
  assert.equal(errors.length, 1);
  assert.match(errors[0], /ECONNREFUSED/);
});

test("a non-2xx response logs and resolves", async () => {
  mockFetch(() => new Response("nope", { status: 500 }));
  await pushStatus(URL_, "up", "OK");
  assert.equal(errors.length, 1);
  assert.match(errors[0], /500/);
});
