import Link from "next/link";

export default function StudentVideoNotFound() {
  return (
    <div className="page">
      <div className="page-inner">
        <p className="status-message">This roda isn’t in the student library.</p>
        <Link href="/student" className="watch-back">
          ← All student rodas
        </Link>
      </div>
    </div>
  );
}
