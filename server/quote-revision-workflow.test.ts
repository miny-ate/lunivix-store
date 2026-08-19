import { describe, expect, it } from "vitest";
import { createQuoteWithFirstRevision, updateQuoteWithNewRevision } from "./quote-revision-workflow";

describe("quotation revision workflow", () => {
  it("adds the next immutable revision without changing the earlier snapshot", async () => {
    const revisions: Array<{ revisionNumber: number; snapshot: Record<string, unknown> }> = [
      { revisionNumber: 1, snapshot: { validity: "14 days", privateCost: { freight: 12000, marginRate: 0.2 } } },
    ];
    const originalSnapshot = structuredClone(revisions[0]?.snapshot);
    const result = await updateQuoteWithNewRevision({
      quotationId: 27,
      input: { validity: "30 days", freight: 14000 },
      loadCurrent: async () => ({ reference: "LNX-QT-000027" }),
      getNextRevisionNumber: async () => revisions.length + 1,
      prepare: async (input, reference, revisionNumber) => ({ documentKey: `${reference}/${revisionNumber}.pdf`, documentUrl: `https://documents.example/${revisionNumber}.pdf`, privateCostSnapshot: { validity: input.validity, privateCost: { freight: input.freight, marginRate: 0.28 } } }),
      persist: async (_quotationId, _input, revision) => {
        revisions.push({ revisionNumber: revision.revisionNumber, snapshot: revision.privateCostSnapshot });
        return { persisted: true };
      },
    });

    expect(result.revisionNumber).toBe(2);
    expect(revisions).toHaveLength(2);
    expect(revisions[0]?.snapshot).toEqual(originalSnapshot);
    expect(revisions[1]?.snapshot).toEqual({ validity: "30 days", privateCost: { freight: 14000, marginRate: 0.28 } });
  });

  it("does not persist a new quotation when PDF preparation fails", async () => {
    let persisted = false;
    await expect(createQuoteWithFirstRevision({
      input: { customerName: "Lunivix Hotel" },
      createReference: () => "LNX-QT-000028",
      prepare: async () => { throw new Error("PDF storage unavailable"); },
      persist: async () => {
        persisted = true;
        return { persisted: true };
      },
    })).rejects.toThrow("PDF storage unavailable");
    expect(persisted).toBe(false);
  });

  it("does not persist an edited quotation when PDF preparation fails", async () => {
    let persisted = false;
    await expect(updateQuoteWithNewRevision({
      quotationId: 29,
      input: { validity: "30 days" },
      loadCurrent: async () => ({ reference: "LNX-QT-000029" }),
      getNextRevisionNumber: async () => 2,
      prepare: async () => { throw new Error("PDF storage unavailable"); },
      persist: async () => {
        persisted = true;
        return { persisted: true };
      },
    })).rejects.toThrow("PDF storage unavailable");
    expect(persisted).toBe(false);
  });
});
