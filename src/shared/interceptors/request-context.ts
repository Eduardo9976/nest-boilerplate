import { AsyncLocalStorage } from 'async_hooks';

interface RequestContextData {
  requestId: string;
}

const storage = new AsyncLocalStorage<RequestContextData>();

export const RequestContext = {
  run: (data: RequestContextData, fn: () => void): void => storage.run(data, fn),
  get: (): RequestContextData | undefined => storage.getStore(),
};
