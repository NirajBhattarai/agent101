interface LogoProps {
  size?: number;
  className?: string;
  variant?: "full" | "icon";
}

export function Logo({ size = 40, className = "", variant = "full" }: LogoProps) {
  const iconSize = variant === "icon" ? size : size * 0.6;
  const textSize = size * 0.35;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0"
      >
        <defs>
          {/* Primary gradient - Purple to Fuchsia */}
          <linearGradient id="primaryGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: "#9333EA", stopOpacity: 1 }} />
            <stop offset="50%" style={{ stopColor: "#EC4899", stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: "#F59E0B", stopOpacity: 1 }} />
          </linearGradient>

          {/* Secondary gradient - Blue to Purple */}
          <linearGradient id="secondaryGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: "#3B82F6", stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: "#9333EA", stopOpacity: 1 }} />
          </linearGradient>

          {/* Accent gradient - Gold */}
          <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: "#F59E0B", stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: "#EF4444", stopOpacity: 1 }} />
          </linearGradient>

          {/* Glow filter */}
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Stronger glow for main elements */}
          <filter id="strongGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Pattern for circuit lines */}
          <pattern
            id="circuitPattern"
            x="0"
            y="0"
            width="20"
            height="20"
            patternUnits="userSpaceOnUse"
          >
            <path d="M 0 10 L 20 10" stroke="url(#primaryGrad)" strokeWidth="0.5" opacity="0.3" />
            <path d="M 10 0 L 10 20" stroke="url(#primaryGrad)" strokeWidth="0.5" opacity="0.3" />
          </pattern>
        </defs>

        {/* Background circle with subtle pattern */}
        <circle cx="100" cy="100" r="95" fill="url(#primaryGrad)" opacity="0.08" />
        <circle cx="100" cy="100" r="95" fill="url(#circuitPattern)" opacity="0.1" />

        {/* Main "A" shape - Geometric and bold */}
        <g transform="translate(100, 100)">
          {/* Left side of A */}
          <path
            d="M -40 60 L 0 -50 L 20 -50"
            fill="none"
            stroke="url(#primaryGrad)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#strongGlow)"
          />
          {/* Right side of A */}
          <path
            d="M 40 60 L 0 -50 L -20 -50"
            fill="none"
            stroke="url(#secondaryGrad)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#strongGlow)"
          />
          {/* Crossbar of A */}
          <line
            x1="-25"
            y1="15"
            x2="25"
            y2="15"
            stroke="url(#accentGrad)"
            strokeWidth="6"
            strokeLinecap="round"
            filter="url(#glow)"
          />
        </g>

        {/* Flowing network nodes around the A */}
        {/* Top nodes */}
        <circle cx="100" cy="30" r="8" fill="url(#primaryGrad)" filter="url(#glow)" opacity="0.9">
          <animate attributeName="r" values="8;10;8" dur="2s" repeatCount="indefinite" />
        </circle>
        <circle cx="100" cy="30" r="4" fill="white" opacity="0.95" />

        {/* Right nodes */}
        <circle
          cx="170"
          cy="100"
          r="8"
          fill="url(#secondaryGrad)"
          filter="url(#glow)"
          opacity="0.9"
        >
          <animate attributeName="r" values="8;10;8" dur="2.5s" repeatCount="indefinite" />
        </circle>
        <circle cx="170" cy="100" r="4" fill="white" opacity="0.95" />

        {/* Bottom nodes */}
        <circle cx="100" cy="170" r="8" fill="url(#primaryGrad)" filter="url(#glow)" opacity="0.9">
          <animate attributeName="r" values="8;10;8" dur="2s" repeatCount="indefinite" />
        </circle>
        <circle cx="100" cy="170" r="4" fill="white" opacity="0.95" />

        {/* Left nodes */}
        <circle cx="30" cy="100" r="8" fill="url(#secondaryGrad)" filter="url(#glow)" opacity="0.9">
          <animate attributeName="r" values="8;10;8" dur="2.5s" repeatCount="indefinite" />
        </circle>
        <circle cx="30" cy="100" r="4" fill="white" opacity="0.95" />

        {/* Diagonal nodes */}
        <circle cx="140" cy="50" r="6" fill="url(#accentGrad)" filter="url(#glow)" opacity="0.8">
          <animate attributeName="r" values="6;8;6" dur="3s" repeatCount="indefinite" />
        </circle>
        <circle cx="140" cy="50" r="3" fill="white" opacity="0.9" />

        <circle cx="60" cy="50" r="6" fill="url(#accentGrad)" filter="url(#glow)" opacity="0.8">
          <animate attributeName="r" values="6;8;6" dur="3s" repeatCount="indefinite" />
        </circle>
        <circle cx="60" cy="50" r="3" fill="white" opacity="0.9" />

        <circle cx="140" cy="150" r="6" fill="url(#accentGrad)" filter="url(#glow)" opacity="0.8">
          <animate attributeName="r" values="6;8;6" dur="3s" repeatCount="indefinite" />
        </circle>
        <circle cx="140" cy="150" r="3" fill="white" opacity="0.9" />

        <circle cx="60" cy="150" r="6" fill="url(#accentGrad)" filter="url(#glow)" opacity="0.8">
          <animate attributeName="r" values="6;8;6" dur="3s" repeatCount="indefinite" />
        </circle>
        <circle cx="60" cy="150" r="3" fill="white" opacity="0.9" />

        {/* Flowing connection lines */}
        <path
          d="M 100 30 Q 135 65 170 100"
          fill="none"
          stroke="url(#primaryGrad)"
          strokeWidth="2"
          opacity="0.3"
          strokeDasharray="4 4"
        >
          <animate
            attributeName="stroke-dashoffset"
            values="0;8"
            dur="2s"
            repeatCount="indefinite"
          />
        </path>

        <path
          d="M 170 100 Q 135 135 100 170"
          fill="none"
          stroke="url(#secondaryGrad)"
          strokeWidth="2"
          opacity="0.3"
          strokeDasharray="4 4"
        >
          <animate
            attributeName="stroke-dashoffset"
            values="0;8"
            dur="2s"
            repeatCount="indefinite"
          />
        </path>

        <path
          d="M 100 170 Q 65 135 30 100"
          fill="none"
          stroke="url(#primaryGrad)"
          strokeWidth="2"
          opacity="0.3"
          strokeDasharray="4 4"
        >
          <animate
            attributeName="stroke-dashoffset"
            values="0;8"
            dur="2s"
            repeatCount="indefinite"
          />
        </path>

        <path
          d="M 30 100 Q 65 65 100 30"
          fill="none"
          stroke="url(#secondaryGrad)"
          strokeWidth="2"
          opacity="0.3"
          strokeDasharray="4 4"
        >
          <animate
            attributeName="stroke-dashoffset"
            values="0;8"
            dur="2s"
            repeatCount="indefinite"
          />
        </path>

        {/* Animated flow particles */}
        <circle cx="100" cy="50" r="2" fill="url(#accentGrad)" opacity="0.9">
          <animateMotion dur="3s" repeatCount="indefinite">
            <path d="M 0,0 Q 35,35 70,50 Q 35,35 0,0" />
          </animateMotion>
          <animate attributeName="opacity" values="0.9;0.3;0.9" dur="3s" repeatCount="indefinite" />
        </circle>

        <circle cx="150" cy="100" r="2" fill="url(#accentGrad)" opacity="0.9">
          <animateMotion dur="3s" repeatCount="indefinite">
            <path d="M 0,0 Q -35,35 -70,50 Q -35,35 0,0" />
          </animateMotion>
          <animate attributeName="opacity" values="0.9;0.3;0.9" dur="3s" repeatCount="indefinite" />
        </circle>
      </svg>

      {/* Text logo - only show if variant is "full" */}
      {variant === "full" && (
        <div className="flex flex-col">
          <span
            className="font-bold leading-tight"
            style={{
              fontSize: `${textSize}px`,
              background: "linear-gradient(135deg, #9333EA 0%, #EC4899 50%, #F59E0B 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              letterSpacing: "-0.02em",
            }}
          >
            AgentFlow
          </span>
          <span
            className="font-semibold leading-tight opacity-80"
            style={{
              fontSize: `${textSize * 0.6}px`,
              color: "#57575B",
              letterSpacing: "0.1em",
            }}
          >
            101
          </span>
        </div>
      )}
    </div>
  );
}
