import { useEffect, useRef, useId, type ReactNode } from "react";
import { X, Volume2 } from "lucide-react";
import { pronounce, speechAvailable } from "../features/pronunciation";
export function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const d = ref.current;
    d?.showModal();
    return () => d?.close();
  }, []);
  return (
    <dialog
      aria-labelledby={titleId}
      ref={ref}
      className={wide ? "modal wide" : "modal"}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <header>
        <h2 id={titleId}>{title}</h2>
        <button
          className="icon-button"
          aria-label="Close dialog"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </header>
      {children}
    </dialog>
  );
}
export function AudioButton({
  text,
  lang,
  rate,
}: {
  text: string;
  lang: string;
  rate: number;
}) {
  return (
    <button
      className="audio-button"
      aria-label={`Pronounce ${text}`}
      title={
        speechAvailable()
          ? "Play pronunciation"
          : "Pronunciation isn't available in this browser. You can still study the written pronunciation."
      }
      onClick={() => pronounce(text, lang, rate)}
      disabled={!speechAvailable()}
    >
      <Volume2 size={19} />
    </button>
  );
}
export function Progress({ value }: { value: number }) {
  return (
    <div
      className="progress"
      role="progressbar"
      aria-label="Learning progress"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <span style={{ width: `${Math.min(100, value)}%` }} />
    </div>
  );
}
export function Empty({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="empty">
      <div className="empty-mark">✦</div>
      <h2>{title}</h2>
      {children}
    </div>
  );
}
