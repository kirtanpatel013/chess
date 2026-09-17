import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabaseClient';

export function Profile() {
  const { profile, reloadProfile, user } = useAuth();
  const [username, setUsername] = useState(profile?.username ?? '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!user || !profile) {
    return <div className="text-center py-24 text-silver-400">Authentication Required</div>;
  }

  async function save() {
    setSaving(true);
    setMessage(null);
    const { error } = await supabase.from('profiles').update({ username, avatar_url: avatarUrl || null }).eq('id', user!.id);
    setSaving(false);
    if (error) setMessage(error.message.includes('duplicate') ? 'That username is taken.' : 'Something went wrong.');
    else {
      setMessage('Saved.');
      reloadProfile();
    }
  }

  return (
    <div className="max-w-xl mx-auto px-5 py-14">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-16 h-16 rounded-full bg-ink-800 border border-ink-700 flex items-center justify-center text-2xl overflow-hidden">
          {profile.avatar_url ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" /> : '♞'}
        </div>
        <div>
          <h1 className="font-display text-2xl">{profile.username}</h1>
          <p className="text-silver-400 text-sm">Rating {profile.rating}</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-10">
        <Stat label="Played" value={profile.games_played} />
        <Stat label="Wins" value={profile.wins} />
        <Stat label="Losses" value={profile.losses} />
        <Stat label="Draws" value={profile.draws} />
      </div>

      <div className="bg-ink-800 border border-ink-700 rounded-lg p-6 space-y-4">
        <h3 className="font-display text-lg">Edit Profile</h3>
        <label className="block text-sm">
          <span className="text-silver-400 block mb-1.5">Username</span>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full bg-ink-900 border border-ink-600 rounded-md px-3 py-2.5 focus:outline-none focus:border-silver-400"
          />
        </label>
        <label className="block text-sm">
          <span className="text-silver-400 block mb-1.5">Avatar URL</span>
          <input
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder="https://…"
            className="w-full bg-ink-900 border border-ink-600 rounded-md px-3 py-2.5 focus:outline-none focus:border-silver-400"
          />
        </label>
        <button onClick={save} disabled={saving} className="bg-silver-200 text-ink-950 font-semibold px-5 py-2.5 rounded-md disabled:opacity-50">
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
        {message && <p className="text-sm text-silver-400">{message}</p>}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-ink-800 border border-ink-700 rounded-md py-3 text-center">
      <div className="font-display text-xl">{value}</div>
      <div className="text-[11px] text-silver-400 uppercase tracking-wide">{label}</div>
    </div>
  );
}
