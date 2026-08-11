import type * as Discord from 'discord.js';
import { config } from './config';

interface PinoLogRecord {
  level: string;
  time: number;
  msg?: string;
  [key: string]: unknown;
}

const FLUSH_INTERVAL_MS = 2000;
// Leave headroom under Discord's 2000 char message cap for the surrounding code fence.
const MAX_MESSAGE_LENGTH = 1900;
// Blank line between entries so a batch of logs doesn't read as one solid, hard-to-scan block.
const LINE_SEPARATOR = '\n\n';

function formatRecord(record: PinoLogRecord): string {
  const { level, time, msg, pid, hostname, ...rest } = record;
  const timestamp = new Date(time).toISOString();
  const extra = Object.keys(rest).length ? ` ${JSON.stringify(rest)}` : '';
  const line = `[${timestamp}] ${level.toUpperCase()}: ${msg ?? ''}${extra}`;
  return line.length > MAX_MESSAGE_LENGTH ? `${line.slice(0, MAX_MESSAGE_LENGTH - 3)}...` : line;
}

function chunkLines(lines: string[], maxLength: number): string[] {
  const chunks: string[] = [];
  let current = '';
  lines.forEach((line) => {
    const candidate = current ? `${current}${LINE_SEPARATOR}${line}` : line;
    if (candidate.length > maxLength && current) {
      chunks.push(current);
      current = line;
    } else {
      current = candidate;
    }
  });
  if (current) chunks.push(current);
  return chunks;
}

/**
 * A pino destination stream that batches log lines and periodically forwards them to a
 * configured Discord channel. Meant to be used as one target of `pino.multistream()` alongside
 * the normal console output - never the only destination, since Discord delivery is best-effort.
 */
class DiscordLogStream {
  private queue: string[] = [];

  private client: Discord.Client | undefined;

  private channel: Discord.SendableChannels | undefined;

  constructor() {
    const timer = setInterval(() => {
      this.flush().catch((err) => console.error('Failed to flush logs to Discord', err));
    }, FLUSH_INTERVAL_MS);
    // Don't keep the process alive just for this timer.
    timer.unref();
  }

  /** Called once the client is logged in, so the stream can fetch/send to the log channel. */
  attachClient(client: Discord.Client): void {
    this.client = client;
  }

  /** The method name pino's stream destinations are expected to expose. */
  write(chunk: string): boolean {
    if (!config.logChannelId) return true;
    try {
      const record = JSON.parse(chunk) as PinoLogRecord;
      this.queue.push(formatRecord(record));
    } catch {
      // Not a JSON log line - ignore rather than crash the logger.
    }
    return true;
  }

  private async flush(): Promise<void> {
    if (!this.queue.length) return;
    const lines = this.queue;
    this.queue = [];
    const channel = await this.getChannel();
    if (!channel) return;
    const chunks = chunkLines(lines, MAX_MESSAGE_LENGTH);
    // eslint-disable-next-line no-restricted-syntax
    for (const content of chunks) {
      try {
        // eslint-disable-next-line no-await-in-loop
        await channel.send({
          content: `\`\`\`\n${content}\n\`\`\``,
          allowedMentions: { parse: [] },
        });
      } catch (err) {
        console.error('Failed to send log message to Discord', err);
      }
    }
  }

  private async getChannel(): Promise<Discord.SendableChannels | undefined> {
    if (!config.logChannelId || !this.client) return undefined;
    if (this.channel?.id === config.logChannelId) return this.channel;
    try {
      const channel = await this.client.channels.fetch(config.logChannelId);
      if (channel?.isSendable()) {
        this.channel = channel;
        return channel;
      }
      console.error(`Configured logChannelId ${config.logChannelId} is not a sendable channel`);
    } catch (err) {
      console.error('Failed to fetch configured log channel', err);
    }
    return undefined;
  }
}

export const discordLogStream = new DiscordLogStream();
