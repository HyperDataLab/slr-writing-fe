import i18n from "@/shared/i18n/i18n";
import type { ApiEnvelope } from "@/shared/types/api.types";

/** Error codes of the writing backend's own authentication (src/middleware/auth.middleware.ts). */
const SESSION_REJECTED_CODES = new Set(["UNAUTHORIZED", "INVALID_TOKEN"]);

export type ApiTokenProvider = () => Promise<string | null>;

type ApiRequestInit = RequestInit & {
  token?: string;
};

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
    readonly requestId?: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

let tokenProvider: ApiTokenProvider | undefined;

/** Receives the token the rejected request carried, so a late answer for an old session can be ignored. */
export type UnauthorizedHandler = (rejectedToken: string) => void;

let unauthorizedHandler: UnauthorizedHandler | undefined;

/**
 * Called when the writing backend rejects the session's own token. Not for every 401: the backend also answers 401 with
 * SLR_AUTH_REJECTED when slr-be refuses the forwarded token, which is not a reason to end the user's session.
 */
export function setUnauthorizedHandler(handler: UnauthorizedHandler): () => void {
  const previous = unauthorizedHandler;
  unauthorizedHandler = handler;
  return () => {
    if (unauthorizedHandler === handler) unauthorizedHandler = previous;
  };
}

/**
 * Authentication headers for a backend call: the bearer token when a session exists, otherwise (development only) the
 * dev-auth user id. Shared with the file download, which does not go through `apiRequest`.
 */
export async function authHeaders(explicitToken?: string): Promise<{ headers: Headers; token: string | null }> {
  const token = explicitToken ?? (await tokenProvider?.()) ?? null;
  const headers = new Headers();
  if (token) {
    headers.set("Authorization", "Bearer " + token);
  } else if (import.meta.env.DEV && import.meta.env.VITE_DEV_AUTH_UID?.trim()) {
    headers.set("X-Dev-User-Id", import.meta.env.VITE_DEV_AUTH_UID.trim());
  }
  return { headers, token };
}

export function setApiTokenProvider(provider: ApiTokenProvider): () => void {
  const previousProvider = tokenProvider;
  tokenProvider = provider;

  return () => {
    if (tokenProvider === provider) tokenProvider = previousProvider;
  };
}

export async function apiRequest<T>(path: string, init: ApiRequestInit = {}): Promise<T> {
  const { token: explicitToken, headers: requestHeaders, ...requestInit } = init;
  const { headers: authHeaderSet, token } = await authHeaders(explicitToken);
  const headers = new Headers(requestHeaders);
  headers.set("Accept", "application/json");
  authHeaderSet.forEach((value, key) => headers.set(key, value));

  if (requestInit.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const baseUrl = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");
  const normalizedPath = path.startsWith("/") ? path : "/" + path;
  const response = await fetch(baseUrl + "/api" + normalizedPath, {
    ...requestInit,
    headers,
  });

  const payload = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;

  if (response.status === 401 && token && payload && !payload.success && SESSION_REJECTED_CODES.has(payload.error?.code)) {
    unauthorizedHandler?.(token);
  }

  if (!response.ok || !payload?.success) {
    const apiError = payload && !payload.success ? payload.error : undefined;
    throw new ApiError(
      apiError?.message ?? i18n.t("common.requestError"),
      response.status,
      apiError?.code ?? "REQUEST_FAILED",
      apiError?.requestId,
      apiError?.details,
    );
  }

  return payload.data;
}

/**
 * Consume an authenticated server-sent event request. `progress` events are delivered as they arrive and the
 * `complete` event resolves the request with its JSON payload. Existing API envelope errors still use ApiError.
 */
export async function apiEventStreamRequest<TProgress, TResult>(
  path: string,
  onProgress: (progress: TProgress) => void,
  init: ApiRequestInit = {},
): Promise<TResult> {
  const { token: explicitToken, headers: requestHeaders, ...requestInit } = init;
  const { headers: authHeaderSet, token } = await authHeaders(explicitToken);
  const headers = new Headers(requestHeaders);
  headers.set("Accept", "text/event-stream");
  authHeaderSet.forEach((value, key) => headers.set(key, value));

  const baseUrl = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");
  const normalizedPath = path.startsWith("/") ? path : "/" + path;
  const response = await fetch(baseUrl + "/api" + normalizedPath, {
    ...requestInit,
    headers,
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as ApiEnvelope<TResult> | null;
    if (response.status === 401 && token && payload && !payload.success && SESSION_REJECTED_CODES.has(payload.error?.code)) {
      unauthorizedHandler?.(token);
    }
    const apiError = payload && !payload.success ? payload.error : undefined;
    throw new ApiError(
      apiError?.message ?? i18n.t("common.requestError"),
      response.status,
      apiError?.code ?? "REQUEST_FAILED",
      apiError?.requestId,
      apiError?.details,
    );
  }

  if (!response.body) {
    throw new ApiError("The verification stream is unavailable.", response.status, "STREAM_UNAVAILABLE");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let eventName = "message";
  let dataLines: string[] = [];
  let hasCompletion = false;
  let completion: TResult | undefined;

  const dispatch = () => {
    if (dataLines.length === 0) {
      eventName = "message";
      return;
    }

    let data: unknown;
    try {
      data = JSON.parse(dataLines.join("\n"));
    } catch {
      throw new ApiError("The verification stream returned invalid data.", response.status, "INVALID_STREAM_DATA");
    }

    if (eventName === "progress") {
      onProgress(data as TProgress);
    } else if (eventName === "complete") {
      completion = data as TResult;
      hasCompletion = true;
    } else if (eventName === "error") {
      const errorData = data as { message?: string; status?: number; code?: string; requestId?: string };
      throw new ApiError(
        errorData.message ?? i18n.t("common.requestError"),
        errorData.status ?? 500,
        errorData.code ?? "STREAM_REQUEST_FAILED",
        errorData.requestId,
      );
    }

    eventName = "message";
    dataLines = [];
  };

  const processLine = (line: string) => {
    if (!line) {
      dispatch();
      return;
    }
    if (line.startsWith(":")) return;
    const colonIndex = line.indexOf(":");
    const field = colonIndex < 0 ? line : line.slice(0, colonIndex);
    const value = colonIndex < 0 ? "" : line.slice(colonIndex + 1).replace(/^ /, "");
    if (field === "event") eventName = value;
    if (field === "data") dataLines.push(value);
  };

  try {
    while (!hasCompletion) {
      const { value, done } = await reader.read();
      if (done) {
        buffer += decoder.decode();
        if (buffer) processLine(buffer.replace(/\r$/, ""));
        if (!hasCompletion) dispatch();
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      let newline = buffer.indexOf("\n");
      while (newline >= 0 && !hasCompletion) {
        processLine(buffer.slice(0, newline).replace(/\r$/, ""));
        buffer = buffer.slice(newline + 1);
        newline = buffer.indexOf("\n");
      }
    }
  } finally {
    reader.releaseLock();
  }

  if (!hasCompletion) {
    throw new ApiError("The verification stream ended before a report was returned.", response.status, "STREAM_INCOMPLETE");
  }
  return completion as TResult;
}

