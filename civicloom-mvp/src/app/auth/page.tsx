"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Mode = "signin" | "signup";

export default function Auth() {
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

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

        {mode === "signup" && (
          <label className="mt-7 block text-sm font-medium text-[#102033]">
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
