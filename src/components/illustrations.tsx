/** Brand illustrations from the design handoff (house character). Decorative unless a label is given. */

/** Smiling house sipping chai: Today's "All caught up!" state. */
export function HouseWithChai({ className }: { className?: string }) {
  return (
    <svg
      width="230"
      height="190"
      viewBox="0 0 230 190"
      role="img"
      aria-label="A smiling cartoon house sipping a cup of chai"
      className={className}
    >
      <ellipse cx="115" cy="176" rx="86" ry="9" className="fill-muted" />
      <circle cx="40" cy="40" r="5" fill="#FCD34D" />
      <path d="M196 30l4 9 9 4-9 4-4 9-4-9-9-4 9-4z" fill="#F59E3B" />
      <path d="M30 96l3 6 6 3-6 3-3 6-3-6-6-3 6-3z" fill="#FDBA74" />
      <rect x="58" y="74" width="114" height="98" rx="16" fill="#FDE3BF" />
      <rect x="58" y="74" width="114" height="22" fill="#F5C98B" />
      <path d="M48 82 115 30l67 52" fill="none" stroke="#C2410C" strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="140" y="34" width="14" height="26" rx="3" fill="#9A3412" />
      <path d="M146 26q-6-8 2-14M152 24q-4-6 2-11" fill="none" stroke="#D6D3D1" strokeWidth="3" strokeLinecap="round" />
      <path d="M88 118q6-7 12 0M130 118q6-7 12 0" fill="none" stroke="#1C1917" strokeWidth="4" strokeLinecap="round" />
      <circle cx="82" cy="132" r="7" fill="#FCA5A5" opacity="0.75" />
      <circle cx="148" cy="132" r="7" fill="#FCA5A5" opacity="0.75" />
      <path d="M102 134q13 11 26 0" fill="none" stroke="#1C1917" strokeWidth="4" strokeLinecap="round" />
      <rect x="100" y="146" width="30" height="26" rx="6" fill="#C2410C" />
      <path d="M182 150c0-6 22-6 22 0l-3 18c-1 4-15 4-16 0z" fill="#FFFFFF" stroke="#1C1917" strokeWidth="3" strokeLinejoin="round" />
      <path d="M204 154q8 0 6 7t-8 5" fill="none" stroke="#1C1917" strokeWidth="3" strokeLinecap="round" />
      <ellipse cx="193" cy="150" rx="11" ry="2.5" fill="#B45309" />
      <path d="M188 140q-3-5 1-9M196 139q-3-5 1-9" fill="none" stroke="#D6D3D1" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M172 144q6 2 10 8" fill="none" stroke="#F5C98B" strokeWidth="7" strokeLinecap="round" />
    </svg>
  );
}

/** Small happy house: empty lists (Chores, Shopping, Inventory). */
export function HappyHouse({ className }: { className?: string }) {
  return (
    <svg width="150" height="120" viewBox="0 0 150 120" aria-hidden="true" className={className}>
      <ellipse cx="75" cy="108" rx="52" ry="7" className="fill-fill" />
      <rect x="35" y="40" width="80" height="62" rx="10" fill="#F5C98B" />
      <path d="M30 44 75 16l45 28" fill="none" stroke="#C2410C" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="35" y="40" width="80" height="16" fill="#E8A95B" />
      <circle cx="62" cy="72" r="4" fill="#1C1917" />
      <circle cx="88" cy="72" r="4" fill="#1C1917" />
      <circle cx="63.5" cy="70.5" r="1.3" fill="#FFFFFF" />
      <circle cx="89.5" cy="70.5" r="1.3" fill="#FFFFFF" />
      <path d="M67 84q8 6 16 0" fill="none" stroke="#1C1917" strokeWidth="3" strokeLinecap="round" />
      <circle cx="54" cy="82" r="5" fill="#F9A8A8" opacity="0.7" />
      <circle cx="96" cy="82" r="5" fill="#F9A8A8" opacity="0.7" />
      <path d="M120 30l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" fill="#F59E3B" />
    </svg>
  );
}

/** The app icon mark (smiling white house on marigold), for unlock and profile screens. */
export function AppMark({ size = 72, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" aria-hidden="true" className={className}>
      <rect width="120" height="120" rx="27" fill="#E8650F" />
      <path d="M22 58 60 26l38 32" fill="none" stroke="#FFFFFF" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M32 54v34a8 8 0 0 0 8 8h40a8 8 0 0 0 8-8V54" fill="#FFFFFF" />
      <path d="M49 68q4-4 8 0M63 68q4-4 8 0" fill="none" stroke="#9A3412" strokeWidth="3.6" strokeLinecap="round" />
      <path d="M50 78q10 9 20 0" fill="none" stroke="#9A3412" strokeWidth="3.6" strokeLinecap="round" />
      <path d="M90 22l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" fill="#FDE68A" />
    </svg>
  );
}
