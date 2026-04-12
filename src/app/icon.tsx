import { ImageResponse } from 'next/og';
import { headers } from 'next/headers';

export const runtime = 'edge';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  const locale = headers().get('x-locale');
  const color = locale === 'fr' ? '#93c5fd' : '#6ee7b7';

  return new ImageResponse(
    (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="32"
        height="32"
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
        <path d="M14 2v4a2 2 0 0 0 2 2h4" />
        <path d="M10 13H8" />
        <path d="M16 13h-2" />
        <path d="M10 17H8" />
        <path d="M16 17h-2" />
      </svg>
    ),
    { ...size }
  );
}
