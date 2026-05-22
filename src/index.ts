import { PassThrough } from "node:stream";
import type { Stream, TransformOptions } from "node:stream";

// Patch the given method of instance so that the callback
// is executed once, before the actual method is called the
// first time.
function beforeFirstCall(
  instance: PassThrough,
  method: "_read" | "_write",
  callback: (...args: unknown[]) => void,
): void {
  const originalMethod = instance[method];

  instance[method] = function (this: PassThrough, ...args: unknown[]) {
    // @ts-expect-error
    instance[method] = originalMethod;

    callback.apply(this, args);
    // @ts-expect-error
    return instance[method].apply(this, args);
  };
}

export class Readable extends PassThrough {
  constructor(
    fn: (this: Readable, options: TransformOptions) => Stream,
    options: TransformOptions,
  );
  constructor(
    fn: (this: Readable, options?: TransformOptions) => Stream,
    options?: TransformOptions,
  );

  constructor(
    fn: (this: Readable, options: TransformOptions) => Stream,
    options: TransformOptions,
  ) {
    super(options);

    beforeFirstCall(this, "_read", () => {
      const source = fn.call(this, options);
      const emitError = this.emit.bind(this, "error");

      source.on("error", emitError);
      source.pipe(this);
    });

    this.emit("readable");
  }
}

export class Writable extends PassThrough {
  constructor(
    fn: (this: Writable, options: TransformOptions) => NodeJS.WritableStream,
    options: TransformOptions,
  );
  constructor(
    fn: (this: Writable, options?: TransformOptions) => NodeJS.WritableStream,
    options?: TransformOptions,
  );

  constructor(
    fn: (this: Writable, options: TransformOptions) => NodeJS.WritableStream,
    options: TransformOptions,
  ) {
    super(options);

    beforeFirstCall(this, "_write", () => {
      const destination = fn.call(this, options);
      const emitError = this.emit.bind(this, "error");

      destination.on("error", emitError);
      this.pipe(destination);
    });

    this.emit("writable");
  }
}
