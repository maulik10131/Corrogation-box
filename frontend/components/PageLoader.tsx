interface PageLoaderProps {
  title?: string;
  subtitle?: string;
}

export default function PageLoader({ title = 'Loading', subtitle = 'Please wait...' }: PageLoaderProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        {/* Animated corrugated box */}
        <div className="relative w-24 h-24 mx-auto mb-6">
          <svg viewBox="0 0 100 100" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Box body */}
            <rect x="15" y="42" width="70" height="48" rx="3" fill="url(#boxGrad)" />
            {/* Corrugation lines */}
            <line x1="15" y1="54" x2="85" y2="54" stroke="#7c3aed" strokeWidth="1" strokeOpacity="0.3" />
            <line x1="15" y1="62" x2="85" y2="62" stroke="#7c3aed" strokeWidth="1" strokeOpacity="0.3" />
            <line x1="15" y1="70" x2="85" y2="70" stroke="#7c3aed" strokeWidth="1" strokeOpacity="0.3" />
            <line x1="15" y1="78" x2="85" y2="78" stroke="#7c3aed" strokeWidth="1" strokeOpacity="0.3" />
            {/* Left flap */}
            <rect x="15" y="22" width="30" height="22" rx="2" fill="url(#flapGrad)" className="origin-bottom">
              <animateTransform attributeName="transform" type="rotate" from="-40 15 44" to="0 15 44" dur="1.2s" repeatCount="indefinite" keyTimes="0;0.4;1" values="-40 15 44;0 15 44;0 15 44" />
            </rect>
            {/* Right flap */}
            <rect x="55" y="22" width="30" height="22" rx="2" fill="url(#flapGrad)">
              <animateTransform attributeName="transform" type="rotate" from="40 85 44" to="0 85 44" dur="1.2s" repeatCount="indefinite" keyTimes="0;0.4;1" values="40 85 44;0 85 44;0 85 44" />
            </rect>
            {/* Tape strip */}
            <rect x="42" y="36" width="16" height="54" rx="2" fill="#6366f1" fillOpacity="0.25" />
            <defs>
              <linearGradient id="boxGrad" x1="15" y1="42" x2="85" y2="90" gradientUnits="userSpaceOnUse">
                <stop stopColor="#818cf8" />
                <stop offset="1" stopColor="#7c3aed" />
              </linearGradient>
              <linearGradient id="flapGrad" x1="0" y1="0" x2="0" y2="1" gradientUnits="objectBoundingBox">
                <stop stopColor="#a5b4fc" />
                <stop offset="1" stopColor="#818cf8" />
              </linearGradient>
            </defs>
          </svg>
          {/* Pulse ring */}
          <div className="absolute inset-0 rounded-full border-4 border-indigo-300 opacity-40 animate-ping" style={{ animationDuration: '1.4s' }}></div>
        </div>
        <p className="text-lg font-semibold text-gray-700">{title}</p>
        <p className="text-sm text-gray-400 mt-1">{subtitle}</p>
        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 mt-4">
          <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
          <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
          <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
        </div>
      </div>
    </div>
  );
}
