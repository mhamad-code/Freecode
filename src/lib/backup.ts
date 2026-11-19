export interface BackupFile {
  format: 'freecode-backup';
  version: 1;
  createdAt: string;
  settings?: unknown;
  sessions?: unknown;
}

export function buildBackup(payload: { settings?: unknown; sessions?: unknown }): BackupFile {
  return {
    format: 'freecode-backup',
    version: 1,
    createdAt: new Date().toISOString(),
    ...payload,
  };
}

export function downloadJson(name: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportBackup(payload: { settings?: unknown; sessions?: unknown }): string {
  const name = `freecode-backup-${new Date().toISOString().slice(0, 10)}.json`;
  downloadJson(name, buildBackup(payload));
  return name;
}

export async function readBackup(file: File): Promise<BackupFile> {
  const parsed = JSON.parse(await file.text()) as Partial<BackupFile>;
  if (parsed.format !== 'freecode-backup') {
    throw new Error('This is not a Freecode backup file.');
  }
  if (parsed.version && parsed.version > 1) {
    throw new Error('This backup needs a newer version of Freecode.');
  }
  return parsed as BackupFile;
}
