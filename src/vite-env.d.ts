/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/react" />
/// <reference types="vite-plugin-pwa/info" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Wird via vite.config.ts -> define injiziert. Werte landen literal im Bundle.
declare const __APP_REV__: string;
declare const __APP_BUILT__: string;
