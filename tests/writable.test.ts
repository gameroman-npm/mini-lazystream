import assert from "node:assert/strict";
import { test, describe } from "node:test";

import { Writable } from "mini-lazystream";

import { DummyWritable } from "./helper.ts";

await describe("writable", async () => {
  await test("passes options and execution context", () => {
    let callbackExecuted = false;

    const writable = new Writable(
      function (options) {
        callbackExecuted = true;

        // Retained as a classic function expression to preserve dynamic context binding
        assert.ok(
          this instanceof Writable,
          "Writable should bind itself to callback's this",
        );
        assert.equal(
          options.encoding,
          "utf-8",
          "Writable should make options accessible to callback",
        );

        // @ts-expect-error
        this.ok = true;
        return new DummyWritable([]);
      },
      { encoding: "utf-8" },
    );

    // Forcing instantiation by writing data
    writable.write("test");

    assert.ok(callbackExecuted, "Instantiation callback should have run");
    // @ts-expect-error
    assert.ok(writable.ok);
  });

  await test("dummy underlying data population", () => {
    const expected = ["line1\n", "line2\n"];
    const actual: string[] = [];

    const dummy = new DummyWritable(actual);

    expected.forEach((item) => {
      // Upgraded to modern, secure Buffer allocation
      dummy.write(Buffer.from(item));
    });

    // Simple assertion to confirm data was passed down accurately
    assert.deepEqual(actual, expected);
  });

  await test("streams2 on-demand write cycle", async () => {
    const expected = ["line1\n", "line2\n"];
    const actual: string[] = [];
    let instantiated = false;

    const writable = new Writable(() => {
      instantiated = true;
      return new DummyWritable(actual);
    });

    assert.equal(
      instantiated,
      false,
      "DummyWritable should only be instantiated when it is needed",
    );

    await new Promise<void>((resolve) => {
      // Upgraded event listener to 'finish' as writable streams do not emit 'end'
      writable.on("finish", () => {
        assert.equal(
          actual.join(""),
          expected.join(""),
          "Writable should not change the data of the underlying stream",
        );
        resolve();
      });

      expected.forEach((item) => {
        writable.write(Buffer.from(item));
      });

      writable.end();
    });
  });
});
