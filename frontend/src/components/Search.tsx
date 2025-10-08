import { useState, useEffect } from "react";
import { useEditor } from "./contexts/EditorContext";
import {
  SearchXIcon,
  ListCollapse,
  ChevronDown,
  ChevronRight,
  CaseSensitive,
  WholeWord,
  Regex,
  Replace,
  ReplaceAll,
  ScanSearch,
} from "lucide-react";

export default function SearchPanel() {
  const { workspace, openFiles, setOpenFiles, setActivePath, query, setQuery } =
    useEditor();
  const [replaceText, setReplaceText] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [expandedFiles, setExpandedFiles] = useState<Record<string, boolean>>(
    {}
  );

  // search options
  const [matchCase, setMatchCase] = useState(false);
  const [matchWhole, setMatchWhole] = useState(false);
  const [useRegex, setUseRegex] = useState(false);

  // search automatically on query change
  useEffect(() => {
    if (!query || !workspace) {
      setResults([]);
      return;
    }
    window.electronAPI
      .searchInWorkspace(workspace, query, {
        matchCase,
        wholeWord: matchWhole,
        regex: useRegex,
      })
      .then((res: SearchResult[]) => {
        setResults(res);
        console.log(res);
        setExpandedFiles(
          Object.fromEntries(res.map((r: any) => [r.filePath, true]))
        );
      });
  }, [query, matchCase, matchWhole, useRegex, workspace]);

  const toggleFile = (filePath: string) => {
    setExpandedFiles((prev) => ({
      ...prev,
      [filePath]: !prev[filePath],
    }));
  };

  const openMatch = (filePath: string, line: number) => {
    if (!openFiles.find((f) => f.path === filePath)) {
      window.electronAPI.readFile(filePath).then((content: string) => {
        setOpenFiles((prev) => [...prev, { path: filePath, content } as File]);
        setActivePath(filePath);
        if (line !== undefined) {
          setTimeout(() => {
            window.dispatchEvent(
              new CustomEvent("scroll-to-line", { detail: { filePath, line, query } })
            );
          }, 100); // wait for render
        }
      });
    } else {
      setActivePath(filePath);
      if (line !== undefined) {
        window.dispatchEvent(
          new CustomEvent("scroll-to-line", { detail: { filePath, line } })
        );
      }
    }
  };

  const collapseAll = () => {
    setExpandedFiles(
      Object.fromEntries(results.map((r) => [r.filePath, false]))
    );
  };

  const clearSearch = () => {
    setQuery("");
    setResults([]);
  };

  const replaceNext = () => {
    if (!query || !workspace) return;
    window.electronAPI
      .replaceInWorkspace(query, results, replaceText, {
        replaceNext: true,
        replaceAll: false,
      })
      .then(() => {
        setResults(results.slice(1));
      });
  };

  const replaceAll = () => {
    if (!query || !workspace) return;
    window.electronAPI
      .replaceInWorkspace(query, results, replaceText, {
        replaceNext: false,
        replaceAll: true,
      })
      .then((res) => {
        console.log("replaced", res);
        setResults([]);
      });
  };

  return (
    <div className="flex flex-col w-full h-full bg-primary-sidebar text-neutral-300">
      {/* Top Toolbar */}
      <div className="flex items-center justify-between p-2 border-b border-neutral-300 text-neutral-400">
        <div className="ml-4">Search</div>
        <div className="flex gap-2">
          <ScanSearch
            size={18}
            className="cursor-pointer hover:text-white"
            onClick={() => setQuery(query)}
          />
          <SearchXIcon
            size={18}
            className="cursor-pointer hover:text-white"
            onClick={clearSearch}
          />
          <ListCollapse
            size={18}
            className="cursor-pointer hover:text-white"
            onClick={collapseAll}
          />
        </div>
      </div>

      {/* Find Bar */}
      <div className="flex items-center gap-2 p-2">
        <input
          type="text"
          placeholder="Find"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 p-1 text-sm bg-neutral-800 border border-neutral-600 rounded"
        />
        <CaseSensitive
          size={18}
          className={`cursor-pointer ${
            matchCase ? "text-blue-400" : "text-neutral-400"
          }`}
          onClick={() => setMatchCase(!matchCase)}
        />
        <WholeWord
          size={18}
          className={`cursor-pointer ${
            matchWhole ? "text-blue-400" : "text-neutral-400"
          }`}
          onClick={() => setMatchWhole(!matchWhole)}
        />
        <Regex
          size={18}
          className={`cursor-pointer ${
            useRegex ? "text-blue-400" : "text-neutral-400"
          }`}
          onClick={() => {
            setUseRegex(!useRegex);
            setMatchCase(false);
            setMatchWhole(false);
          }}
        />
      </div>

      {/* Replace Bar */}
      <div className="flex items-center gap-2 p-2 border-b border-neutral-300">
        <input
          type="text"
          placeholder="Replace"
          value={replaceText}
          onChange={(e) => setReplaceText(e.target.value)}
          className="flex-1 p-1 text-sm bg-neutral-800 border border-neutral-600 rounded"
        />
        <Replace
          size={18}
          className="cursor-pointer hover:text-white"
          onClick={replaceNext}
        />
        <ReplaceAll
          size={18}
          className="cursor-pointer hover:text-white"
          onClick={replaceAll}
        />
      </div>

      {/* Results */}
      <div className="flex-1 overflow-auto p-2 text-sm">
        {results.length === 0 && (
          <div className="text-neutral-500 italic">No results</div>
        )}
        {results.map((file) => (
          <div key={file.filePath} className="mb-2">
            <div
              className="cursor-pointer font-semibold text-neutral-300 hover:text-white flex items-center"
              onClick={() => toggleFile(file.filePath)}
            >
              {expandedFiles[file.filePath] ? (
                <ChevronDown size={14} className="mr-1" />
              ) : (
                <ChevronRight size={14} className="mr-1" />
              )}
              {file.filePath.replace(workspace + "", "").slice(1)}
            </div>
            {expandedFiles[file.filePath] && (
              <ul className="ml-5 mt-1 space-y-1">
                {file.matches.map((m, i) => (
                  <li
                    key={i}
                    className="cursor-pointer hover:bg-neutral-700 px-2 py-1 rounded"
                    onClick={() => openMatch(file.filePath, m.line)}
                  >
                    <span className="text-neutral-400">Line {m.line}:</span>{" "}
                    <span className="text-neutral-200">{m.text}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
