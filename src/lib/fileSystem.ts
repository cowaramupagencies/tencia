let backupDirHandle: FileSystemDirectoryHandle | null = null;

export function hasFileSystemAccess(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

export async function pickBackupDirectory(): Promise<FileSystemDirectoryHandle | null> {
  if (!hasFileSystemAccess()) return null;
  try {
    // @ts-expect-error File System Access API
    backupDirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
    return backupDirHandle;
  } catch {
    return null;
  }
}

export function getBackupDirectoryName(): string | null {
  return backupDirHandle?.name ?? null;
}

export async function saveFileToBackupDir(filename: string, blob: Blob): Promise<boolean> {
  if (!backupDirHandle) return false;
  try {
    const fileHandle = await backupDirHandle.getFileHandle(filename, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(blob);
    await writable.close();
    return true;
  } catch {
    return false;
  }
}

export async function saveTextToBackupDir(filename: string, content: string): Promise<boolean> {
  return saveFileToBackupDir(filename, new Blob([content], { type: 'text/plain' }));
}

export async function saveJsonToBackupDir(filename: string, data: unknown): Promise<boolean> {
  return saveFileToBackupDir(
    filename,
    new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
  );
}
