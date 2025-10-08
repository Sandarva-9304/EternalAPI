import Messaging from "./Messaging";
const RightPanel = ({ content }: { content: "chat" | "assist" | null }) => {
  switch (content) {
    case "chat":
      return <Messaging />;
    case "assist":
      return <div className="">Assist</div>;
    default:
      return null;
  }
};

export default RightPanel;
