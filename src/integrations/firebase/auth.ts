import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

// Klientmiddleware: bifogar inloggad användares Firebase ID-token till
// serverfunktioner. Registreras som functionMiddleware i src/start.ts.
export const attachFirebaseAuth = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    const { firebaseAuth } = await import("./client");
    const token = await firebaseAuth().currentUser?.getIdToken();
    return next({ headers: token ? { Authorization: `Bearer ${token}` } : {} });
  },
);

// Servermiddleware: verifierar Firebase ID-token och exponerar userId.
export const requireFirebaseAuth = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const authHeader = getRequest()?.headers.get("authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!token) throw new Error("Unauthorized: No token provided");

    const { adminAuth } = await import("./server");
    let userId: string;
    try {
      const decoded = await adminAuth().verifyIdToken(token);
      userId = decoded.uid;
    } catch {
      throw new Error("Unauthorized: Invalid token");
    }

    return next({ context: { userId } });
  },
);
