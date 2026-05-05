export class Password {
  private constructor(private readonly hash: string) {}

  static fromHash(hash: string): Password {
    return new Password(hash);
  }

  getHash(): string {
    return this.hash;
  }
}
