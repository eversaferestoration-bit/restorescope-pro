// Standardized error response handler
export function errorResponse(message, code = 'INTERNAL_ERROR', statusCode = 500) {
  return Response.json(
    {
      success: false,
      message,
      code,
    },
    { status: statusCode }
  );
}

// Success response for consistency
export function successResponse(data = {}) {
  return Response.json({
    success: true,
    ...data,
  });
}

// Safe error logging (logs full error, returns safe message)
export function logAndSafeError(error, userMessage, code = 'INTERNAL_ERROR', statusCode = 500) {
  console.error(`[${code}]`, error);
  return errorResponse(userMessage, code, statusCode);
}