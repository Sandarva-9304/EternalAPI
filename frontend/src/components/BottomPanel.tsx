// import { useEffect, useRef } from "react";
// import { Terminal } from "xterm";
// import { FitAddon } from "@xterm/addon-fit";
// import { WebLinksAddon } from "@xterm/addon-web-links";

// export default function BottomPanel({ onClose }: { onClose: () => void }) {
//   const containerRef = useRef<HTMLDivElement>(null);
//   const termRef = useRef<Terminal | null>(null);
//   const fitAddonRef = useRef<FitAddon | null>(null);

//   useEffect(() => {
//     const term = new Terminal({
//       theme: { background: "#1e1e1e", foreground: "#cccccc" },
//       fontFamily: "Consolas, monospace",
//       fontSize: 14,
//       cursorBlink: true,
//     });

//     const fitAddon = new FitAddon();
//     term.loadAddon(fitAddon);
//     term.loadAddon(new WebLinksAddon());

//     fitAddon.fit();
//     termRef.current = term;
//     fitAddonRef.current = fitAddon;

//     // Listen to backend output
//     window.terminalAPI.onData((data) => {
//       term.write(data);
//     });

//     // Send user input to backend
//     term.onData((data) => {
//       window.terminalAPI.write(data);
//     });

//     // Resize on panel resize
//     const resizeObserver = new ResizeObserver(() => {
//       fitAddon.fit();
//       window.terminalAPI.resize(term.cols, term.rows);
//     });

//     if (containerRef.current) {
//       term.open(containerRef.current);
//       resizeObserver.observe(containerRef.current);
//     }

//     return () => {
//       term.dispose();
//       resizeObserver.disconnect();
//     };
//   }, []);

//   return (
//     <div className="flex flex-col bg-[#1e1e1e] border-t border-gray-700 h-[300px]">
//       {/* Header */}
//       <div className="flex justify-between items-center bg-[#2d2d2d] px-3 py-1 text-sm text-gray-300">
//         <span>Terminal</span>
//         <button
//           onClick={onClose}
//           className="hover:text-red-400 transition-colors"
//         >
//           x
//         </button>
//       </div>

//       {/* Terminal */}
//       <div ref={containerRef} className="flex-1 overflow-hidden" />
//     </div>
//   );
// }

const BottomPanel = () => {
  return (
    <div>BottomPanel</div>
  )
}

export default BottomPanel