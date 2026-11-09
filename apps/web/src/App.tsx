import { useEffect, useState } from "react";
import type { HealthResponse } from "@ft/contracts";

type ServerStatus = "checking" | "online" | "offline";

//react component, see notes
export function App() {
  const [status, setStatus] = useState<ServerStatus>("checking");

  useEffect(() => {
    const controller = new AbortController();

    async function checkServer() {
      try {
        const response = await fetch("/api/health", { signal: controller.signal });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const health = (await response.json()) as HealthResponse;
        if (health.status !== "ok" || health.service !== "werewolf-server") {
          throw new Error("Unexpected server response");
        }

        if (!controller.signal.aborted) setStatus("online");
      } catch {
        if (!controller.signal.aborted) setStatus("offline");
      }
    }

    void checkServer();
    return () => controller.abort();
  }, []);

  //JSX, lets React modify html elements, see notes
  return (
    <main className="page">
      <h1>Loups-Garous (prototype)</h1>
      <section>
        <h2>Connection :</h2>
        <p role="status">
          Backend: {status === "checking" ? "checking…" : status === "online" ? "online" : "offline"}
        </p>
        {status === "offline" && (
          <p className="error">Cannot reach the backend !! Verify that the Express server is running.</p>
        )}
      </section>

      <section>
        <h2>Lobby</h2>
        <p className="expl">next commit</p>
      </section>
    </main>
  );
}
