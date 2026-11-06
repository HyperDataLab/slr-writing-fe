import i18n from "@/shared/i18n/i18n";
import type { ApiEnvelope } from "@/shared/types/api.types";

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

export type UnauthorizedHandler = () => void;

let unauthorizedHandler: UnauthorizedHandler | undefined;

/** Called when the backend answers 401 to a request that carried a token (expired or revoked session). */
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

  if (response.status === 401 && token) unauthorizedHandler?.();

  const payload = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;

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

