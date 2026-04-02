export class CliError extends Error {
  exitCode: number;

  constructor(message: string, exitCode = 1) {
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
