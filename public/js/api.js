// Calls to our own server. Errors come back as readable messages for the UI.

export async function postJson(url, body) {
  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
  } catch {
    throw new Error("The server isn’t reachable. Is it running?");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `The server answered ${res.status}.`);
  return data;
}
