/**
 * Model Question mutations expect JSON. Next.js can return HTML instead for a
 * missing API route, expired session, or an uncaught server/database failure.
 * Show a useful, actionable error rather than leaking a JSON SyntaxError.
 *
 * This helper never retries a mutation: the server might already have saved it.
 */
export async function readModelQuestionApiResponse<T extends Record<string, unknown>>(
  response: Response,
  action: string,
): Promise<T> {
  const status = `HTTP ${response.status}`;
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";

  // fetch follows redirects by default. Parsing a login page as JSON yields
  // "Unexpected token '<'" even if the final response status is 200.
  if (response.redirected || /\/auth\/(?:login|sign-in)(?:[/?#]|$)/i.test(response.url)) {
    throw new Error(`${action} was redirected to another page (${status}). Your login session may have expired. Sign in again, then reload the page before retrying.`);
  }

  let text: string;
  try {
    text = await response.text();
  } catch {
    throw new Error(`${action} could not read the server response (${status}). Check your connection and the Next.js terminal.`);
  }

  const trimmed = text.trim();
  const isJson = /\bapplication\/(?:[\w.-]+\+)?json\b/i.test(contentType) || trimmed.startsWith("{");
  if (!isJson) {
    if (response.status === 401 || response.status === 403) {
      throw new Error(`${action} was not authorized (${status}). Sign in as an admin and try again.`);
    }
    if (response.status === 404) {
      throw new Error(`${action} failed: API route not found (${status}). Check that the model-question API route files were installed in app/api/admin/model-question-sets/.`);
    }
    if (response.status >= 500) {
      throw new Error(`${action} failed on the server (${status}). Next.js returned an HTML error page instead of JSON. Check the terminal running npm run dev for the underlying Prisma or route error. Your unsaved text was not cleared.`);
    }
    throw new Error(`${action} received a web page or other non-JSON response (${status}). Check your admin session and the request URL in DevTools → Network.`);
  }

  let result: unknown;
  try {
    result = JSON.parse(text);
  } catch {
    throw new Error(`${action} received malformed JSON (${status}). Check the Next.js terminal and the response in DevTools → Network.`);
  }
  if (!result || typeof result !== "object" || Array.isArray(result)) {
    throw new Error(`${action} received an unexpected response format (${status}).`);
  }
  return result as T;
}
