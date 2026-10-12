
export default function OwlMascot({ className = '' }) {
  return (
    <svg
      viewBox="0 0 200 200"
      role="img"
      aria-label="SyllaBuddy's friendly studying owl"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
    >
      {/* Graduation cap */}
      <path
        d="M35 52 L100 25 L165 52 L100 78 Z"
        fill="#1D4ED8"
        stroke="#172554"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <path
        d="M58 64 L58 81 Q100 110 142 81 L142 64"
        fill="#60A5FA"
        stroke="#172554"
        strokeWidth="4"
      />
      <path
        d="M164 52 V82"
        stroke="#FBBF24"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <circle cx="164" cy="87" r="6" fill="#FBBF24" />

      {/* Owl body */}
      <path
        d="M49 103 L39 77 L75 88 Q100 76 125 88 L161 77 L151 103
           Q166 123 157 151 Q145 179 100 180 Q55 179 43 151
           Q34 123 49 103 Z"
        fill="#3B82F6"
        stroke="#172554"
        strokeWidth="4"
        strokeLinejoin="round"
      />

      {/* Face */}
      <ellipse cx="78" cy="112" rx="30" ry="33" fill="#FFFFFF" />
      <ellipse cx="122" cy="112" rx="30" ry="33" fill="#FFFFFF" />
      <circle cx="81" cy="112" r="16" fill="#172554" />
      <circle cx="119" cy="112" r="16" fill="#172554" />
      <circle cx="86" cy="106" r="6" fill="#FFFFFF" />
      <circle cx="124" cy="106" r="6" fill="#FFFFFF" />

      {/* Beak */}
      <path d="M91 132 L109 132 L100 146 Z" fill="#FBBF24" />

      {/* Open book */}
      <path
        d="M52 148 Q76 140 99 155 Q123 140 148 148
           L148 169 Q122 161 99 176 Q76 161 52 169 Z"
        fill="#FFFFFF"
        stroke="#1D4ED8"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="M100 155 V175"
        stroke="#93C5FD"
        strokeWidth="3"
      />
      <path
        d="M64 154 Q78 152 88 159 M112 159 Q125 152 137 154"
        stroke="#93C5FD"
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      {/* Tiny sparkles */}
      <path d="M24 97 L28 107 L38 111 L28 115 L24 125 L20 115 L10 111 L20 107 Z"
        fill="#FBBF24"
      />
      <path d="M174 116 L178 125 L187 129 L178 133 L174 142 L170 133 L161 129 L170 125 Z"
        fill="#60A5FA"
      />
    </svg>
  )
}
