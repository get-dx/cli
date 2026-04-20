import pc from "picocolors";

const LOG_LEVELS = ["debug", "info", "warn", "error"] as const;

export type LogLevel = (typeof LOG_LEVELS)[number];

type LogFields = Record<string, unknown>;

type LoggerOptions = {
  json: boolean;
};

type LogEntry = {
  fields?: LogFields;
  level: LogLevel;
  message: string;
  time: string;
};

export interface Logger {
  debug(message: string, fields?: LogFields): void;
  error(message: string, fields?: LogFields): void;
  info(message: string, fields?: LogFields): void;
  warn(message: string, fields?: LogFields): void;
}

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

export function createLogger(options: LoggerOptions): Logger {
  const configuredLevel = parseLogLevel(process.env.DX_LOG_LEVEL);

  if (!configuredLevel) {
    return createNoopLogger();
  }

  return {
    debug(message, fields) {
      writeLog(configuredLevel, options, "debug", message, fields);
    },
    info(message, fields) {
      writeLog(configuredLevel, options, "info", message, fields);
    },
    warn(message, fields) {
      writeLog(configuredLevel, options, "warn", message, fields);
    },
    error(message, fields) {
      writeLog(configuredLevel, options, "error", message, fields);
    },
  };
}

export function parseLogLevel(value: string | undefined): LogLevel | null {
  if (!value) {
    return null;
  }

  const normalized = value.toLowerCase();
  if (LOG_LEVELS.includes(normalized as LogLevel)) {
    return normalized as LogLevel;
  }

  return null;
}

function createNoopLogger(): Logger {
  const noop = () => {};

  return {
    debug: noop,
    error: noop,
    info: noop,
    warn: noop,
  };
}

function writeLog(
  configuredLevel: LogLevel,
  options: LoggerOptions,
  level: LogLevel,
  message: string,
  fields?: LogFields,
): void {
  if (LOG_LEVEL_PRIORITY[level] < LOG_LEVEL_PRIORITY[configuredLevel]) {
    return;
  }

  const entry: LogEntry = {
    fields,
    level,
    message,
    time: new Date().toISOString(),
  };

  if (options.json) {
    process.stderr.write(
      JSON.stringify({
        time: entry.time,
        level: entry.level,
        message: entry.message,
        ...(entry.fields ?? {}),
      }) + "\n",
    );
    return;
  }

  const renderedFields =
    entry.fields && Object.keys(entry.fields).length > 0
      ? ` ${JSON.stringify(entry.fields)}`
      : "";
  process.stderr.write(
    `${pc.dim(entry.time)} ${colorizeLevel(entry.level)} ${entry.message}${pc.dim(renderedFields)}\n`,
  );
}

function colorizeLevel(level: LogLevel): string {
  switch (level) {
    case "debug":
      return pc.blue("DEBUG");
    case "info":
      return pc.bold("INFO");
    case "warn":
      return pc.yellow("WARN");
    case "error":
      return pc.red("ERROR");
  }
}
