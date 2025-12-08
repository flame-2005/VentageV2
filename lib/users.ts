import { AuthError, createClient, SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "./supabase";

export const signInWithGoogle = async (): Promise<void> => {
  try {
    // Store the current path before redirecting
    const currentPath = window.location.pathname + window.location.search;
    sessionStorage.setItem("redirectAfterAuth", currentPath);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) throw error;
  } catch (error) {
    const authError = error as AuthError;
    console.error("Error signing in:", authError.message);
    alert("Failed to sign in with Google");
  }
};
