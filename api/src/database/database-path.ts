import * as fs from 'node:fs';
import * as path from 'node:path';
import Database from 'better-sqlite3';

const API_ROOT = path.resolve(__dirname, '../..');
const REPO_ROOT = path.resolve(API_ROOT, '..');
const DEFAULT_DATABASE_PATH = './data/database.sqlite';

type DatabaseFileCandidate = {
  path: string;
  mtimeMs: number;
  size: number;
  contentScore: number;
};

export function resolveApiPath(...segments: string[]) {
  return path.resolve(API_ROOT, ...segments);
}

export function resolveRepoPath(...segments: string[]) {
  return path.resolve(REPO_ROOT, ...segments);
}

export function resolveDatabasePath(configuredPath?: string | null) {
  const normalizedPath = configuredPath?.trim() || DEFAULT_DATABASE_PATH;
  return path.isAbsolute(normalizedPath)
    ? normalizedPath
    : path.resolve(REPO_ROOT, normalizedPath);
}

function readDatabaseFileCandidate(filePath: string): DatabaseFileCandidate | null {
  try {
    const stat = fs.statSync(filePath);
    if (!stat.isFile()) {
      return null;
    }

    return {
      path: filePath,
      mtimeMs: stat.mtimeMs,
      size: stat.size,
      contentScore: readDatabaseContentScore(filePath),
    };
  } catch {
    return null;
  }
}

function readDatabaseContentScore(filePath: string) {
  let database: Database.Database | null = null;

  try {
    database = new Database(filePath, {
      readonly: true,
      fileMustExist: true,
    });

    const tables = database
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
      .all() as Array<{ name: string }>;

    return tables.reduce((total, table) => {
      if (table.name === 'typeorm_metadata') {
        return total;
      }

      const escapedTableName = table.name.replace(/"/g, '""');
      const row = database!
        .prepare(`SELECT COUNT(*) AS count FROM "${escapedTableName}"`)
        .get() as { count: number };

      return total + row.count;
    }, 0);
  } catch {
    return 0;
  } finally {
    database?.close();
  }
}

function findPreferredDatabaseFile(paths: string[]) {
  return paths
    .map((filePath) => readDatabaseFileCandidate(filePath))
    .filter((candidate): candidate is DatabaseFileCandidate => candidate !== null)
    .sort((left, right) => {
      if (right.contentScore !== left.contentScore) {
        return right.contentScore - left.contentScore;
      }

      if (right.mtimeMs !== left.mtimeMs) {
        return right.mtimeMs - left.mtimeMs;
      }

      return right.size - left.size;
    })[0];
}

function copySidecarFile(sourcePath: string, targetPath: string, suffix: string) {
  const sourceSidecarPath = `${sourcePath}${suffix}`;
  if (!fs.existsSync(sourceSidecarPath)) {
    return;
  }

  fs.copyFileSync(sourceSidecarPath, `${targetPath}${suffix}`);
}

export function prepareDatabasePath(configuredPath?: string | null) {
  const targetPath = resolveDatabasePath(configuredPath);
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });

  const candidatePaths = Array.from(
    new Set([
      targetPath,
      resolveApiPath('database.sqlite'),
      resolveApiPath('data', 'database.sqlite'),
    ]),
  );

  const preferredDatabaseFile = findPreferredDatabaseFile(candidatePaths);
  if (!preferredDatabaseFile || preferredDatabaseFile.path === targetPath) {
    return targetPath;
  }

  fs.copyFileSync(preferredDatabaseFile.path, targetPath);
  copySidecarFile(preferredDatabaseFile.path, targetPath, '-journal');
  copySidecarFile(preferredDatabaseFile.path, targetPath, '-wal');
  copySidecarFile(preferredDatabaseFile.path, targetPath, '-shm');

  const sourceLabel = path.relative(REPO_ROOT, preferredDatabaseFile.path) || preferredDatabaseFile.path;
  const targetLabel = path.relative(REPO_ROOT, targetPath) || targetPath;
  console.info(`[database] copied existing data from ${sourceLabel} to ${targetLabel}`);

  return targetPath;
}
