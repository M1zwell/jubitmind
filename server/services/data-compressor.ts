/**
 * Data Compressor — Efficient handling of large local AI session datasets.
 *
 * Uses Node.js built-in zlib for gzip compression. Compressed archives are stored
 * alongside originals with .gz extension. Decompression is transparent and streamed
 * so it doesn't impact performance for large files.
 *
 * Strategy:
 * - Sessions > 1MB get auto-compressed to .jsonl.gz on export
 * - Reading compressed files uses streaming decompression (constant memory)
 * - Cache compressed stats to avoid re-scanning
 */

import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import zlib from 'zlib';
import readline from 'readline';
import { pipeline } from 'stream/promises';

const COMPRESS_THRESHOLD = 1 * 1024 * 1024; // 1MB

export interface CompressionStats {
  originalSize: number;
  compressedSize: number;
  ratio: number; // 0-1, lower is better
  path: string;
}

/**
 * Compress a file using gzip. Returns the compressed file path.
 * Does not delete the original.
 */
export async function compressFile(filePath: string): Promise<CompressionStats> {
  const outPath = filePath + '.gz';
  const stat = await fsp.stat(filePath);

  await pipeline(
    fs.createReadStream(filePath),
    zlib.createGzip({ level: 6 }),
    fs.createWriteStream(outPath),
  );

  const compressedStat = await fsp.stat(outPath);

  return {
    originalSize: stat.size,
    compressedSize: compressedStat.size,
    ratio: compressedStat.size / stat.size,
    path: outPath,
  };
}

/**
 * Decompress a .gz file back to its original. Returns original file path.
 */
export async function decompressFile(gzPath: string): Promise<string> {
  const outPath = gzPath.replace(/\.gz$/, '');
  await pipeline(
    fs.createReadStream(gzPath),
    zlib.createGunzip(),
    fs.createWriteStream(outPath),
  );
  return outPath;
}

/**
 * Stream-read lines from a file (plain or gzip-compressed).
 * Memory-efficient — doesn't load the whole file.
 */
export function createLineReader(filePath: string): readline.Interface {
  const isGzipped = filePath.endsWith('.gz');
  const inputStream = fs.createReadStream(filePath);

  const source = isGzipped
    ? inputStream.pipe(zlib.createGunzip())
    : inputStream;

  return readline.createInterface({
    input: source,
    crlfDelay: Infinity,
  });
}

/**
 * Scan a directory and compress files that exceed the threshold.
 * Returns stats for all compressed files.
 */
export async function compressLargeFiles(
  dir: string,
  pattern = '.jsonl',
): Promise<CompressionStats[]> {
  const results: CompressionStats[] = [];

  let files: string[];
  try {
    files = await fsp.readdir(dir);
  } catch {
    return results;
  }

  for (const file of files) {
    if (!file.endsWith(pattern)) continue;
    // Skip if already has a .gz companion
    if (files.includes(file + '.gz')) continue;

    const fullPath = path.join(dir, file);
    try {
      const stat = await fsp.stat(fullPath);
      if (stat.size >= COMPRESS_THRESHOLD) {
        const stats = await compressFile(fullPath);
        results.push(stats);
      }
    } catch {
      // skip problematic files
    }
  }

  return results;
}

/**
 * Get total size of files in a directory (for dashboard display).
 */
export async function getDirectorySize(dir: string): Promise<{
  totalBytes: number;
  fileCount: number;
  compressedBytes: number;
  compressedCount: number;
}> {
  let totalBytes = 0;
  let fileCount = 0;
  let compressedBytes = 0;
  let compressedCount = 0;

  let files: string[];
  try {
    files = await fsp.readdir(dir);
  } catch {
    return { totalBytes, fileCount, compressedBytes, compressedCount };
  }

  for (const file of files) {
    try {
      const stat = await fsp.stat(path.join(dir, file));
      if (stat.isFile()) {
        if (file.endsWith('.gz')) {
          compressedBytes += stat.size;
          compressedCount++;
        } else {
          totalBytes += stat.size;
          fileCount++;
        }
      }
    } catch {
      // skip
    }
  }

  return { totalBytes, fileCount, compressedBytes, compressedCount };
}
