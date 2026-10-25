"use client";

import { useState } from "react";
import { Icon } from "./icon";

/** Display supplied artwork, with a neutral brand treatment when it is absent or unavailable. */
export function PublishedArtwork({
  src,
  className = "",
  eager = false,
  alt = "",
}: {
  src?: string | null;
  className?: string;
  eager?: boolean;
  alt?: string;
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  if (src && src !== failedSrc) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        className={className}
        loading={eager ? "eager" : "lazy"}
        fetchPriority={eager ? "high" : "low"}
        decoding="async"
        onError={() => setFailedSrc(src)}
      />
    );
  }

  return (
    <div className={`neutral-artwork ${className}`} aria-hidden="true">
      <span className="neutral-artwork-mark"><Icon name="film" size={48} /></span>
    </div>
  );
}
