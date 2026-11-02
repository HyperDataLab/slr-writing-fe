/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly DEV: boolean;
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_API_PROXY_TARGET?: string;
  readonly VITE_DEV_AUTH_UID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

