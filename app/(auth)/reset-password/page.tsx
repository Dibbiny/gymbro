"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dumbbell, CheckCircle2 } from "lucide-react";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 8) { setError("Password must be at least 8 characters"); return; }
    if (password !== confirm) { setError("Passwords don't match"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Something went wrong"); return; }
      setDone(true);
      setTimeout(() => router.push("/login"), 2500);
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <p className="text-sm text-destructive text-center py-4">
        Invalid reset link. <Link href="/forgot-password" className="text-primary hover:underline">Request a new one</Link>.
      </p>
    );
  }

  return (
    <>
      {done ? (
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <CheckCircle2 className="h-10 w-10 text-primary" />
          <p className="font-medium">Password updated!</p>
          <p className="text-sm text-muted-foreground">Redirecting you to sign in…</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="password">New password</Label>
            <Input
              id="password"
              type="password"
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm">Confirm password</Label>
            <Input
              id="confirm"
              type="password"
              placeholder="Repeat your new password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              required
            />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Saving..." : "Set new password"}
          </Button>
        </form>
      )}
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <Card className="w-full">
      <CardHeader className="text-center space-y-2">
        <div className="flex justify-center">
          <div className="rounded-full bg-primary p-3">
            <Dumbbell className="h-6 w-6 text-primary-foreground" />
          </div>
        </div>
        <CardTitle className="text-2xl">Set new password</CardTitle>
        <CardDescription>Choose a strong password for your account</CardDescription>
      </CardHeader>
      <CardContent>
        <Suspense>
          <ResetPasswordForm />
        </Suspense>
      </CardContent>
      <CardFooter className="justify-center">
        <Link href="/login" className="text-sm text-primary font-medium hover:underline">
          Back to sign in
        </Link>
      </CardFooter>
    </Card>
  );
}
