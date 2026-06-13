import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { LogIn, Eye, EyeOff, ArrowLeft } from "lucide-react";

const Login: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [loading, setLoading] = useState(false);
  const { login, signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password.trim()) {
      setError("Preencha todos os campos.");
      return;
    }
    setLoading(true);
    if (mode === "signup") {
      const res = await signUp(email.trim(), password);
      setLoading(false);
      if (!res.ok) {
        setError(res.error || "Não foi possível criar a conta.");
        return;
      }
      // After signup, log in automatically
      const loginRes = await login(email.trim(), password);
      if (loginRes.ok) navigate("/admin");
      else setError("Conta criada. Faça login para continuar.");
      return;
    }
    const res = await login(email.trim(), password);
    setLoading(false);
    if (res.ok) {
      navigate("/admin");
    } else {
      setError("Credenciais inválidas.");
    }
  };

  return (
    <div className="min-h-screen bg-primary flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        className="w-full max-w-[420px] bg-card rounded-2xl card-shadow p-8"
      >
        {/* Back */}
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </button>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-primary-foreground font-bold text-2xl">CCB</span>
          </div>
          <h1 className="text-2xl font-bold text-primary tracking-tight">
            {mode === "signup" ? "Criar Conta Admin" : "Acesso Administrativo"}
          </h1>
          <p className="text-muted-foreground mt-2 text-base">
            Patrimônio CCB Digital · v1.4
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seuemail@exemplo.com"
              autoComplete="email"
              className="w-full touch-target px-4 rounded-xl bg-secondary border-0 border-b-2 border-transparent focus:border-primary focus:outline-none text-base transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">Senha</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === "signup" ? "Mínimo 6 caracteres" : "Digite sua senha"}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                className="w-full touch-target px-4 pr-12 rounded-xl bg-secondary border-0 border-b-2 border-transparent focus:border-primary focus:outline-none text-base transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {error && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-destructive text-sm font-medium text-center">
              {error}
            </motion.p>
          )}

          <motion.button
            type="submit"
            disabled={loading}
            whileTap={{ scale: 0.96 }}
            className="w-full touch-target bg-primary text-primary-foreground font-bold rounded-xl text-lg flex items-center justify-center gap-2 mt-6 transition-all hover:brightness-110 disabled:opacity-60"
          >
            <LogIn className="w-5 h-5" />
            {loading ? "AGUARDE..." : mode === "signup" ? "CRIAR CONTA" : "ENTRAR"}
          </motion.button>

          <button
            type="button"
            onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); }}
            className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors mt-2"
          >
            {mode === "login"
              ? "Primeiro acesso? Criar conta de administrador"
              : "Já tem conta? Fazer login"}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

export default Login;
