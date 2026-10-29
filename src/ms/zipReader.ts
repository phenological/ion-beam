import { inflateSync } from "fflate";

export interface ZipEntry {
  name: string;
  method: number;
  encrypted: boolean;
  compressedSize: number;
  size: number;
  headerOffset: number;
}

interface Directory {
  offset: number;
  size: number;
  count: number;
}

const endSignature = 0x06054b50;
const zip64EndSignature = 0x06064b50;
const zip64LocatorSignature = 0x07064b50;
const centralSignature = 0x02014b50;
const localSignature = 0x04034b50;
const zip64ExtraId = 0x0001;
const maxU32 = 0xffffffff;
const endSize = 22;
const zip64LocatorSize = 20;
const zip64EndSize = 56;
const centralSize = 46;
const localSize = 30;
const maxCommentSize = 0xffff;
const storedMethod = 0;
const deflateMethod = 8;

const nameDecoder = new TextDecoder();

async function readView(zip: Blob, from: number, to: number): Promise<DataView> {
  return new DataView(await zip.slice(from, to).arrayBuffer());
}

function readU64(view: DataView, at: number): number {
  return Number(view.getBigUint64(at, true));
}

function findEnd(tail: DataView): number {
  for (let at = tail.byteLength - endSize; at >= 0; at -= 1) {
    if (tail.getUint32(at, true) === endSignature) return at;
  }
  return -1;
}

async function readDirectory(zip: Blob): Promise<Directory> {
  const tailStart = Math.max(0, zip.size - endSize - maxCommentSize - zip64LocatorSize);
  const tail = await readView(zip, tailStart, zip.size);
  const endAt = findEnd(tail);
  if (endAt < 0) throw new Error("this is not a zip file");

  const locatorAt = endAt - zip64LocatorSize;
  if (locatorAt >= 0 && tail.getUint32(locatorAt, true) === zip64LocatorSignature) {
    const recordAt = readU64(tail, locatorAt + 8);
    const record = await readView(zip, recordAt, recordAt + zip64EndSize);
    if (record.getUint32(0, true) !== zip64EndSignature) {
      throw new Error("the zip64 directory is damaged");
    }
    return {
      count: readU64(record, 32),
      size: readU64(record, 40),
      offset: readU64(record, 48),
    };
  }

  return {
    count: tail.getUint16(endAt + 10, true),
    size: tail.getUint32(endAt + 12, true),
    offset: tail.getUint32(endAt + 16, true),
  };
}

function applyZip64Extra(
  view: DataView,
  extraStart: number,
  extraEnd: number,
  entry: ZipEntry,
): void {
  let at = extraStart;
  while (at + 4 <= extraEnd) {
    const id = view.getUint16(at, true);
    const length = view.getUint16(at + 2, true);
    if (id === zip64ExtraId) {
      let field = at + 4;
      if (entry.size === maxU32) {
        entry.size = readU64(view, field);
        field += 8;
      }
      if (entry.compressedSize === maxU32) {
        entry.compressedSize = readU64(view, field);
        field += 8;
      }
      if (entry.headerOffset === maxU32) {
        entry.headerOffset = readU64(view, field);
      }
      return;
    }
    at += 4 + length;
  }
}

export async function listEntries(zip: Blob): Promise<ZipEntry[]> {
  const directory = await readDirectory(zip);
  const view = await readView(zip, directory.offset, directory.offset + directory.size);
  const entries: ZipEntry[] = [];
  let at = 0;
  for (let index = 0; index < directory.count; index += 1) {
    if (view.getUint32(at, true) !== centralSignature) {
      throw new Error("the zip directory is damaged");
    }
    const nameLength = view.getUint16(at + 28, true);
    const extraLength = view.getUint16(at + 30, true);
    const commentLength = view.getUint16(at + 32, true);
    const nameStart = at + centralSize;
    const nameBytes = new Uint8Array(view.buffer, nameStart, nameLength);
    const entry: ZipEntry = {
      name: nameDecoder.decode(nameBytes),
      method: view.getUint16(at + 10, true),
      encrypted: (view.getUint16(at + 8, true) & 1) === 1,
      compressedSize: view.getUint32(at + 20, true),
      size: view.getUint32(at + 24, true),
      headerOffset: view.getUint32(at + 42, true),
    };
    const extraStart = nameStart + nameLength;
    applyZip64Extra(view, extraStart, extraStart + extraLength, entry);
    entries.push(entry);
    at = extraStart + extraLength + commentLength;
  }
  return entries;
}

export async function readEntry(zip: Blob, entry: ZipEntry): Promise<Uint8Array> {
  if (entry.encrypted) throw new Error(`${entry.name} is encrypted`);
  if (entry.size === 0) return new Uint8Array(0);

  const header = await readView(zip, entry.headerOffset, entry.headerOffset + localSize);
  if (header.getUint32(0, true) !== localSignature) {
    throw new Error(`${entry.name} is damaged in the zip`);
  }
  const start =
    entry.headerOffset + localSize + header.getUint16(26, true) + header.getUint16(28, true);
  const stored = new Uint8Array(
    await zip.slice(start, start + entry.compressedSize).arrayBuffer(),
  );
  if (entry.method === storedMethod) return stored;
  if (entry.method === deflateMethod) {
    return inflateSync(stored, { out: new Uint8Array(entry.size) });
  }
  throw new Error(`${entry.name} uses an unsupported compression method (${entry.method})`);
}
