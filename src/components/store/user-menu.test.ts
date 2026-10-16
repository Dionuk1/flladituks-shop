import { describe, it, expect } from "vitest";
import { initialsOf } from "./user-menu";
describe("initialsOf", () => {
  it("first + last name", () => expect(initialsOf("Dion", "Ukshini")).toBe("DU"));
  it("only first name", () => expect(initialsOf("Dion", "")).toBe("D"));
  it("no name → neutral", () => expect(initialsOf("", "")).toBe(""));
});
