"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Authentication failed.");
      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-[calc(100vh-140px)] place-items-center bg-[#f7f9fe] px-6 py-12">
      <form onSubmit={submit} className="w-full max-w-md rounded-[22px] border bg-white p-8 shadow-xl shadow-blue-950/5">
        <p className="text-sm font-bold uppercase tracking-[.18em] text-[#1769ff]">CivicLoom account</p>
        <h1 className="mt-2 text-3xl font-semibold">{mode === "signin" ? "Sign in" : "Create your account"}</h1>
        <p className="mt-2 text-sm text-slate-500">Save reports to your Hostinger MySQL workspace and keep your dashboard organized.</p>

        <div className="mt-6 grid grid-cols-2 rounded-xl bg-slate-100 p-1 text-sm font-medium">
          <button
            type="button"
            onClick={() => setMode("signin")}
            className={`rounded-lg px-3 py-2 ${mode === "signin" ? "bg-white text-[#061535] shadow-sm" : "text-slate-500"}`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            className={`rounded-lg px-3 py-2 ${mode === "signup" ? "bg-white text-[#061535] shadow-sm" : "text-slate-500"}`}
          >
            Sign up
          </button>
        </div>

        {mode === "signup" && (
          <label className="mt-7 block text-sm font-medium">
            Name
            <Input className="mt-2" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
          </label>
        )}

        <label className={`${mode === "signup" ? "mt-5" : "mt-7"} block text-sm font-medium`}>
          Email
          <Input className="mt-2" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label className="mt-5 block text-sm font-medium">
          Password
          <Input className="mt-2" type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required />
        </label>

        {message && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{message}</p>}

        <Button disabled={loading} className="mt-6 w-full brand-gradient">
          {loading ? "Working..." : mode === "signin" ? "Sign in" : "Create account"}
        </Button>
      </form>
    </main>
  );
}

