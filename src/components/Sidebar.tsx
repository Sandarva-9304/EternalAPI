import {
  Files,
  Database,
  SourceControl,
  Search,
  Messages,
  AddTask,
} from "./svgs/SvgIndex";

const Sidebar = ({
  current,
  currentRight,
  onSelect,
  onSelectRight,
}: {
  current: "files" | "search" | "git" | "db" | null;
  currentRight: "chat" | "assist" | null;
  onSelect: (content: "files" | "search" | "git" | "db" | null) => void;
  onSelectRight: (content: "chat" | "assist" | null) => void;
}) => {
  return (
    <ul className="flex flex-col items-center justify-start w-12 h-[calc(100vh-52px)] bg-primary/30">
      <li
        className="hover:bg-gray-200 px-2 py-4"
        onClick={() => onSelect("files")}
      >
        <Files solid={current === "files"} />
      </li>
      <li
        className="hover:bg-gray-200 px-2 py-4"
        onClick={() => onSelect("search")}
      >
        <Search solid={current === "search"} />
      </li>
      <li
        className="hover:bg-gray-200 px-2 py-4"
        onClick={() => onSelect("git")}
      >
        <SourceControl solid={current === "git"} />
      </li>
      <li
        className="hover:bg-gray-200 px-2 py-4"
        onClick={() => onSelect("db")}
      >
        <Database solid={current === "db"} />
      </li>
      <li className="hover:bg-gray-200 px-2 py-4"
        onClick={() => onSelectRight("chat")}>
        <Messages solid={currentRight === "chat"} />
      </li>
      <li className="hover:bg-gray-200 px-2 py-4">
        <AddTask solid={false} />
      </li>
    </ul>
  );
};

export default Sidebar;
