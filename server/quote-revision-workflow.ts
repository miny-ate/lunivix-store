export type PreparedQuotationRevision = {
  documentKey: string;
  documentUrl: string;
  privateCostSnapshot: Record<string, unknown>;
};

export async function createQuoteWithFirstRevision<TInput, TResult>(args: {
  input: TInput;
  createReference: () => string;
  prepare: (input: TInput, reference: string, revisionNumber: number) => Promise<PreparedQuotationRevision>;
  persist: (input: TInput, revision: PreparedQuotationRevision & { reference: string; revisionNumber: number }) => Promise<TResult>;
}) {
  const reference = args.createReference();
  const revisionNumber = 1;
  const revision = await args.prepare(args.input, reference, revisionNumber);
  const result = await args.persist(args.input, { ...revision, reference, revisionNumber });
  return { result, reference, revisionNumber, documentUrl: revision.documentUrl };
}

export async function updateQuoteWithNewRevision<TInput, TCurrent extends { reference: string }, TResult>(args: {
  quotationId: number;
  input: TInput;
  loadCurrent: (quotationId: number) => Promise<TCurrent | undefined>;
  getNextRevisionNumber: (quotationId: number) => Promise<number>;
  prepare: (input: TInput, reference: string, revisionNumber: number) => Promise<PreparedQuotationRevision>;
  persist: (quotationId: number, input: TInput, revision: PreparedQuotationRevision & { revisionNumber: number }) => Promise<TResult>;
}) {
  const current = await args.loadCurrent(args.quotationId);
  if (!current) throw new Error("Quotation was not found");
  const revisionNumber = await args.getNextRevisionNumber(args.quotationId);
  const revision = await args.prepare(args.input, current.reference, revisionNumber);
  const result = await args.persist(args.quotationId, args.input, { ...revision, revisionNumber });
  return { result, reference: current.reference, revisionNumber, documentUrl: revision.documentUrl };
}
