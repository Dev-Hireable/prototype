

export function Steps({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="relative flex h-14 w-full items-start">
      {steps.map((s, i) => {
        // Stepper colours — done blue, current grey, upcoming an empty ring — as solid discs. A ring
        // with a dot inside read as half-filled, and its inner gap never looked even.
        const done = i < current;
        return (
          <li key={s} aria-current={i === current ? "step" : undefined} className="relative flex h-14 min-w-0 flex-1 flex-col items-center gap-2">
            {/* 4px tall at top 14px: centred on the 32px disc. */}
            {i < steps.length - 1 && <span aria-hidden className="pointer-events-none absolute top-[14px] left-1/2 h-1 w-full bg-border" />}
            <span className={`relative z-10 size-8 rounded-full ${done ? "bg-primary" : i === current ? "bg-border" : "border-2 border-border bg-white"}`} />
            {/* A phone has room for one label: the current step's. The others stay for screen readers. */}
            <span className={`relative z-10 h-4 text-center text-[12px] leading-[1.2] tracking-[0.2px] whitespace-nowrap ${done ? "text-ink" : "text-ink-2"} ${i === current ? "max-sm:font-semibold max-sm:text-ink" : "max-sm:sr-only"}`}>{s}</span>
          </li>
        );
      })}
    </ol>
  );
}
