import FileSystem from "./FileSystem";
import SearchPanel from "./Search";
const LeftPanel = ({
  content,
}: {
  content: "files" | "search" | "git" | "db"| "music" | null;
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
    case "music":
      return <div className="">Music</div>;
    default:
      return null;
  }
};

export default LeftPanel;
