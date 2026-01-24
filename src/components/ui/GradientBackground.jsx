import React from 'react';

export default function GradientBackground({ variant = 'default', children, className = '' }) {
  const variants = {
    default: (
      <>
        {/* Base dark gradient */}
        <div className="fixed inset-0 bg-[#0a0a0f] pointer-events-none" />
        {/* Mesh gradient overlay */}
        <div className="fixed inset-0 opacity-40 pointer-events-none" 
          style={{
            background: `
              radial-gradient(at 0% 0%, rgba(139, 92, 246, 0.15) 0px, transparent 50%),
              radial-gradient(at 100% 0%, rgba(59, 130, 246, 0.1) 0px, transparent 50%),
              radial-gradient(at 100% 100%, rgba(139, 92, 246, 0.05) 0px, transparent 50%),
              radial-gradient(at 0% 100%, rgba(168, 85, 247, 0.08) 0px, transparent 50%)
            `
          }}
        />
        {/* Subtle noise texture */}
        <div className="fixed inset-0 opacity-[0.015] pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          }}
        />
        {/* Grid lines */}
        <div className="fixed inset-0 opacity-[0.02] pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '60px 60px'
          }}
        />
      </>
    ),
    purple: (
      <>
        <div className="fixed inset-0 bg-[#0a0a0f] pointer-events-none" />
        <div className="fixed inset-0 opacity-50 pointer-events-none" 
          style={{
            background: `
              radial-gradient(at 20% 20%, rgba(139, 92, 246, 0.2) 0px, transparent 50%),
              radial-gradient(at 80% 80%, rgba(168, 85, 247, 0.15) 0px, transparent 50%)
            `
          }}
        />
        <div className="fixed inset-0 opacity-[0.02] pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(rgba(139, 92, 246, 0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(139, 92, 246, 0.3) 1px, transparent 1px)`,
            backgroundSize: '80px 80px'
          }}
        />
      </>
    ),
    scan: (
      <>
        <div className="fixed inset-0 bg-[#0a0a0f] pointer-events-none" />
        <div className="fixed inset-0 opacity-40 pointer-events-none" 
          style={{
            background: `
              radial-gradient(at 50% 0%, rgba(16, 185, 129, 0.12) 0px, transparent 50%),
              radial-gradient(at 100% 50%, rgba(139, 92, 246, 0.08) 0px, transparent 50%)
            `
          }}
        />
        <div className="fixed inset-0 opacity-[0.02] pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '60px 60px'
          }}
        />
      </>
    )
  };

  return (
    <div className={`min-h-screen relative ${className}`}>
      {variants[variant] || variants.default}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}