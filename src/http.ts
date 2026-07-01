// Small wrappers around the global fetch (available in Bun) so command
// modules don't each hand-roll an https.get + Promise + manual body concat.
// These add a timeout, a status-code check, and — crucially — reject on
// network errors so the caller's try/catch actually fires instead of the
// interaction hanging until its token expires.

const DEFAULT_TIMEOUT = 10_000;

async function request(url: string, headers?: Record<string, string>): Promise<Response> {
    const res = await fetch(url, {headers, signal: AbortSignal.timeout(DEFAULT_TIMEOUT)});
    if (!res.ok) throw new Error(`Request to ${url} failed with status ${res.status}`);
    return res;
}

export async function getText(url: string, headers?: Record<string, string>): Promise<string> {
    return (await request(url, headers)).text();
}

export async function getJSON<T = unknown>(url: string, headers?: Record<string, string>): Promise<T> {
    return (await request(url, headers)).json() as Promise<T>;
}
