import {
  Readable,
  Writable,
  type ReadableOptions,
  type WritableOptions,
} from "node:stream";

export class DummyReadable extends Readable {
  strings: string[];

  constructor(strings: string[], options?: ReadableOptions) {
    super(options);
    this.strings = strings;
    this.emit("readable");
  }

  override _read(): void {
    const next = this.strings.shift();
    if (next !== undefined) {
      this.push(Buffer.from(next));
    } else {
      this.push(null);
    }
  }
}

export class DummyWritable extends Writable {
  strings: string[];

  constructor(strings: string[], options?: WritableOptions) {
    super(options);
    this.strings = strings;
    this.emit("writable");
  }

  override _write(
    chunk: { toString: () => string },
    _encoding: unknown,
    callback?: () => void,
  ): void {
    this.strings.push(chunk.toString());
    if (callback) callback();
  }
}
