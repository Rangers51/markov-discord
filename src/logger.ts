import 'dotenv/config';
import pino from 'pino';
import PinoPretty from 'pino-pretty';
import { config } from './config';
import { discordLogStream } from './discordLogStream';

// The root logger level gates calls before they reach any destination, so it must be at least
// as permissive as the more verbose of the two configured levels, with each stream then
// filtering independently via multistream's per-stream `level`.
const rootLevel =
  pino.levels.values[config.logLevel] <= pino.levels.values[config.discordLogLevel]
    ? config.logLevel
    : config.discordLogLevel;

const logger = pino(
  {
    formatters: {
      level: (label) => {
        return { level: label };
      },
    },
    level: rootLevel,
    base: undefined,
  },
  pino.multistream([
    { stream: PinoPretty({ translateTime: `SYS:standard` }), level: config.logLevel },
    { stream: discordLogStream, level: config.discordLogLevel },
  ]),
);

export default logger;
