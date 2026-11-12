export function LotusMark({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <path d="M32 52C17 49 10 39 10 27c8 2 15 7 19 14-2-13 0-23 4-29 7 8 9 18 5 30 4-8 10-13 17-15 1 12-7 22-23 25Z" fill="#E8B64C" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M32 52c-9-5-14-13-15-23 8 4 13 11 16 21M33 51c7-6 11-13 13-23M18 52c9 3 20 3 29-1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M8 56c15-3 32-2 48 0" stroke="#C9573B" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function ChiliDoodle({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 70" fill="none" aria-hidden="true">
      <path d="M77 17c-5 6-7 13-7 20-1 19-19 28-40 19-12-5-17-13-18-20 10 8 20 7 28 1 11-8 14-19 20-25" fill="#C9573B" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M59 14c3-8 11-10 20-8-2 7-8 13-18 13" fill="#7C9A72" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M22 43c12 8 29 4 36-7" stroke="#F5EEDF" strokeWidth="2" strokeLinecap="round" opacity=".65" />
    </svg>
  );
}

export function LeafDoodle({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 120 100" fill="none" aria-hidden="true">
      <path d="M19 85C9 46 30 16 91 9c12 43-12 75-53 70" fill="#D9DFC0" stroke="currentColor" strokeWidth="2" />
      <path d="M19 87C38 55 55 40 88 15M39 59l-2-25M54 46l25 2M66 33l-1-13M33 70l21 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export function ArrowDoodle() {
  return (
    <svg viewBox="0 0 42 20" width="42" height="20" fill="none" aria-hidden="true">
      <path d="M2 11c12-3 23-3 35-1M30 4l8 5-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
