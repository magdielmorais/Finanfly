export interface ResilientFetchOptions {
  baseFetch?: typeof fetch;
  retryDelaysMs?: number[];
  onRetry?: (info: { attempt: number; status?: number; reason: string }) => void;
}

const DEFAULT_RETRY_DELAYS_MS = [400, 850, 1400];

export function isTransientSupabaseErrorText(text?: string | null): boolean {
  const msg = String(text || "").toLowerCase();
  if (!msg) return false;
  return (
    msg.includes("jwt issued at future") ||
    msg.includes("timeout") ||
    msg.includes("econnreset") ||
    msg.includes("etimedout") ||
    msg.includes("econnrefused") ||
    msg.includes("fetch failed") ||
    msg.includes("network") ||
    msg.includes("socket hang up") ||
    msg.includes("und_err_") ||
    msg.includes("502") ||
    msg.includes("503") ||
    msg.includes("504")
  );
}

function waitWithAbort(ms: number, signal?: AbortSignal | null): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  if (signal?.aborted) return Promise.resolve();
  return new Promise((resolve) => {
    const onAbort = () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
      resolve();
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

export function createResilientSupabaseFetch(options: ResilientFetchOptions = {}): typeof fetch {
  const baseFetch = options.baseFetch || globalThis.fetch;
  const retryDelaysMs = options.retryDelaysMs || DEFAULT_RETRY_DELAYS_MS;
  const onRetry = options.onRetry;

  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const maxAttempts = retryDelaysMs.length + 1;
    let lastError: any;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (init?.signal?.aborted) {
        return baseFetch(input, init);
      }

      const reqInput = typeof Request !== "undefined" && input instanceof Request ? input.clone() : input;

      try {
        const response = await baseFetch(reqInput, init);
        const canRetry = attempt < retryDelaysMs.length && !init?.signal?.aborted;

        if (!canRetry) {
          return response;
        }

        if (response.status === 502 || response.status === 503 || response.status === 504) {
          onRetry?.({
            attempt: attempt + 1,
            status: response.status,
            reason: `HTTP ${response.status}`,
          });
          await waitWithAbort(retryDelaysMs[attempt], init?.signal);
          continue;
        }

        if (response.status === 401 || response.status === 400) {
          let bodyText = "";
          try {
            bodyText = await response.clone().text();
          } catch {
            bodyText = "";
          }
          if (bodyText.toLowerCase().includes("jwt issued at future")) {
            onRetry?.({
              attempt: attempt + 1,
              status: response.status,
              reason: "JWT issued at future",
            });
            await waitWithAbort(retryDelaysMs[attempt], init?.signal);
            continue;
          }
        }

        return response;
      } catch (err: any) {
        lastError = err;
        const canRetry =
          attempt < retryDelaysMs.length &&
          !init?.signal?.aborted &&
          (isTransientSupabaseErrorText(err?.message || String(err)) || err?.name === "TypeError");

        if (!canRetry) {
          throw err;
        }

        onRetry?.({
          attempt: attempt + 1,
          reason: err?.message || "Transient fetch error",
        });
        await waitWithAbort(retryDelaysMs[attempt], init?.signal);
      }
    }

    throw lastError;
  };
}
