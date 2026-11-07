/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly DEV: boolean;
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_API_PROXY_TARGET?: string;
  readonly VITE_DEV_AUTH_UID?: string;
  readonly VITE_AUTH_MODE?: string;
  readonly VITE_FIREBASE_API_KEY?: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string;
  readonly VITE_FIREBASE_PROJECT_ID?: string;
  readonly VITE_FIREBASE_APP_ID?: string;
  readonly VITE_FIREBASE_AUTH_EMULATOR_URL?: string;
  readonly VITE_FIREBASE_GOOGLE_SIGN_IN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

