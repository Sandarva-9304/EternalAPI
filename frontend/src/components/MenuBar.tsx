import { useEffect, useState } from "react";
import { SignOutButton } from "@clerk/clerk-react";
import { Minus, Square, Copy, X } from "lucide-react"; // better icons
import * as React from "react";

const MenuBar = () => {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    // Initialize state
    let cleanupMax: (() => void) | null = null;
    let cleanupUnmax: (() => void) | null = null;

    const init = async () => {
      const maximized = await window.electronAPI.isMaximized();
      setIsMaximized(maximized);

      cleanupMax = window.electronAPI.onMaximize(() => setIsMaximized(true));
      cleanupUnmax = window.electronAPI.onUnmaximize(() => setIsMaximized(false));
    };
    init();

    return () => {
      cleanupMax?.();
      cleanupUnmax?.();
    };
  }, []);

  return (
    <div
      className="flex items-center justify-between bg-primary-sidebar text-neutral-300 h-8 px-1 select-none border-b border-primary"
      style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
    >
      {/* Left: App Menu */}
      <div
        className="flex space-x-2 text-sm"
        style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
      >
        <button className="hover:bg-gray-700 px-2 py-1 rounded-lg">
          File
        </button>
        <button className="hover:bg-gray-700 px-2 py-1 rounded-lg">
          Edit
        </button>
        <button className="hover:bg-gray-700 px-2 py-1 rounded-lg">
          View
        </button>
        <button className="hover:bg-gray-700 px-2 py-1 rounded-lg">
          Help
        </button>
        <SignOutButton className="hover:bg-gray-700 px-2 py-1 rounded-lg">
          Sign Out
        </SignOutButton>
        <button
          className="hover:bg-gray-700 px-2 py-1 rounded-lg"
          onClick={() => window.electronAPI.newWindow()}
        >
          New Window
        </button>
      </div>

      {/* Center: App name */}
      <div className="text-xs">Eternal</div>

      {/* Right: Window controls */}
      <div
        className="flex"
        style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
      >
        <button
          className="w-10 h-8 flex items-center justify-center hover:bg-gray-700"
          onClick={() => window.electronAPI.minimize()}
          aria-label="Minimize window"
        >
          <Minus size={14} />
        </button>
        {isMaximized ? (
          <button
            className="w-10 h-8 flex items-center justify-center hover:bg-gray-700"
            onClick={() => window.electronAPI.unmaximize()}
            aria-label="Restore window"
          >
            <Copy size={14} /> {/* overlapping squares */}
          </button>
        ) : (
          <button
            className="w-10 h-8 flex items-center justify-center hover:bg-gray-700"
            onClick={() => window.electronAPI.maximize()}
            aria-label="Maximize window"
          >
            <Square size={14} />
          </button>
        )}
        <button
          className="w-10 h-8 flex items-center justify-center hover:bg-red-600"
          onClick={() => window.electronAPI.close()}
          aria-label="Close window"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
};

export default MenuBar;
