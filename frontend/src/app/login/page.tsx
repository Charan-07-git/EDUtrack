"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const { login, signup } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [role, setRole] = useState<"TEACHER" | "STUDENT">("TEACHER");
  const [form, setForm] = useState({
    email: "",
    password: "",
    name: "",
    department: "Computer Science",
    semester: 5,
  });
  const [photo, setPhoto] = useState("");
  const [remember, setRemember] = useState(false);
  const [err, setErr] = useState("");

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert("Photo must be under 2MB");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => setPhoto(reader.result as string);
    reader.readAsDataURL(file);
  }

  const [showPassword, setShowPassword] = useState(false);

  function clearForm() {
    setForm({ email: "", password: "", name: "", department: "Computer Science", semester: 5 });
    setPhoto("");
    setErr("");
    setShowPassword(false);
  }

  function switchMode() {
    setMode(mode === "login" ? "signup" : "login");
    clearForm();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    try {
      if (mode === "login") {
        await login(form.email, form.password, role);
      } else {
        await signup({ ...form, role, photo });
      }
    } catch (x: any) {
      setErr(x.message);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-slate-900 px-4">
      <div className="w-full max-w-md text-center">

        {/* HEADER */}
        <div className="mb-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <img src="/logo.svg" alt="EDUTrack" className="w-16 h-16" />
            <h1 className="text-4xl font-extrabold text-blue-600 tracking-tight">
              EDUTrack
            </h1>
          </div>
          <p className="text-gray-400 dark:text-slate-400 text-sm font-medium">
            Your Academic Life, Simplified!
          </p>
        </div>

        {/* CARD */}
        <div className="bg-white dark:bg-slate-800 shadow-2xl rounded-3xl px-8 py-8 text-left">
            <h2 className="text-xl font-semibold text-center mb-1 text-slate-900 dark:text-white">
            {mode === "login" ? "Welcome Back!" : "Create Account"}
          </h2>
          <p className="text-sm text-gray-500 dark:text-slate-400 text-center mb-6">
            {mode === "login"
              ? "Sign in to continue to EDUTrack"
              : "Register to get started"}
          </p>

          {/* ERROR */}
          {err && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 text-sm rounded-xl text-center">
              {err}
            </div>
          )}

          {/* ROLE TOGGLE */}
          <div className="flex bg-gray-200 dark:bg-slate-700 p-1 rounded-full mb-6">
            <button
              type="button"
              className={`flex-1 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 ${
                role === "TEACHER"
                  ? "bg-blue-500 text-white shadow-md"
                  : "text-gray-400 hover:text-gray-800 dark:hover:text-white"
               }`}
               onClick={() => setRole("TEACHER")}
             >
               Teacher
             </button>
             <button
               type="button"
               className={`flex-1 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 ${
                 role === "STUDENT"
                   ? "bg-blue-500 text-white shadow-md"
                   : "text-gray-400 hover:text-gray-800 dark:hover:text-white"
              }`}
              onClick={() => setRole("STUDENT")}
            >
              Student
            </button>
          </div>

          {/* FORM */}
          <form onSubmit={submit} className="space-y-5">
            {/* SIGNUP FIELDS */}
            {mode === "signup" && (
              <>
                <div className="flex flex-col items-center mb-2">
                  <div className="relative group cursor-pointer" onClick={() => document.getElementById("signup-photo")?.click()}>
                    <div className={`w-24 h-24 rounded-full bg-gray-100 dark:bg-slate-700 border-2 border-dashed ${photo ? 'border-blue-400' : 'border-gray-300 dark:border-slate-500'} flex items-center justify-center overflow-hidden`}>
                      {photo ? (
                        <img src={photo} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <svg className="w-8 h-8 text-gray-400 dark:text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      )}
                    </div>
                    <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                      <span className="text-white text-xs font-medium">Upload</span>
                    </div>
                  </div>
                  <input id="signup-photo" type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
                  <p className="text-xs text-gray-400 dark:text-slate-400 mt-1">Add profile photo</p>
                </div>
                <input
                  type="text"
                  placeholder="Full Name"
                  className="w-full px-4 py-3 border-2 border-gray-200 dark:border-slate-600 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 transition-all duration-200 bg-gray-50 dark:bg-slate-900 text-slate-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 hover:border-gray-300 dark:hover:border-slate-500"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
                <div className="flex gap-3">
                  <input
                    type="text"
                    placeholder="Department"
                    className="flex-1 px-4 py-3 border-2 border-gray-200 dark:border-slate-600 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 transition-all duration-200 bg-gray-50 dark:bg-slate-900 text-slate-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 hover:border-gray-300 dark:hover:border-slate-500"
                    value={form.department}
                    onChange={(e) =>
                      setForm({ ...form, department: e.target.value })
                    }
                    required
                  />
                  <input
                    type="number"
                    placeholder="Semester"
                    className="w-24 px-4 py-3 border-2 border-gray-200 dark:border-slate-600 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 transition-all duration-200 bg-gray-50 dark:bg-slate-900 text-slate-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 hover:border-gray-300 dark:hover:border-slate-500"
                    value={form.semester}
                    onChange={(e) =>
                      setForm({ ...form, semester: parseInt(e.target.value) })
                    }
                    required
                  />
                </div>
              </>
            )}

            {/* EMAIL */}
            <input
              type="email"
              placeholder="Email Address"
              className="w-full px-4 py-3 border-2 border-gray-200 dark:border-slate-600 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 transition-all duration-200 bg-gray-50 dark:bg-slate-900 text-slate-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 hover:border-gray-300 dark:hover:border-slate-500"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
              autoComplete="off"
            />

            {/* PASSWORD */}
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                className="w-full px-4 py-3 pr-12 border-2 border-gray-200 dark:border-slate-600 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 transition-all duration-200 bg-gray-50 dark:bg-slate-900 text-slate-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 hover:border-gray-300 dark:hover:border-slate-500"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                autoComplete="off"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-700 transition-colors"
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.228 3.228m3.228-3.228L6.228 6.228" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </button>
            </div>

            {/* REMEMBER (login only) */}
            {mode === "login" && (
              <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-blue-600 border-2 border-gray-300 rounded focus:ring-blue-400 cursor-pointer"
                  checked={remember}
                  onChange={() => setRemember(!remember)}
                />
                Remember me
              </label>
            )}

            {/* SUBMIT BUTTON */}
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold text-base hover:bg-blue-700 hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-blue-200"
            >
              {mode === "login" ? "Sign in" : "Create Account"}
            </button>
          </form>

          {/* LINKS */}
          <div className="text-center mt-6 text-sm space-y-2">
            {mode === "login" && (
              <p className="text-blue-500 cursor-pointer hover:text-blue-700 hover:underline transition-all">
                Forgot password?
              </p>
            )}

            <p className="text-gray-600 dark:text-slate-400">
              {mode === "login"
                ? "Don't have an account? "
                : "Already have an account? "}
              <span
                className="text-blue-600 font-semibold cursor-pointer hover:text-blue-800 hover:underline transition-all"
                onClick={() => switchMode()}
              >
                {mode === "login" ? "Register here" : "Sign in"}
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
