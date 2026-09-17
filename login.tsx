import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) setError(error.message);
    else navigate('/');
  }

  return (
    <div className="max-w-sm mx-auto px-5 py-20">
      <h1 className="font-display text-2xl mb-6 text-center">Welcome Back</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Email" type="email" value={email} onChange={setEmail} />
        <Field label="Password" type="password" value={password} onChange={setPassword} />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          disabled={loading}
          className="w-full bg-silver-200 text-ink-950 font-semibold py-2.5 rounded-md hover:brightness-95 disabled:opacity-50"
        >
          {loading ? 'Signing in…' : 'Log In'}
        </button>
      </form>
      <p className="text-sm text-silver-400 text-center mt-5">
        No account? <Link to="/signup" className="text-silver-200 underline">Sign up</Link>
      </p>
      <p className="text-sm text-silver-400 text-center mt-2">
        Or <Link to="/play-ai" className="text-silver-200 underline">play vs AI as a guest</Link>
      </p>
    </div>
  );
}

export function Field({
  label,
  type,
  value,
  onChange,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block text-sm">
      <span className="text-silver-400 block mb-1.5">{label}</span>
      <input
        required
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-ink-800 border border-ink-600 rounded-md px-3 py-2.5 focus:outline-none focus:border-silver-400"
      />
    </label>
  );
}
