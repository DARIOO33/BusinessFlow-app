import { cn } from "@/lib/utils";

// "BUSINESSFLOW" written in split-flap tiles. size "lg" for the auth panel.
export function Wordmark({ size = "sm" }: { size?: "sm" | "lg" }) {
  if (size === "sm") {
    return (
      <span role="img" aria-label="BusinessFlow" className="inline-flex gap-0.5">
        <span className="tile">Business</span>
        <span className="tile text-signal">Flow</span>
      </span>
    );
  }
  const letters = "BUSINESSFLOW".split("");
  return (
    <span role="img" aria-label="BusinessFlow" className="flex flex-wrap gap-[3px]">
      {letters.map((letter, i) => (
        <span key={i} aria-hidden="true" className={cn("tile px-[7px] py-[9px] text-xl", i >= 8 && "text-signal")}>
          {letter}
        </span>
      ))}
    </span>
  );
}
