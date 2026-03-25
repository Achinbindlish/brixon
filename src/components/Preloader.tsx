import { useEffect, useState } from "react";

const Preloader = ({ onComplete }: { onComplete: () => void }) => {
  const [fade, setFade] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setFade(true), 1200);
    const done = setTimeout(onComplete, 1700);
    return () => { clearTimeout(timer); clearTimeout(done); };
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-primary transition-opacity duration-500 ${
        fade ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      <h1 className="text-4xl font-bold tracking-widest text-primary-foreground uppercase">
        Brixon
      </h1>
      <div className="mt-6 w-12 h-0.5 bg-primary-foreground/30 overflow-hidden rounded-full">
        <div className="h-full bg-primary-foreground animate-[loader_1.2s_ease-in-out_infinite]" />
      </div>
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
