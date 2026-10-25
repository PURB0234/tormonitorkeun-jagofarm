"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/app/lib/supabase/client";

export default function RegisterPage() {
    const supabase = createClient();
    const router = useRouter();

    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [successMsg, setSuccessMsg] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleRegister(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError("");
        setSuccessMsg("");

        if (password !== confirmPassword) {
            setError("Konfirmasi password tidak cocok.");
            return;
        }

        if (password.length < 6) {
            setError("Password minimal 6 karakter.");
            return;
        }

        setLoading(true);

        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                },
            },
        });

        setLoading(false);

        if (error) {
            setError(error.message);
            return;
        }

        if (data.session) {
            router.replace("/beranda");
            router.refresh();
        } else {
            setSuccessMsg("Pendaftaran berhasil! Cek email untuk konfirmasi sebelum login.");
        }
    }

    return (
        <main className="flex min-h-screen items-center justify-center bg-[#0b1110] px-4 text-white">
            <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.04] p-8 shadow-2xl">
                <div className="mb-6">
                    <p className="mb-2 text-sm font-medium text-green-400">JAGOFARM WORKSPACE</p>
                    <h1 className="text-3xl font-bold">Daftar Akun Tim</h1>
                    <p className="mt-1 text-sm text-gray-400">Buat akun untuk berkolaborasi dalam pemantauan.</p>
                </div>

                {successMsg ? (
                    <div className="space-y-4">
                        <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-sm">
                            {successMsg}
                        </div>
                        <Link
                            href="/login"
                            className="block w-full text-center py-3 bg-green-600 hover:bg-green-500 rounded-lg font-semibold transition"
                        >
                            Ke Halaman Masuk
                        </Link>
                    </div>
                ) : (
                    <form onSubmit={handleRegister} className="space-y-4 text-sm">
                        <div>
                            <label className="mb-1.5 block text-gray-300">Nama Lengkap</label>
                            <input
                                type="text"
                                required
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                className="w-full rounded-lg border border-white/10 bg-black/20 px-4 py-2.5 outline-hidden focus:border-green-500 text-white"
                                placeholder="cth: Budi Santoso"
                            />
                        </div>

                        <div>
                            <label className="mb-1.5 block text-gray-300">Email</label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full rounded-lg border border-white/10 bg-black/20 px-4 py-2.5 outline-hidden focus:border-green-500 text-white"
                                placeholder="nama@email.com"
                            />
                        </div>

                        <div>
                            <label className="mb-1.5 block text-gray-300">Password</label>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full rounded-lg border border-white/10 bg-black/20 px-4 py-2.5 outline-hidden focus:border-green-500 text-white"
                                placeholder="Minimal 6 karakter"
                            />
                        </div>

                        <div>
                            <label className="mb-1.5 block text-gray-300">Konfirmasi Password</label>
                            <input
                                type="password"
                                required
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full rounded-lg border border-white/10 bg-black/20 px-4 py-2.5 outline-hidden focus:border-green-500 text-white"
                                placeholder="Ulangi password"
                            />
                        </div>

                        {error && (
                            <p role="alert" className="text-xs text-red-400">
                                {error}
                            </p>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full rounded-lg bg-green-600 px-4 py-3 font-semibold transition hover:bg-green-500 disabled:opacity-50 mt-2"
                        >
                            {loading ? "Mendaftarkan..." : "Daftar Akun"}
                        </button>

                        <p className="text-center text-xs text-gray-400 pt-2">
                            Sudah punya akun?{" "}
                            <Link href="/login" className="text-green-400 hover:underline">
                                Masuk di sini
                            </Link>
                        </p>
                    </form>
                )}
            </div>
        </main>
    );
}
