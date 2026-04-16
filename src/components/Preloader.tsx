import { useEffect, useState } from "react";
import brixonLogo from "@/assets/brixon-logo-white.png";

const Preloader = ({ onComplete }: { onComplete: () => void }) => {
  const [fade, setFade] = useState(false);
  const [slowNetwork, setSlowNetwork] = useState(false);

  useEffect(() => {
    const slowTimer = setTimeout(() => setSlowNetwork(true), 3000);
    const timer = setTimeout(() => setFade(true), 1200);
    const done = setTimeout(onComplete, 1700);
    return () => {
      clearTimeout(slowTimer);
      clearTimeout(timer);
      clearTimeout(done);
    };
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-primary transition-opacity duration-500 ${
        fade ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      <img src={brixonLogo} alt="Brixon" className="w-48 object-contain" />
      <div className="mt-6 w-12 h-0.5 bg-primary-foreground/30 overflow-hidden rounded-full">
        <div className="h-full bg-primary-foreground animate-[loader_1.2s_ease-in-out_infinite]" />
      </div>
      {slowNetwork && !fade && (
        <p className="mt-4 text-primary-foreground/60 text-xs animate-fade-in">
          Loading, please wait...
        </p>
      )}
      <style>{`
        @keyframes loader {
          0% { width: 0%; margin-left: 0; }
          50% { width: 100%; margin-left: 0; }
          100% { width: 0%; margin-left: 100%; }
        }
      `}</style>
    </div>
  );
};

export default Preloader;
