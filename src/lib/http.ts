import { NextResponse } from "next/server"

/** A failure that maps directly onto an HTTP status code. */
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
    this.name = "HttpError"
  }
}

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status })
}

export const unauthorized = () => jsonError("Unauthorized", 401)
export const forbidden = (message = "Forbidden") => jsonError(message, 403)
export const notFound = (message = "Not found") => jsonError(message, 404)
export const badRequest = (message = "Invalid input") => jsonError(message, 400)
export const conflict = (message = "Conflict") => jsonError(message, 409)
export const serverError = (message = "Failed to complete the request") =>
  jsonError(message, 500)

/**
 * Reads a JSON body without throwing when the payload is malformed.
 * A broken payload is a client error (400), never a server error (500).
 */
export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json()
  } catch {
    return undefined
  }
}

/** Turns a thrown HttpError into a response; anything else is a 500. */
export function errorResponse(e: unknown) {
  if (e instanceof HttpError) {
    return jsonError(e.message, e.status)
  }
  console.error("unhandled route error:", e)
  return serverError()
}
