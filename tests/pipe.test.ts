import assert from "node:assert/strict";
import { test, describe } from "node:test";

import { Readable, Writable } from "mini-lazystream";

import { DummyReadable, DummyWritable } from "./helper.ts";

await describe("pipe", async () => {
  await test("readwrite", async () => {
    const expected = ["line1\n", "line2\n"];
    const actual: string[] = [];
    let readableInstantiated = false;
    let writableInstantiated = false;

    // 1. Create the lazy streams
    const readable = new Readable(() => {
      readableInstantiated = true;
      return new DummyReadable([...expected]);
    });

    const writable = new Writable(() => {
      writableInstantiated = true;
      return new DummyWritable(actual);
    });

    // 2. Assert lazy evaluation before piping starts
    assert.equal(
      readableInstantiated,
      false,
      "DummyReadable should only be instantiated when it is needed",
    );
    assert.equal(
      writableInstantiated,
      false,
      "DummyWritable should only be instantiated when it is needed",
    );

    // 3. Handle asynchronous stream completion via a Promise
    await new Promise<void>((resolve) => {
      // Note: writable streams use 'finish' when they are done writing,
      // while readable streams use 'end'.
      writable.on("finish", () => {
        assert.equal(
          actual.join(""),
          expected.join(""),
          "Piping on demand streams should keep data intact",
        );
        resolve();
      });

      readable.pipe(writable);
    });
  });
});
