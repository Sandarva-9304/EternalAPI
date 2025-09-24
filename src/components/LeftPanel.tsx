import FileSystem from "./FileSystem";
import SearchPanel from "./Search";
const LeftPanel = ({
  content,
}: {
  content: "files" | "search" | "git" | "db" | null;
}) => {
  switch (content) {
    case "files":
      return <FileSystem />;
    case "search":
      return <SearchPanel/>
    case "git":
      return <div className="">Git</div>;
    case "db":
      return <div className="">Database</div>;
    default:
      return null;
  }
};

export default LeftPanel;
