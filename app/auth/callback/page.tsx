import { Suspense } from "react";
import AuthCallbackClient from "./authCallbackClient";

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-gray-600">Loading authentication…</p>
        </div>
      }
    >
      <AuthCallbackClient />
    </Suspense>
  );
}
