import {Fragment} from "react";
import { useEditor } from "./contexts/EditorContext";
const StatusBar = () => {
  const { workspace, setWorkspace } = useEditor();
  if (!workspace) {
    return (
      <div className="text-xs bg-primary-sidebar text-neutral-300 px-2 py-1">
        No folder open
      </div>
    );
  }

  // Split workspace into parts, normalize separators
  const parts = workspace.split(/[/\\]/); // works for both / and \

  return (
    <div className="text-xs bg-primary-sidebar text-neutral-300 px-2 py-0.5 flex items-start gap-1">
      {parts.map((part, idx) => {
        const crumbPath = parts.slice(0, idx + 1).join("\\");  // rebuild path progressively
        const isLast = idx === parts.length - 1;
        return (
          <Fragment key={crumbPath}>
            <button
              disabled={isLast}
              className={`hover:underline ${isLast ? "font-semibold" : "cursor-pointer"}`}
              onClick={() => {
                setWorkspace(crumbPath);
                localStorage.setItem("workspacePath", crumbPath);
              }}
            >
              {part}
            </button>
            {!isLast && <span className="mx-1">/</span>}
          </Fragment>
        );
      })}
    </div>
  );
};

export default StatusBar;
