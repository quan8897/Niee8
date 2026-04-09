import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          background: '#5C4D3F',
          borderRadius: 6,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'serif',
          fontSize: 18,
          fontStyle: 'italic',
          color: '#F5EEE5',
          letterSpacing: '-1px',
        }}
      >
        n
      </div>
    ),
    { ...size }
  );
}
