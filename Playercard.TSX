interface Props {
  name: string;
  colorLabel: string;
  active: boolean;
  capturedSvgs?: React.ReactNode;
}

export function PlayerCard({ name, colorLabel, active, capturedSvgs }: Props) {
  return (
    <div
      className={`flex items-center justify-between bg-ink-800 border rounded-md px-4 py-3 ${
        active ? 'border-silver-400' : 'border-ink-700'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-ink-900 flex items-center justify-center text-sm">
          {colorLabel === 'White' ? '♙' : '♟'}
        </div>
        <div>
          <div className="text-sm font-semibold">{name}</div>
          <div className="text-xs text-silver-400">{colorLabel}</div>
        </div>
      </div>
      {active && <span className="text-xs uppercase tracking-wide text-silver-400">Turn</span>}
      {capturedSvgs && <div className="flex gap-0.5 ml-2">{capturedSvgs}</div>}
    </div>
  );
}
