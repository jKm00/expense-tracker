export type RequestLogContext = {
  requestId: string;
  sampled: boolean;
  attrs: Record<string, unknown>;
};
