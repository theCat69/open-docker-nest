import { describe, it, expect } from "vitest";

describe("hello-test", () => {
  it("should just say hello and pass", () => {
    const hello = "hello";
    expect(hello).toEqual("hello");
  });
})
