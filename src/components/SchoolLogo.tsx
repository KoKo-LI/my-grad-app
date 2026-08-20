"use client";

import { useState } from "react";
import { getSchoolChineseName, getSchoolLogoUrl, getSchoolMonogram, type SchoolIdentityInput } from "@/data/schoolIdentity";

interface SchoolLogoProps {
  className: string;
  school: SchoolIdentityInput;
}

/** Official-site favicon with a readable monogram fallback for unavailable logo assets. */
export default function SchoolLogo({ className, school }: SchoolLogoProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const logoUrl = getSchoolLogoUrl(school.officialWebsite);
  const showImage = logoUrl !== null && !imageFailed;

  return (
    <span aria-label={`${getSchoolChineseName(school)}校徽`} className={`relative overflow-hidden ${className}`} role="img">
      {showImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img alt="" className="absolute inset-0 size-full bg-white object-contain p-1.5" onError={() => setImageFailed(true)} src={logoUrl} />
      )}
      {!showImage && <span aria-hidden="true">{getSchoolMonogram(school)}</span>}
    </span>
  );
}
