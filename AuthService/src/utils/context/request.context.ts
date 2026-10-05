import { AsyncLocalStorage } from "async_hooks";
type RequestContext = {
    correlationId: string;
}

export const requestContext = new AsyncLocalStorage<RequestContext>();

export const getCorrelationId = () => {
  const asyncStore = requestContext.getStore();
  return asyncStore?.correlationId || 'unknown error while creating Correlation-id';
};