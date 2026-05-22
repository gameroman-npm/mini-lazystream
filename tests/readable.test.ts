import assert from "node:assert/strict";
import { test, describe } from "node:test";

import { Readable } from "mini-lazystream";

import { DummyReadable } from "./helper.ts";

await describe("readable", async () => {
  await test("dummy data consistency", async () => {
    const expected = ["line1\n", "line2\n"];
    const actual: string[] = [];

    await new Promise<void>((resolve) => {
      new DummyReadable([...expected])
        .on("data", (chunk) => {
          actual.push(chunk.toString());
        })
        .on("end", () => {
          assert.equal(
            actual.join(""),
            expected.join(""),
            "DummyReadable should produce the data it was created with",
          );
          resolve();
        });
    });
  });

  await test("passes options and execution context", () => {
    let callbackExecuted = false;

    const readable = new Readable(
      function (options) {
        callbackExecuted = true;

        // Note: arrow functions capture lexical 'this'. Using a regular function expression
        // here ensures 'this' still references the stream instance.
        assert.ok(
          this instanceof Readable,
          "Readable should bind itself to callback's this",
        );
        assert.equal(
          options.encoding,
          "utf-8",
          "Readable should make options accessible to callback",
        );

        // @ts-expect-error
        this.ok = true;
        return new DummyReadable(["test"]);
      },
      { encoding: "utf-8" },
    );

    // Triggering data flow forces instantiation
    readable.read(4);

    assert.ok(callbackExecuted, "Instantiation callback should have run");
    // @ts-expect-error
    assert.ok(readable.ok);
  });

  await test("streams2 on-demand read cycle", async () => {
    const expected = ["line1\n", "line2\n"];
    const actual: string[] = [];
    let instantiated = false;

    const readable = new Readable(() => {
      instantiated = true;
      return new DummyReadable([...expected]);
    });

    assert.equal(
      instantiated,
      false,
      "DummyReadable should only be instantiated when it is needed",
    );

    await new Promise<void>((resolve) => {
      readable.on("readable", () => {
        let chunk;
        while ((chunk = readable.read()) !== null) {
          actual.push(chunk.toString());
        }
      });

      readable.on("end", () => {
        assert.equal(
          actual.join(""),
          expected.join(""),
          "Readable should not change the data of the underlying stream",
        );
        resolve();
      });

      readable.read(0);
    });
  });

  await test("resume flow handling", async () => {
    const expected = ["line1\n", "line2\n"];
    const actual: string[] = [];
    let instantiated = false;

    const readable = new Readable(() => {
      instantiated = true;
      return new DummyReadable([...expected]);
    });

    readable.pause();

    await new Promise<void>((resolve) => {
      readable.on("data", (chunk) => {
        actual.push(chunk.toString());
      });

      readable.on("end", () => {
        assert.equal(
          actual.join(""),
          expected.join(""),
          "Readable should not change the data of the underlying stream",
        );
        resolve();
      });

      assert.equal(
        instantiated,
        false,
        "DummyReadable should only be instantiated when it is needed",
      );

      readable.resume();
    });
  });
});
