import { Piece } from './Piece';

export function PromotionModal({ color, onChoose }: { color: 'w' | 'b'; onChoose: (piece: string) => void }) {
  const options: { id: string; label: string }[] = [
    { id: 'q', label: 'Queen' },
    { id: 'r', label: 'Rook' },
    { id: 'b', label: 'Bishop' },
    { id: 'n', label: 'Knight' },
  ];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-5">
      <div className="bg-ink-800 border border-ink-600 rounded-lg p-8 text-center max-w-sm w-full">
        <h2 className="font-display text-2xl mb-5">Promote Pawn</h2>
        <div className="flex gap-3 justify-center">
          {options.map((o) => (
            <button
              key={o.id}
              onClick={() => onChoose(o.id)}
              className="w-16 h-16 bg-ink-900 border border-ink-600 rounded-md flex items-center justify-center hover:border-silver-400 transition-colors"
              title={o.label}
            >
              <Piece type={o.id as any} color={color} className="w-10 h-10" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
