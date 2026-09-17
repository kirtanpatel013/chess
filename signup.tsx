import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Field } from './Login';

export function Signup() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { data, error } = await signUp(email, password, username);
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    // If email confirmation is required, Supabase won't return a session yet.
    if (data.session) navigate('/');
    else setNeedsConfirmation(true);
  }

  if (needsConfirmation) {
    return (
      <div className="max-w-sm mx-auto px-5 py-20 text-center">
        <h1 className="font-display text-2xl mb-3">Check your inbox</h1>
        <p className="text-silver-400 text-sm">
          We sent a confirmation link to {email}. Confirm your email, then log in.
        </p>
        <Link to="/login" className="inline-block mt-6 text-silver-200 underline">Go to login</Link>
      </div>
    );
  }

  return (
    <div className="max-w-sm mx-auto px-5 py-20">
      <h1 className="font-display text-2xl mb-6 text-center">Create Your Account</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Username" type="text" value={username} onChange={setUsername} />
        <Field label="Email" type="email" value={email} onChange={setEmail} />
        <Field label="Password" type="password" value={password} onChange={setPassword} />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          disabled={loading}
          className="w-full bg-silver-200 text-ink-950 font-semibold py-2.5 rounded-md hover:brightness-95 disabled:opacity-50"
        >
          {loading ? 'Creating account…' : 'Sign Up'}
        </button>
      </form>
      <p className="text-sm text-silver-400 text-center mt-5">
        Already have an account? <Link to="/login" className="text-silver-200 underline">Log in</Link>
      </p>
    </div>
  );
}
