import { Sprout } from "lucide-react";

// Sprout in a spinning green ring, shown inside <main> while a page's data loads.
export function PageLoading() {
  return (
    <div className="page-loading" role="status" aria-label="Loading">
      <div className="spin">
        <Sprout className="lucide" aria-hidden />
      </div>
    </div>
  );
}
