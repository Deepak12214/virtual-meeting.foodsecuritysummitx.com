import React, { useState } from 'react';
import { MessageCircle } from 'lucide-react';

export function WhatsAppWidget() {
  const [isHovered, setIsHovered] = useState(false);
  const phoneNumber = '971585508265';
  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent('Hello! I would like to get in touch regarding Virtual Meeting Summit.')}`;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3">
      {/* Tooltip on hover */}
      {isHovered && (
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-900/90 text-white text-xs font-semibold rounded-xl backdrop-blur border border-slate-800 shadow-xl animate-in fade-in slide-in-from-right-2 duration-200">
          <span>Chat with us on WhatsApp</span>
        </div>
      )}

      {/* Floating Button */}
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="group relative flex items-center justify-center h-14 w-14 rounded-full bg-[#25D366] hover:bg-[#20ba5a] text-white shadow-lg shadow-[#25D366]/30 hover:shadow-xl hover:shadow-[#25D366]/50 hover:scale-105 active:scale-95 transition-all duration-300 no-underline"
        aria-label="Chat on WhatsApp (+971 58 550 8265)"
      >
        {/* Glowing pulse ring */}
        <span className="absolute inset-0 rounded-full bg-[#25D366] animate-ping opacity-30 pointer-events-none" />

        {/* WhatsApp Icon */}
        <MessageCircle className="h-7 w-7 text-white group-hover:rotate-12 transition-transform duration-300 fill-current" />
      </a>
    </div>
  );
}
