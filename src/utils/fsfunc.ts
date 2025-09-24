// src/utils/fsFunctions.ts
export type FsNode = {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FsNode[];
  expanded?: boolean;
  loading?: boolean;
};

export function joinPath(...parts: string[]) {
  return parts.join("\\").replace(/\/+/g, "\\");
}

export async function loadChildren(nodePath: string) {
  try {
    const entries = await window.electronAPI.readDir(nodePath);
    return entries.map((e) => ({
      name: e.name,
      path: e.path,
      isDirectory: e.isDirectory,
    })) as FsNode[];
  } catch (e) {
    console.error("loadChildren error", e);
    return [];
  }
}

export async function traverseAndUpdate(
  nodes: FsNode[],
  targetPath: string,
  updater: (n: FsNode) => Promise<FsNode>
) {
  const result: FsNode[] = [];
  for (const n of nodes) {
    if (n.path === targetPath) {
      const updated = await updater({ ...n });
      result.push(updated);
    } else {
      if (n.children) {
        const updatedChildren = await traverseAndUpdate(
          n.children,
          targetPath,
          updater
        );
        result.push({ ...n, children: updatedChildren });
      } else {
        result.push({ ...n });
      }
    }
  }
  return result;
}

export function sortNodes(nodes: FsNode[]) {
  return nodes.sort((a, b) => {
    if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}