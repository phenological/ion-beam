import { readKey, toMediaUrl } from "./drive";

const libraryFileId = "1fexZeg8EJ6oyWK8JjJlnktECjLhnZ65g";
const base = new URL(import.meta.env.BASE_URL, globalThis.location.origin).href;

export const librarySource = toMediaUrl(libraryFileId, readKey());
export const modelSource = new URL(import.meta.env.VITE_ANNOTATION_MODEL ?? "model.onnx", base).href;
export const matchCount = 3;
