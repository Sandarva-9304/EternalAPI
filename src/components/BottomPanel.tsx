import { useEffect, useState, useRef } from "react";

const BottomPanel = ({
  setDownOpen,
}: {
  setDownOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const [termId, setTermId] = useState<string | null>(null);
  const [output, setOutput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // useEffect(() => {
  //   (async () => {
  //     const id = await window.terminalApi.createTerminal();
  //     setTermId(id);

  //     window.electronAPI.onTerminalData(({ id: incomingId, data }) => {
  //       if (incomingId === id) {
  //         setOutput((prev) => prev + data);
  //       }
  //     });
  //   })();

  //   return () => {
  //     if (termId) {
  //       window.electronAPI.killTerminal(termId);
  //     }
  //   };
  // }, []);

  // const handleInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
  //   if (e.key === "Enter" && termId) {
  //     const command = inputRef.current?.value + "\r";
  //     window.electronAPI.writeTerminal(termId, command);
  //     if (inputRef.current) inputRef.current.value = "";
  //   }
  // };

  return (
    <div>
      Bottom Panel
    </div>
    // <div className="h-1/3 bg-black text-green-200 flex flex-col">
    //   {/* Header */}
    //   <div className="flex justify-between items-center bg-neutral-800 text-white px-2 py-1">
    //     <span>Terminal</span>
    //     <button
    //       onClick={() => setDownOpen(false)}
    //       className="px-2 text-sm bg-red-600 rounded"
    //     >
    //       ✕
    //     </button>
    //   </div>

    //   {/* Output */}
    //   <pre className="flex-1 overflow-y-auto p-2 font-mono text-sm whitespace-pre-wrap">
    //     {output}
    //   </pre>

    //   {/* Input */}
    //   <input
    //     ref={inputRef}
    //     type="text"
    //     className="w-full bg-neutral-900 text-green-200 px-2 py-1 font-mono outline-none"
    //     placeholder="Type a command..."
    //     onKeyDown={handleInput}
    //   />
    // </div>
  );
};

export default BottomPanel;
