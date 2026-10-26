/** RecallMap mark: three linked nodes on a blue tile. */
export default function RecallMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="11" fill="#0866FF" />
      <path d="M9 21 16 10l7 11" stroke="#ffffff" strokeWidth="1.9" fill="none" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx="9" cy="21" r="3.2" fill="#ffffff" />
      <circle cx="16" cy="10" r="3.2" fill="#ffffff" />
      <circle cx="23" cy="21" r="3.2" fill="#ffffff" />
    </svg>
  );
}
