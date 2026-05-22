import assert from "node:assert";
import fs from "node:fs";
import test, { describe } from "node:test";

import * as stream from "mini-lazystream";

const tmpDir = "tests/tmp/";
const readFile = "tests/data.md";
const writeFile = tmpDir + "data.md";

await test("fs readwrite", () => {
  return new Promise<void>((resolve, reject) => {
    let readfd, writefd;

    const readable = new stream.Readable(function () {
      return fs
        .createReadStream(readFile)
        .on("open", function (fd) {
          readfd = fd;
        })
        .on("close", function () {
          readfd = undefined;
          step();
        });
    });

    const writable = new stream.Writable(function () {
      return fs
        .createWriteStream(writeFile)
        .on("open", function (fd) {
          writefd = fd;
        })
        .on("close", function () {
          writefd = undefined;
          step();
        });
    });

    // Replaces test.equal
    assert.strictEqual(
      readfd,
      undefined,
      "Input file should not be opened until read",
    );
    assert.strictEqual(
      writefd,
      undefined,
      "Output file should not be opened until write",
    );

    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir);
    }
    if (fs.existsSync(writeFile)) {
      fs.unlinkSync(writeFile);
    }

    readable.on("end", function () {
      step();
    });
    // Note: Writable streams emit 'finish', not 'end'. Kept as 'end' to match your original flow,
    // but change to 'finish' if the original stream was an actual Writable.
    writable.on("end", function () {
      step();
    });

    let steps = 0;
    function step() {
      steps += 1;
      if (steps == 4) {
        try {
          const input = fs.readFileSync(readFile);
          const output = fs.readFileSync(writeFile);

          // Replaces test.ok buffer equality check
          assert.deepStrictEqual(input, output, "Should be equal");

          fs.unlinkSync(writeFile);
          fs.rmdirSync(tmpDir);

          resolve(); // Replaces test.done()
        } catch (err) {
          reject(err);
        }
      }
    }

    readable.pipe(writable);
  });
});
