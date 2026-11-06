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

export function setApiTokenProvider(provider: ApiTokenProvider): () => void {
  const previousProvider = tokenProvider;
  tokenProvider = provider;

  return () => {
    if (tokenProvider === provider) tokenProvider = previousProvider;
  };
}

export async function apiRequest<T>(path: string, init: ApiRequestInit = {}): Promise<T> {
  const { token: explicitToken, headers: requestHeaders, ...requestInit } = init;
  const token = explicitToken ?? (await tokenProvider?.());
  const headers = new Headers(requestHeaders);
  headers.set("Accept", "application/json");

  if (requestInit.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", "Bearer " + token);
  } else if (import.meta.env.DEV && import.meta.env.VITE_DEV_AUTH_UID?.trim()) {
    const devUid = import.meta.env.VITE_DEV_AUTH_UID.trim();
    headers.set("X-Dev-User-Id", devUid);
  }

  const baseUrl = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");
  const normalizedPath = path.startsWith("/") ? path : "/" + path;
  const response = await fetch(baseUrl + "/api" + normalizedPath, {
    ...requestInit,
    headers,
  });

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

