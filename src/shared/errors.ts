export class WrapperError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "WrapperError";
  }
}
