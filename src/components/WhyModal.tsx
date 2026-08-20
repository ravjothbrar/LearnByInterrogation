interface WhyModalProps {
  onClose: () => void;
}

export function WhyModal({ onClose }: WhyModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-3xl border border-[var(--accent-border)] bg-[var(--bg-panel)] p-12 shadow-2xl animate-fade-in-up text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="font-mono-tag text-sm text-[var(--accent-2)] uppercase tracking-widest">
          ◈ Why LearnByInterrogation?
        </span>

        <p className="mt-6 text-3xl leading-snug text-[var(--text-h)] font-medium">
          Write what you're learning.
          <br />
          Socrates questions it
          <br />
          <span className="text-[var(--accent-2)]">until it actually sticks.</span>
        </p>

        <p className="mt-6 text-base text-[var(--text-dim)]">
          Your notes stay on your device. Only your answers go to the AI.
        </p>

        <button
          onClick={onClose}
          className="mt-10 w-full rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-2)] text-white text-lg font-medium py-4 transition-colors"
        >
          ✦ Let's go
        </button>
      </div>
    </div>
  );
}
