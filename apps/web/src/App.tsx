import { useEffect, useState, type FormEvent } from "react";
import { usernameSchema, type LobbySnapshot } from "@ft/contracts";
import { fetchLobbyState, LobbyApiError, register } from "./lobby/api";

//Browser storage holds the raw token, while PostgreSQL stores only its hash
//Tabs in the same browser profile therefore represent the same guest
type GuestIdentity = { playerId: string; token: string };
const STORAGE_KEY = "werewolf:guest:demo";

function loadIdentity(): GuestIdentity | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed === "object" && parsed !== null && "playerId" in parsed &&
        "token" in parsed && typeof parsed.playerId === "string" &&
        typeof parsed.token === "string" && /^[a-f0-9]{64}$/.test(parsed.token)) {
      return { playerId: parsed.playerId, token: parsed.token };
    }
  } catch { /* storage can be disabled or contain malformed data*/ }
  return null;
}

function storeIdentity(identity: GuestIdentity | null): void {
  try {
    if (identity) localStorage.setItem(STORAGE_KEY, JSON.stringify(identity));
    else localStorage.removeItem(STORAGE_KEY);
  } catch { /* this tab can still participate even without persistent storage. */ }
}

function messageFor(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong";
}

export function App() {
  const [identity, setIdentity] = useState<GuestIdentity | null>(loadIdentity);
  const [username, setUsername] = useState("");
  const [snapshot, setSnapshot] = useState<LobbySnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!identity) { setSnapshot(null); return; }
    let cancelled = false;
    setSnapshot(null);

    // Fetch once on mount/registration. Commit 4 will refresh on Socket.IO events.
    void fetchLobbyState(identity.token).then((state) => {
      if (!cancelled) setSnapshot(state);
    }).catch((cause: unknown) => {
      if (cancelled) return;
      if (cause instanceof LobbyApiError && cause.code === "UNAUTHORIZED") {
        storeIdentity(null);
        setIdentity(null);
        setError("Your guest session is no longer valid. Please register again.");
      } else {
        setError(messageFor(cause));
      }
    });
    return () => { cancelled = true; };
  }, [identity]);

  async function onRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    //share the same runtime validation rules as Express, before making a request
    const checked = usernameSchema.safeParse(username);
    if (!checked.success) {
      setError(checked.error.issues[0]?.message ?? "Invalid username");
      return;
    }
    setBusy(true);
    try {
      const credentials = await register(checked.data);
      const next = { playerId: credentials.playerId, token: credentials.token };
      storeIdentity(next);
      setIdentity(next);
      setUsername("");
    } catch (cause) {
      setError(messageFor(cause));
    } finally {
      setBusy(false);
    }
  }

  async function refresh() {
    if (!identity) return;
    setRefreshing(true);
    setError(null);
    try {
      setSnapshot(await fetchLobbyState(identity.token));
    } catch (cause) {
      if (cause instanceof LobbyApiError && cause.code === "UNAUTHORIZED") {
        storeIdentity(null);
        setIdentity(null);
        setSnapshot(null);
        setError("Your guest session is no longer valid. Please register again.");
      } else {
        setError(messageFor(cause));
      }
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <main className="page">
      <h1>Werewolf (prototype)</h1>
      <p> simple PostgreSQL + Prisma setup</p>

      <section>
        <h2>Lobby</h2>
        {!identity ? (
          <form onSubmit={(event) => { void onRegister(event); }}>
            <label htmlFor="username">Guest username</label>{" "}
            <input id="username" value={username} onChange={(event) => setUsername(event.target.value)}
              minLength={2} maxLength={20} required autoComplete="off" />{" "}
            <button disabled={busy} type="submit">{busy ? "Joining…" : "Join lobby"}</button>
          </form>
        ) : (
          <>
            <p>Signed in as <strong>{snapshot?.you.username ?? "guest"}</strong>
              {snapshot?.you.isAdmin ? " (admin)" : ""}.</p>
            <button type="button" onClick={() => { void refresh(); }} disabled={refreshing}>
              {refreshing ? "Refreshing…" : "Refresh players"}
            </button>
            <p className="hint">Updates are manual for now, Websockets in the next commit</p>
            {snapshot ? (
              <>
                <p>{snapshot.players.length} registered player(s) · Revision {snapshot.revision}</p>
                <ol className="players">
                  {snapshot.players.map((player) => (
                    <li key={player.id}>{player.username}{player.isAdmin ? " (admin)" : ""}</li>
                  ))}
                </ol>
              </>
            ) : <p role="status">Loading lobby…</p>}
          </>
        )}
        {error && <p role="alert" className="error">{error}</p>}
      </section>
    </main>
  );
}
