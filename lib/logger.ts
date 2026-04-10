// Structured logger - colored in dev, JSON in production
// Supports both signatures:
//   logger.info("message")
//   logger.info("message", { meta })
//   logger.info({ action: "x", result: "y" })
type LogLevel = "debug" | "info" | "warn" | "error";

const isProd = process.env.NODE_ENV === "production";

const colors = {
  debug: "\x1b[36m", // cyan
  info: "\x1b[32m", // green
  warn: "\x1b[33m", // yellow
  error: "\x1b[31m", // red
  reset: "\x1b[0m",
};

type LogInput = string | Record<string, unknown>;

function log(level: LogLevel, input: LogInput, meta?: Record<string, unknown>) {
  const timestamp = new Date().toISOString();

  let message: string;
  let metaObj: Record<string, unknown> | undefined;

  if (typeof input === "string") {
    message = input;
    metaObj = meta;
  } else {
    message = (input.message as string) || (input.action as string) || "log";
    const { message: _m, action: _a, ...rest } = input;
    metaObj = rest;
  }

  if (isProd) {
    console.log(JSON.stringify({ timestamp, level, message, ...metaObj }));
  } else {
    const color = colors[level];
    const prefix = `${color}[${level.toUpperCase()}]${colors.reset}`;
    console.log(`${prefix} ${timestamp} - ${message}`, metaObj ?? "");
  }
}

export const logger = {
  debug: (input: LogInput, meta?: Record<string, unknown>) =>
    log("debug", input, meta),
  info: (input: LogInput, meta?: Record<string, unknown>) =>
    log("info", input, meta),
  warn: (input: LogInput, meta?: Record<string, unknown>) =>
    log("warn", input, meta),
  error: (input: LogInput, meta?: Record<string, unknown>) =>
    log("error", input, meta),
};
