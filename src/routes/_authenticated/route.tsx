import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { onAuthStateChanged } from "firebase/auth";

import { firebaseAuth } from "@/integrations/firebase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    // Vänta på att Firebase Auth initierat och laddat ev. sparad session.
    const user = await new Promise((resolve) => {
      const avsluta = onAuthStateChanged(firebaseAuth(), (u) => {
        avsluta();
        resolve(u);
      });
    });
    if (!user) throw redirect({ to: "/auth" });
    return { user };
  },
  component: () => <Outlet />,
});
