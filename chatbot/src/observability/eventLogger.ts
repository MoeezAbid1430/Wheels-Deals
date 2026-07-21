import { mkdir, appendFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { appConfig } from '../config.js';

type LogEvent = Record<string, unknown>;

const hashText = (value: string) => createHash('sha256').update(value).digest('hex').slice(0, 16);

export const userMessageFingerprint = (value: string) => ({
  length: value.length,
  hash: hashText(value),
});

export const logEvent = async (event: LogEvent) => {
  if (!appConfig.logEvents) return;

  const safeEvent = {
    at: new Date().toISOString(),
    ...event,
  };

  await mkdir(appConfig.logDir, { recursive: true });
  await appendFile(path.join(appConfig.logDir, 'chatbot-events.jsonl'), `${JSON.stringify(safeEvent)}\n`, 'utf8');
};
