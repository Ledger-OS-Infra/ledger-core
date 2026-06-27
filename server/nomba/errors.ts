export class NombaApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
    readonly description?: string,
  ) {
    super(message);
    this.name = "NombaApiError";
  }
}

export class NombaAuthError extends NombaApiError {
  constructor(message: string, status: number, code?: string, description?: string) {
    super(message, status, code, description);
    this.name = "NombaAuthError";
  }
}

export class NombaValidationError extends NombaApiError {
  constructor(message: string, status: number, code?: string, description?: string) {
    super(message, status, code, description);
    this.name = "NombaValidationError";
  }
}

export class NombaNotFoundError extends NombaApiError {
  constructor(message: string, status: number, code?: string, description?: string) {
    super(message, status, code, description);
    this.name = "NombaNotFoundError";
  }
}

export class NombaForbiddenError extends NombaApiError {
  constructor(message: string, status: number, code?: string, description?: string) {
    super(message, status, code, description);
    this.name = "NombaForbiddenError";
  }
}

export class NombaServerError extends NombaApiError {
  constructor(message: string, status: number, code?: string, description?: string) {
    super(message, status, code, description);
    this.name = "NombaServerError";
  }
}

export class NombaRateLimitError extends NombaApiError {
  constructor(message: string, status: number, code?: string, description?: string) {
    super(message, status, code, description);
    this.name = "NombaRateLimitError";
  }
}

interface NombaErrorRule {
  when: (status: number, code?: string) => boolean;
  create: (
    message: string,
    status: number,
    code?: string,
    description?: string,
  ) => NombaApiError;
}


const NOMBA_ERROR_RULES: NombaErrorRule[] = [
  {
    when: (status, code) =>
      status === 400 || code === "400",
    create: (message, status, code, description) =>
      new NombaValidationError(message, status, code, description ?? message),
  },
  {
    when: (status) => status === 401,
    create: (message, status, code, description) =>
      new NombaAuthError(message, status, code, description),
  },
  {
    when: (status) => status === 403,
    create: (message, status, code, description) =>
      new NombaForbiddenError(message, status, code, description),
  },
  {
    when: (status) => status === 404,
    create: (message, status, code, description) =>
      new NombaNotFoundError(message, status, code, description),
  },
  {
    when: (status) => status === 429,
    create: (message, status, code, description) =>
      new NombaRateLimitError(message, status, code, description),
  },
  {
    when: (status) => status >= 500,
    create: (message, status, code, description) =>
      new NombaServerError(message, status, code, description),
  },
];

export function mapNombaHttpError(
  status: number,
  code?: string,
  description?: string,
): NombaApiError {
  const message = description ?? `Nomba API request failed (${status})`;

  const mapped = NOMBA_ERROR_RULES.flatMap((rule) =>
    rule.when(status, code) ? [rule.create(message, status, code, description)] : [],
  );

  return mapped[0] ?? new NombaApiError(message, status, code, description);
}

export function isRetryableNombaError(error: unknown): boolean {
  if (!(error instanceof NombaApiError)) {
    return true;
  }

  return (
    error instanceof NombaRateLimitError ||
    error instanceof NombaServerError
  );
}
