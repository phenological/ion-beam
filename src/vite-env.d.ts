/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DRIVE_API_KEY?: string;
  readonly VITE_ANNOTATION_MODEL?: string;
  readonly VITE_LIBRARY_FOLDER?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
