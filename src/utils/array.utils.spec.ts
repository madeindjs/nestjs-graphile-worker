import * as assert from "node:assert/strict";
import { describe, it } from "node:test";
import { uniq } from "./array.utils";

describe("uniq", () => {
  it("should make array unique", () => {
    assert.deepEqual(uniq([1, 2, 2, 3]), [1, 2, 3]);
  });

  it("should not change unique array", () => {
    assert.deepEqual(uniq([1, 2, 3]), [1, 2, 3]);
  });
});
