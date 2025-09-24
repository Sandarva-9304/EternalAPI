// src/components/FileSystem.tsx
import * as React from "react";
import { useEffect, useState } from "react";
import {
  FsNode,
  joinPath,
  loadChildren,
  traverseAndUpdate,
  sortNodes,
} from "../utils/fsfunc";
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";
import {
  Folder,
  FolderOpen,
  File,
  GitBranch,
  ChevronDown,
  ChevronRight,
  FolderSync,
  FolderPlus,
  FolderMinus,
  FilePlus2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useEditor } from "./contexts/EditorContext";
const FileSystem = () => {
  const { workspace, setWorkspace, setActivePath, openFiles, setOpenFiles } =
    useEditor();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [roots, setRoots] = useState<FsNode[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [targetNode, setTargetNode] = useState<FsNode | null>(null);
  const [action, setAction] = useState<
    null | "newFile" | "newFolder" | "rename" | "delete"
  >(null);
  const [value, setValue] = useState("");

  // load root children when workspace changes
  useEffect(() => {
    if (!workspace) {
      setRoots(null);
      return;
    }
    window.electronAPI.watch(workspace);

    reloadWorkspace();

    return () => {
      if (workspace) window.electronAPI.unwatch(workspace);
    };
  }, [workspace]);

  useEffect(() => {
    const handleChange = ({ event, filename, dirPath }: any) => {
      // simplest option: just reload the whole tree
      reloadWorkspace();

      // optional: log/debug
      console.log("FS changed:", event, filename, dirPath);
    };

    window.electronAPI.onFsChanged(handleChange);

    return () => {
      // cleanup listener when component unmounts
      window.electronAPI.offFsChanged?.(handleChange);
    };
  }, [workspace]);

  // helpers inside FileSystem.tsx (or move to fsfunc.ts)
  const preserveExpanded = (nodes: FsNode[]): Record<string, boolean> => {
    const map: Record<string, boolean> = {};
    const traverse = (n: FsNode[]) => {
      for (const node of n) {
        if (node.expanded) map[node.path] = true;
        if (node.children) traverse(node.children);
      }
    };
    traverse(nodes);
    return map;
  };

  const applyExpanded = (
    nodes: FsNode[],
    expandedMap: Record<string, boolean>
  ): FsNode[] => {
    return nodes.map((node) => ({
      ...node,
      expanded: expandedMap[node.path] ?? node.expanded,
      children: node.children
        ? applyExpanded(node.children, expandedMap)
        : node.children,
    }));
  };

  // replace your reloadWorkspace with this
  const reloadWorkspace = async () => {
    if (!workspace) return;
    try {
      // keep track of which folders are open
      const expandedMap = roots ? preserveExpanded(roots) : {};

      const entries = await window.electronAPI.readDir(workspace);
      const nodes: FsNode[] = entries.map((e) => ({
        name: e.name,
        path: e.path,
        isDirectory: e.isDirectory,
      }));

      const sorted = sortNodes(nodes);

      // restore expanded state
      setRoots(applyExpanded(sorted, expandedMap));
      setError(null);
    } catch (e: any) {
      console.error(e);
      setError(String(e?.message ?? e));
    }
  };

  const handleConfirm = () => {
    if (!workspace) return;

    // only check name if needed
    if (action === "rename" || action === "newFile" || action === "newFolder") {
      const name = value.trim();

      // disallow empty names
      if (!name) {
        setErrorMessage("Name cannot be empty.");
        return;
      }

      // disallow illegal filename characters (Windows reserved chars)
      if (/[<>:"/\\|?*]/.test(name)) {
        setErrorMessage('Name contains invalid characters: <>:"/\\|?*');
        return;
      }

      // disallow reserved Windows names
      const reserved = [
        "CON",
        "PRN",
        "AUX",
        "NUL",
        "COM1",
        "LPT1",
        "LPT2",
        "LPT3",
      ];
      if (reserved.includes(name.toUpperCase())) {
        setErrorMessage(`"${name}" is a reserved name.`);
        return;
      }
    }

    // validation passed → reset error
    setErrorMessage(null);

    let dir: string;

    if (action === "rename" && targetNode) {
      const parentDir = targetNode.path.substring(
        0,
        targetNode.path.lastIndexOf("\\")
      );
      const newPath = joinPath(parentDir, value.trim());
      window.electronAPI.rename(targetNode.path, newPath);
    } else if (action === "newFile" || action === "newFolder") {
      if (targetNode) {
        dir = targetNode.isDirectory
          ? targetNode.path
          : targetNode.path.substring(0, targetNode.path.lastIndexOf("/"));
      } else {
        dir = workspace; // files/folders go inside workspace root
      }

      if (action === "newFile") {
        window.electronAPI.newFile(joinPath(dir, value.trim()));
      } else if (action === "newFolder") {
        window.electronAPI.newFolder(joinPath(dir, value.trim()));
      }
    } else if (action === "delete" && targetNode) {
      window.electronAPI.delete(targetNode.path);
    }

    setDialogOpen(false);
    setValue("");
    setAction(null);
    setTargetNode(null);
  };

  const handleFileClick = async (node: FsNode) => {
    if (!node.isDirectory) {
      const content = await window.electronAPI.readFile(node.path);
      handleOpenFile(node.path, content);
    }
  };

  const handleOpenFile = (path: string, content: string) => {
    setActivePath(path);
    setOpenFiles((prev) =>
      prev.find((f) => f.path === path)
        ? prev
        : [...prev, { path, content } as File]
    );
  };
  const handleOpenFolder = async () => {
    try {
      const folder = await window.electronAPI.openFolder();
      if (!folder) return;
      setWorkspace(folder);
      localStorage.setItem("workspacePath", folder);
      setError(null);
    } catch (e: any) {
      console.error(e);
      setError(String(e?.message ?? e));
    }
  };

  const toggleExpand = async (nodePath: string) => {
    if (!roots) return;
    const updated = await traverseAndUpdate(roots, nodePath, async (n) => {
      if (!n.isDirectory) return n;
      if (!n.children) {
        n.loading = true;
        const children = await loadChildren(n.path);
        n.children = sortNodes(children);
        n.loading = false;
        n.expanded = true;
      } else {
        n.expanded = !n.expanded;
      }
      return n;
    });
    setRoots(updated);
  };

  // renderers
  const TreeItem: React.FC<{ node: FsNode; level?: number }> = ({
    node,
    level = 0,
  }) => {
    return (
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            key={node.path}
            className="flex items-center gap-2 px-2 py-1 hover:bg-gray-700 rounded cursor-pointer select-none"
            style={{ paddingLeft: `${level * 12}px` }}
            onClick={() => {
              if (node.isDirectory) {
                toggleExpand(node.path);
              } else {
                handleFileClick(node);
              }
            }}
            title={node.path}
          >
            {node.isDirectory &&
              (node.expanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              ))}

            {node.isDirectory ? (
              node.loading ? (
                <span className="w-4">⏳</span>
              ) : node.expanded ? (
                <FolderOpen className="w-4 h-4 text-yellow-500" />
              ) : (
                <Folder className="w-4 h-4 text-yellow-500" />
              )
            ) : (
              <File className="w-4 h-4" />
            )}
            <span className="truncate">{node.name}</span>
          </div>
        </ContextMenuTrigger>

        {/* Context menu for this node */}
        <ContextMenuContent className="w-40 text-neutral-300 bg-primary-sidebar">
          {node.isDirectory && (
            <>
              <ContextMenuItem
                onClick={() => {
                  setAction("newFile");
                  setTargetNode(node);
                  setDialogOpen(true);
                }}
              >
                New File
              </ContextMenuItem>
              <ContextMenuItem
                onClick={() => {
                  setTargetNode(node);
                  setAction("newFolder");
                  setDialogOpen(true);
                }}
              >
                New Folder
              </ContextMenuItem>
              <ContextMenuSeparator />
            </>
          )}
          <ContextMenuItem
            onClick={() => {
              setTargetNode(node);
              setAction("rename");
              setValue(node.name);
              setDialogOpen(true);
            }}
          >
            Rename
          </ContextMenuItem>
          <ContextMenuItem
            className="text-red-500"
            onClick={() => {
              setTargetNode(node);
              setAction("delete");
              setDialogOpen(true);
            }}
          >
            Delete
          </ContextMenuItem>
        </ContextMenuContent>

        {/* Children */}
        {node.isDirectory && node.expanded && node.children && (
          <div>
            {node.children
              .filter((c) => !c.name.startsWith(".")) // hide hidden entries
              .map((c) => (
                <TreeItem key={c.path} node={c} level={level + 1} />
              ))}
          </div>
        )}
      </ContextMenu>
    );
  };

  // UI
  if (!workspace) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 bg-primary-sidebar text-neutral-300 p-4">
        <h3 className="text-lg font-semibold text-p6">No folder opened</h3>
        <p className="text-sm text-neutral-400 text-center">
          Open a folder to browse files or clone a repository.
        </p>
        <button
          className="px-4 py-2 bg-p1 rounded text-white flex items-center"
          onClick={handleOpenFolder}
        >
          <FolderOpen className="w-4 h-4 mr-2" />
          Open Folder
        </button>
        <button
          className="px-4 py-2 bg-green-600 rounded text-white flex items-center"
          onClick={() =>
            alert(
              "Clone not implemented; implement on backend via git or shell."
            )
          }
        >
          <GitBranch className="w-4 h-4 mr-2" /> Clone Repository
        </button>
        {error && <div className="text-sm text-red-500 mt-2">{error}</div>}
      </div>
    );
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div className="h-full overflow-auto bg-primary-sidebar text-neutral-300 text-sm p-2">
          <div className="flex items-center justify-between mb-2 px-2">
            <div className="text-p6 font-semibold">
              {workspace.split(/[\\/]/).pop()}
            </div>
            <div className="flex gap-2">
              <button
                className="cursor-pointer"
                onClick={() => {
                  setAction("newFile");
                  setDialogOpen(true);
                }}
              >
                <FilePlus2 className="size-3.5" />
              </button>
              <button
                className="cursor-pointer"
                onClick={() => {
                  setAction("newFolder");
                  setDialogOpen(true);
                }}
              >
                <FolderPlus className="size-4" />
              </button>
              <button
                className="text-xs text-neutral-300 hover:underline cursor-pointer"
                onClick={() => {
                  localStorage.removeItem("workspacePath");
                  setWorkspace(null);
                  setRoots(null);
                }}
              >
                <FolderMinus className="size-4" />
              </button>
              <button className="cursor-pointer" onClick={reloadWorkspace}>
                <FolderSync className="size-4" />
              </button>
            </div>
          </div>

          <div className="px-2">
            {roots === null ? (
              <div className="text-sm text-gray-500">Loading…</div>
            ) : roots.length === 0 ? (
              <div className="text-sm text-gray-500">
                The folder you have selected is currently empty.
              </div>
            ) : (
              roots
                .filter((r) => !r.name.startsWith(".")) // hide hidden entries in root
                .map((r) => <TreeItem key={r.path} node={r} />)
            )}
          </div>
          {error && <div className="text-sm text-red-500 mt-2">{error}</div>}
        </div>
      </ContextMenuTrigger>

      <ContextMenuContent className="w-40 text-neutral-300 bg-primary-sidebar">
        <ContextMenuItem
          onClick={() => {
            setAction("newFile");
            setDialogOpen(true);
          }}
        >
          New File
        </ContextMenuItem>
        <ContextMenuItem
          onClick={() => {
            setAction("newFolder");
            setDialogOpen(true);
          }}
        >
          New Folder
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          onClick={() => {
            localStorage.removeItem("workspacePath");
            setWorkspace(null);
            setRoots(null);
          }}
        >
          Close Workspace
        </ContextMenuItem>
      </ContextMenuContent>

      {/* Dialog for all actions */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="text-neutral-300">
          <DialogHeader>
            <DialogTitle>
              {action === "newFile" && "New File"}
              {action === "newFolder" && "New Folder"}
              {action === "rename" &&
                `Rename ${targetNode?.isDirectory ? "Folder" : "File"}`}
              {action === "delete" &&
                `Delete ${targetNode?.isDirectory ? "Folder" : "File"}`}
            </DialogTitle>
          </DialogHeader>
          {action !== "delete" && (
            <Input
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setErrorMessage(null); // clear error on change
              }}
              placeholder="Enter name"
              autoFocus
            />
          )}
          {errorMessage && (
            <p className="text-sm text-red-500 mt-1">{errorMessage}</p>
          )}
          {action === "delete" && (
            <p>
              Are you sure you want to delete{" "}
              <span className="font-semibold">{targetNode?.name}</span>?
            </p>
          )}
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirm}>
              {action === "delete" ? "Delete" : "OK"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ContextMenu>
  );
};

export default FileSystem;
