import { describe, it, expect } from "vitest";

describe("hello-test-e2e", () => {
  it("should just say hello and pass", () => {
    const hello = "hello";
    expect(hello).toEqual("hello");
  });
})

