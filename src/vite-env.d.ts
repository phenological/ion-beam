/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DRIVE_API_KEY?: string;
  readonly VITE_ANNOTATION_MODEL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
