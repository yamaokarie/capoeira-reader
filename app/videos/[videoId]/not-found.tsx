import Link from "next/link";

export default function VideoNotFound() {
  return (
    <div className="page">
      <div className="page-inner">
        <p className="status-message">This jogo isn’t in the library.</p>
        <Link href="/" className="watch-back">
          ← All games
        </Link>
      </div>
    </div>
  );
}
