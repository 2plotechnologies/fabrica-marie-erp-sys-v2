import type { AxiosError } from "axios";

type ErrorPayload = {
  message?: unknown;
  error?: unknown;
  details?: unknown;
  errors?: Record<string, unknown>;
};

const GENERIC_ERROR_PATTERNS = [
  /^request failed with status code \d+$/i,
  /^network error$/i,
  /^failed to fetch$/i,
];

const isMeaningfulMessage = (value?: string | null) => {
  if (!value) return false;

  const normalized = value.trim();
  if (!normalized) return false;

  return !GENERIC_ERROR_PATTERNS.some((pattern) => pattern.test(normalized));
};

const collectFirstNestedMessage = (value: unknown): string | null => {
  if (typeof value === "string") {
    return value.trim() || null;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const nestedMessage = collectFirstNestedMessage(item);
      if (nestedMessage) return nestedMessage;
    }
    return null;
  }

  if (value && typeof value === "object") {
    const payload = value as ErrorPayload;

    const directDetails = collectFirstNestedMessage(payload.details);
    if (directDetails) return directDetails;

    const directMessage = collectFirstNestedMessage(payload.message);
    if (directMessage) return directMessage;

    const directError = collectFirstNestedMessage(payload.error);
    if (directError) return directError;

    if (payload.errors && typeof payload.errors === "object") {
      for (const fieldValue of Object.values(payload.errors)) {
        const fieldMessage = collectFirstNestedMessage(fieldValue);
        if (fieldMessage) return fieldMessage;
      }
    }
  }

  return null;
};

export const extractLaravelErrorMessage = (error: unknown): string | null => {
  if (typeof error === "string") {
    return error.trim() || null;
  }

  if (!error || typeof error !== "object") {
    return null;
  }

  const axiosError = error as AxiosError<ErrorPayload>;
  const responseMessage = collectFirstNestedMessage(axiosError.response?.data);
  if (responseMessage) return responseMessage;

  const directMessage = collectFirstNestedMessage(error);
  if (directMessage) return directMessage;

  return null;
};

export const getErrorMessage = (error: unknown, fallback = "Ocurrió un error inesperado.") => {
  const backendMessage = extractLaravelErrorMessage(error);
  if (backendMessage) return backendMessage;

  if (error instanceof Error && isMeaningfulMessage(error.message)) {
    return error.message.trim();
  }

  return fallback;
};

export const formatErrorMessage = (
  prefix: string,
  error: unknown,
  fallback = "Ocurrió un error inesperado.",
) => `${prefix}: ${getErrorMessage(error, fallback)}`;
