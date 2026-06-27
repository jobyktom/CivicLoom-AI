"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Mode = "signin" | "signup";
type ProviderMap = Record<string, { id: string; name: string; type: string }>;

function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09Z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z" />
      <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84Z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06L5.84 9.9C6.71 7.31 9.14 5.38 12 5.38Z" />
    </svg>
  );
}

export default function Auth() {
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleAvailable, setGoogleAvailable] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/auth/providers")
      .then((response) => (response.ok ? response.json() : null))
      .then((providers: ProviderMap | null) => setGoogleAvailable(Boolean(providers?.google)))
      .catch(() => setGoogleAvailable(false));

    fetch("/api/auth/me")
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (payload?.user) router.replace("/dashboard");
      })
      .catch(() => {});
  }, [router]);

  async function continueWithGoogle() {
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/auth/csrf");
      const payload = (await response.json()) as { csrfToken?: string };
      if (!response.ok || !payload.csrfToken) throw new Error("Unable to start Google sign-in.");

      const form = document.createElement("form");
      form.method = "POST";
      form.action = "/api/auth/signin/google";

      const csrfInput = document.createElement("input");
      csrfInput.type = "hidden";
      csrfInput.name = "csrfToken";
      csrfInput.value = payload.csrfToken;
      form.appendChild(csrfInput);

      const callbackInput = document.createElement("input");
      callbackInput.type = "hidden";
      callbackInput.name = "callbackUrl";
      callbackInput.value = `${window.location.origin}/dashboard`;
      form.appendChild(callbackInput);

      document.body.appendChild(form);
      form.submit();
    } catch (error) {
      setLoading(false);
      setMessage(error instanceof Error ? error.message : "Unable to start Google sign-in.");
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      if (mode === "signup") {
        const response = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password }),
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Authentication failed.");
      }

      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) throw new Error("Invalid email or password.");
      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-[calc(100vh-140px)] place-items-center bg-[#faf9f6] px-6 py-12">
      <form onSubmit={submit} className="w-full max-w-md rounded-[22px] border border-[#d6cebf] bg-white p-8 shadow-[0_14px_36px_rgba(16,32,51,.06)]">
        <p className="text-sm font-bold uppercase tracking-[.18em] text-[#285f8f]">CivicLoom account</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#102033]">{mode === "signin" ? "Sign in" : "Create your account"}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">Save reports to your Hostinger MySQL workspace and keep your dashboard organized.</p>

        <div className="mt-6 grid grid-cols-2 rounded-xl border border-[#ded8cb] bg-[#faf9f6] p-1 text-sm font-medium">
          <button
            type="button"
            onClick={() => setMode("signin")}
            className={`rounded-lg px-3 py-2 ${mode === "signin" ? "bg-white text-[#102033] shadow-sm" : "text-slate-500"}`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            className={`rounded-lg px-3 py-2 ${mode === "signup" ? "bg-white text-[#102033] shadow-sm" : "text-slate-500"}`}
          >
            Sign up
          </button>
        </div>

        {googleAvailable && (
          <>
            <Button
              type="button"
              onClick={continueWithGoogle}
              disabled={loading}
              variant="outline"
              className="mt-6 h-11 w-full border-[#cfc7b9] bg-white text-[15px] font-semibold text-[#102033] shadow-sm transition hover:border-[#b8ad9d] hover:bg-[#f7f4ed]"
            >
              <GoogleMark />
              <span className="ml-3">Continue with Google</span>
            </Button>
            <div className="mt-6 flex items-center gap-3 text-xs uppercase tracking-[.16em] text-slate-400">
              <span className="h-px flex-1 bg-[#eee8dc]" />
              Or use email
              <span className="h-px flex-1 bg-[#eee8dc]" />
            </div>
          </>
        )}

        {mode === "signup" && (
          <label className={`${googleAvailable ? "mt-5" : "mt-7"} block text-sm font-medium text-[#102033]`}>
            Name
            <Input className="mt-2 border-[#cfc7b9]" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
          </label>
        )}

        <label className={`${mode === "signup" ? "mt-5" : "mt-7"} block text-sm font-medium text-[#102033]`}>
          Email
          <Input className="mt-2 border-[#cfc7b9]" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label className="mt-5 block text-sm font-medium text-[#102033]">
          Password
          <Input className="mt-2 border-[#cfc7b9]" type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required />
        </label>

        {message && <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{message}</p>}

        <Button disabled={loading} className="mt-6 w-full bg-[#18324a] text-white hover:bg-[#102033]">
          {loading ? "Working..." : mode === "signin" ? "Sign in" : "Create account"}
        </Button>
      </form>
    </main>
  );
}
