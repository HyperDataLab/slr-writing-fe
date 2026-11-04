import { requestJson, type ApiSession } from "@/shared/api/client";

export const developmentRoles = [
  { key: "reviewer", label: "Reviewer", description: "Kiểm tra kết quả, bằng chứng và bản thảo." },
  { key: "leader", label: "Project leader", description: "Làm việc với project và rà soát nội dung." },
  { key: "admin", label: "Admin", description: "Truy cập phiên dev với quyền quản trị hệ thống." },
] as const;

interface QuickLoginResponse {
  userId: string;
  username: string;
  email: string;
  accessToken: string;
  accessTokenExpiresAt: string;
  role: string;
}

export async function quickLogin(keyLogin: string): Promise<ApiSession> {
  const result = await requestJson<QuickLoginResponse>("/slr-api/auth/dev/quick-login", undefined, {
    method: "POST",
    body: JSON.stringify({ keyLogin }),
  });
  return result;
}

const SESSION_KEY = "slrw.dev-session";

export function readSession(): ApiSession | null {
  try {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (!stored) return null;
    const session = JSON.parse(stored) as ApiSession;
    const expiresAt = Date.parse(session.accessTokenExpiresAt);
    if (!session.accessToken || !session.userId || !Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
      sessionStorage.removeItem(SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    sessionStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export function saveSession(session: ApiSession): void {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  sessionStorage.removeItem(SESSION_KEY);
}
