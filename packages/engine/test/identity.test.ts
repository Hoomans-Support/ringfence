import { describe, expect, it } from "vitest";
import { aliasPatternKey, isDisposableDomain, maskEmail, normalizeEmail } from "../src/identity";

describe("normalizeEmail", () => {
  it("strips Gmail dots", () => {
    expect(normalizeEmail("j.o.h.n.doe@gmail.com").email).toBe("johndoe@gmail.com");
    expect(normalizeEmail("johndoe@gmail.com").email).toBe("johndoe@gmail.com");
  });

  it("strips dots on Googlemail too, but not on other providers", () => {
    expect(normalizeEmail("jane.doe@googlemail.com").email).toBe("janedoe@googlemail.com");
    expect(normalizeEmail("j.doe@yahoo.com").email).toBe("j.doe@yahoo.com");
  });

  it("strips plus-aliases on every domain", () => {
    expect(normalizeEmail("john.doe+promo1@gmail.com").email).toBe("johndoe@gmail.com");
    expect(normalizeEmail("j.doe+ref88213@yahoo.com").email).toBe("j.doe@yahoo.com");
  });

  it("is case-insensitive on local part and domain", () => {
    expect(normalizeEmail("John.Doe+X@Gmail.COM").email).toBe("johndoe@gmail.com");
  });

  it("combines all three so two disguised signups collapse to one address", () => {
    const a = normalizeEmail("John.Doe+ref1@Gmail.com");
    const b = normalizeEmail("johndoe+ref2@gmail.com");
    expect(a.email).toBe(b.email);
  });

  it("flags disposable domains and leaves ordinary ones alone", () => {
    expect(normalizeEmail("a@mailinator.com").disposable).toBe(true);
    expect(normalizeEmail("a@gmail.com").disposable).toBe(false);
  });
});

describe("isDisposableDomain", () => {
  it("is case-insensitive", () => {
    expect(isDisposableDomain("Mailinator.COM")).toBe(true);
    expect(isDisposableDomain("example.com")).toBe(false);
  });
});

describe("aliasPatternKey", () => {
  it("matches patterned ring emails that differ only by a trailing number", () => {
    expect(aliasPatternKey("finrabbit01@gmail.com")).toBe(aliasPatternKey("finrabbit02@gmail.com"));
  });

  it("matches across dots, a plus-tag and trailing digits together", () => {
    expect(aliasPatternKey("ring.operator+x1@gmail.com")).toBe(aliasPatternKey("ringoperator07@gmail.com"));
  });

  it("strips dots on every domain, unlike normalizeEmail", () => {
    expect(aliasPatternKey("j.doe1@yahoo.com")).toBe(aliasPatternKey("jdoe2@yahoo.com"));
  });

  it("does not match unrelated local parts", () => {
    expect(aliasPatternKey("alice@gmail.com")).not.toBe(aliasPatternKey("bob@gmail.com"));
  });

  it("does not match the same base name on a different domain", () => {
    expect(aliasPatternKey("alice1@gmail.com")).not.toBe(aliasPatternKey("alice2@yahoo.com"));
  });
});

describe("maskEmail", () => {
  it("is deterministic: the same address always masks the same way", () => {
    expect(maskEmail("alice@gmail.com")).toBe(maskEmail("alice@gmail.com"));
  });

  it("gives different addresses different masks", () => {
    expect(maskEmail("alice@gmail.com")).not.toBe(maskEmail("bob@gmail.com"));
  });

  it("contains neither the local part nor the domain of the real address", () => {
    const masked = maskEmail("john.doe@example.com");
    expect(masked).not.toContain("john");
    expect(masked).not.toContain("doe");
    expect(masked).not.toContain("example");
    expect(masked).not.toContain("@");
  });

  it("is case-insensitive, like the mailbox it stands for", () => {
    expect(maskEmail("Alice@Gmail.com")).toBe(maskEmail("alice@gmail.com"));
  });
});
