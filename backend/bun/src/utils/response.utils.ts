import { Response } from "express";

/**
 * Standard success response structure
 */
export function successResponse<T>(
  res: Response,
  data: T,
  message = "Success",
  statusCode = 200
) {
  return res.status(statusCode).json({ success: true, message, data });
}

/**
 * Standard error response structure
 */
export function errorResponse(
  res: Response,
  error: any,
  message = "An error occurred",
  statusCode = 500
) {
  console.error("[ErrorResponse]", error);

  return res.status(statusCode).json({
    success: false,
    message,
    error: typeof error === "string" ? error : error.message || "Unknown error",
  });
}

/**
 * Handle unexpected errors globally
 */
export function handleAsyncError(
  fn: (req: any, res: Response, next: any) => Promise<any>
) {
  return (req: any, res: Response, next: any) => {
    fn(req, res, next).catch((err) => errorResponse(res, err));
  };
}
