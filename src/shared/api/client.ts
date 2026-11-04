export interface ApiSession {
  userId: string;
  username: string;
  email: string;
  accessToken: string;
  accessTokenExpiresAt: string;
  role: string;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type ApiEnvelope<T> = {
  data?: T;
  success?: boolean;
  isSuccess?: boolean;
  message?: string;
  error?: { code?: string; message?: string; details?: unknown };
  code?: string;
  errors?: unknown;
};

async function readResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") ?? "";
  const payload: unknown = contentType.includes("application/json")
    ? await response.json().catch(() => null)
    : await response.text().catch(() => "");

  const envelope = (payload && typeof payload === "object" ? payload : {}) as ApiEnvelope<T>;
  const nestedError = envelope.error;
  if (!response.ok || envelope.success === false || envelope.isSuccess === false) {
    throw new ApiError(
      nestedError?.message ?? envelope.message ?? `Yêu cầu thất bại (${response.status})`,
      response.status,
      nestedError?.code ?? envelope.code,
      nestedError?.details ?? envelope.errors,
    );
  }

  return (Object.hasOwn(envelope, "data") ? envelope.data : payload) as T;
}

export async function requestJson<T>(
  path: string,
  session?: ApiSession,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (session) {
    headers.set("Authorization", `Bearer ${session.accessToken}`);
    headers.set("X-Dev-User-Id", session.userId);
  }

  let response: Response;
  try {
    response = await fetch(path, { ...init, headers });
  } catch {
    throw new ApiError("Không kết nối được API. Kiểm tra Writing BE và SLR BE đang chạy.", 0, "NETWORK_ERROR");
  }
  return readResponse<T>(response);
}

export async function downloadFile(path: string, session: ApiSession): Promise<void> {
  const response = await fetch(path, {
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
      "X-Dev-User-Id": session.userId,
    },
  });
  if (!response.ok) {
    await readResponse(response);
    return;
  }

  const disposition = response.headers.get("content-disposition") ?? "";
  const filename = disposition.match(/filename="?([^";]+)"?/i)?.[1] ?? "submission-package.zip";
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Đã xảy ra lỗi không xác định.";
}
