import fs from 'fs-extra';
import path from 'path';
import { config } from './config';
import L from './logger';

interface AutoResponseCaptureEntry {
  guildId: string;
  channelId: string;
  messageId: string;
  content: string;
}

interface AutoResponseCaptureRecord extends AutoResponseCaptureEntry {
  capturedAt: string;
}

// Avoid re-checking/creating the directory on every single capture.
let ensuredDir: string | undefined;

async function ensureCaptureFileDir(filePath: string): Promise<void> {
  const dir = path.dirname(filePath);
  if (ensuredDir === dir) return;
  await fs.ensureDir(dir);
  ensuredDir = dir;
}

/**
 * Appends a sent autoresponse as a JSON line to `autoResponseCaptureFilePath`, when
 * `autoResponseCaptureEnabled` is on. `entry.content` should be exactly what was sent (custom
 * emoji included) - callers must not pass along any attachment/file info, since this is meant
 * to capture text only.
 */
export async function captureAutoResponse(entry: AutoResponseCaptureEntry): Promise<void> {
  L.debug({ entry }, 'captureAutoResponse called');
  if (!config.autoResponseCaptureEnabled) {
    L.debug('Skipping autoresponse capture: autoResponseCaptureEnabled is false');
    return;
  }
  const { autoResponseCaptureFilePath } = config;
  const resolvedPath = path.resolve(autoResponseCaptureFilePath);
  try {
    L.debug({ resolvedPath }, 'Ensuring autoresponse capture file directory exists');
    await ensureCaptureFileDir(autoResponseCaptureFilePath);
    const record: AutoResponseCaptureRecord = { ...entry, capturedAt: new Date().toISOString() };
    await fs.appendFile(autoResponseCaptureFilePath, `${JSON.stringify(record)}\n`);
    L.debug({ resolvedPath, messageId: entry.messageId }, 'Captured autoresponse to file');
  } catch (err) {
    L.error({ err, resolvedPath }, 'Failed to capture autoresponse to file');
  }
}
