export const EXIT_CODES = {
  OK: 0,
  ARGUMENT_ERROR: 2,
  AUTHENTICATION_ERROR: 3,
  RETRY_RECOMMENDED: 4,
};

export class CliError extends Error {
  exitCode: number;

  constructor(message: string, exitCode = EXIT_CODES.RETRY_RECOMMENDED) {
    super(message);
    this.name = "CliError";
    this.exitCode = exitCode;
  }
}

export class HttpError extends CliError {
  status?: number;
  body?: unknown;

  constructor(message: string, status?: number, body?: unknown, exitCode = 1) {
    super(message, exitCode);
    this.name = "HttpError";
    this.status = status;
    this.body = body;
  }
}
