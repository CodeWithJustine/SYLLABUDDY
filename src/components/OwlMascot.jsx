export default function OwlMascot({ className = '' }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 160 160"
      role="img"
      aria-label="SyllaBuddy's friendly study owl mascot"
      className={className}
    >
      <path
        d="M35 38 L80 18 L125 38 L80 58 Z"
        fill="#1D4ED8"
        stroke="#1E3A8A"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="M52 47 V59 Q80 77 108 59 V47"
        fill="#60A5FA"
        stroke="#1E3A8A"
        strokeWidth="3"
      />
      <path
        d="M125 38 V57"
        stroke="#FBBF24"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <circle cx="125" cy="60" r="5" fill="#FBBF24" />

      <ellipse cx="80" cy="91" rx="43" ry="47" fill="#3B82F6" />
      <ellipse cx="80" cy="102" rx="29" ry="31" fill="#DBEAFE" />
      <ellipse cx="42" cy="98" rx="12" ry="25" fill="#2563EB" />
      <ellipse cx="118" cy="98" rx="12" ry="25" fill="#2563EB" />

      <circle cx="64" cy="77" r="20" fill="white" />
      <circle cx="96" cy="77" r="20" fill="white" />
      <circle cx="66" cy="79" r="11" fill="#172554" />
      <circle cx="94" cy="79" r="11" fill="#172554" />
      <circle cx="69" cy="75" r="4" fill="white" />
      <circle cx="97" cy="75" r="4" fill="white" />

      <path d="M72 91 L88 91 L80 103 Z" fill="#F59E0B" />

      <path
        d="M44 111 Q62 105 80 119 Q98 105 116 111 L116 138 Q98 132 80 145 Q62 132 44 138 Z"
        fill="#FFFFFF"
        stroke="#1D4ED8"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path d="M80 119 V144" stroke="#93C5FD" strokeWidth="3" />
      <path
        d="M52 119 Q64 117 72 123 M52 127 Q64 125 72 131 M88 123 Q98 117 108 119 M88 131 Q98 125 108 127"
        stroke="#93C5FD"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />

      <path
        d="M63 147 L58 151 M63 147 L67 151 M97 147 L92 151 M97 147 L102 151"
        stroke="#F59E0B"
        strokeWidth="4"
        strokeLinecap="round"
      />

      <path
        d="M20 72 L23 79 L30 82 L23 85 L20 92 L17 85 L10 82 L17 79 Z"
        fill="#60A5FA"
      />
      <path
        d="M139 79 L142 85 L148 88 L142 91 L139 97 L136 91 L130 88 L136 85 Z"
        fill="#FBBF24"
      />
    </svg>
  )
}
