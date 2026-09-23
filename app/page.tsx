"use client";

import { useState } from "react";
import { SelectScreen } from "@/components/SelectScreen";
import { WatchScreen } from "@/components/WatchScreen";
import type { Video } from "@/lib/types";

export default function Home() {
  const [selected, setSelected] = useState<Video | null>(null);

  if (!selected) {
    return <SelectScreen onSelect={setSelected} />;
  }

  return <WatchScreen video={selected} onBack={() => setSelected(null)} />;
}
