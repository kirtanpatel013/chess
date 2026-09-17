interface Props {
  title: string;
  subtitle?: string;
  onPlayAgain: () => void;
  onHome: () => void;
}

export function GameOverModal({ title, subtitle, onPlayAgain, onHome }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-5">
      <div className="bg-ink-800 border border-ink-600 rounded-lg p-8 text-center max-w-sm w-full">
        <span className="text-xs tracking-widest uppercase text-silver-400 block mb-2">Game Over</span>
        <h2 className="font-display text-2xl mb-2">{title}</h2>
        {subtitle && <p className="text-sm text-ink-600/80 mb-6" style={{ color: '#9a9a9a' }}>{subtitle}</p>}
        <div className="flex gap-3 justify-center mt-6">
          <button onClick={onPlayAgain} className="bg-silver-200 text-ink-950 font-semibold px-5 py-2.5 rounded-md hover:brightness-95">
            Play Again
          </button>
          <button onClick={onHome} className="border border-ink-600 px-5 py-2.5 rounded-md hover:border-silver-400">
            Return Home
          </button>
        </div>
      </div>
    </div>
  );
}
