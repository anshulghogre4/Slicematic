export type ApiErr = {
  ok?: false;
  errors?: Record<string, string>;
  error?: string;
};

export type ApiOk<T> = { ok: true } & T;

export class FetchJsonError extends Error {
  status: number;
  body?: ApiErr;

  constructor(message: string, status: number, body?: ApiErr) {
    super(message);
    this.name = "FetchJsonError";
    this.status = status;
    this.body = body;
  }
}

function messageFromBody(body: ApiErr | undefined, fallback: string) {
  if (!body) return fallback;
  if (body.error) return body.error;
  const first = Object.values(body.errors ?? {})[0];
  return first ? String(first) : fallback;
}

export type FetchJsonInit = RequestInit & {
  authHeaders?: HeadersInit;
};

/**
 * Shared JSON fetch wrapper for SliceMatic API routes that return `{ ok: true, ... }`
 * or `{ ok: false, errors?/error? }`.
 */
export async function fetchJson<T>(input: RequestInfo | URL, init?: FetchJsonInit): Promise<ApiOk<T>> {
  const { authHeaders, headers, ...rest } = init ?? {};
  const response = await fetch(input, {
    ...rest,
    headers: {
      "content-type": "application/json",
      ...(authHeaders ?? {}),
      ...(headers ?? {}),
    },
  });

  const body = (await response.json().catch(() => ({}))) as ApiOk<T> | ApiErr;
  const okFlag = (body as { ok?: boolean }).ok;

  if (!response.ok || okFlag === false) {
    throw new FetchJsonError(
      messageFromBody(body as ApiErr, "Request failed."),
      response.status,
      body as ApiErr
    );
  }

  // Some routes return 200 with payload and no explicit `ok` — treat as success when HTTP ok.
  if (okFlag === undefined) {
    return { ok: true, ...(body as object) } as ApiOk<T>;
  }

  return body as ApiOk<T>;
}
