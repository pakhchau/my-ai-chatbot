import React, { useState } from "react";
import { CheckCircleFillIcon, ClockRewind, ChevronDownIcon, ArrowUpIcon, BoxIcon } from "./icons";

export function ToolResultCard({ result }: { result: any }) {
  const [open, setOpen] = useState(false);
  const colorMap: Record<string, string> = {
    SELECT: "bg-green-100 text-green-700 border-green-300",
    INSERT: "bg-blue-100 text-blue-700 border-blue-300",
    UPDATE: "bg-yellow-100 text-yellow-700 border-yellow-300",
    DELETE: "bg-red-100 text-red-700 border-red-300",
    DEFAULT: "bg-zinc-100 text-zinc-700 border-zinc-300",
  };
  const color = colorMap[result.queryType] || colorMap.DEFAULT;

  return (
    <div className={`rounded-xl border shadow-lg my-6 transition-all duration-300 ${color}`}
      style={{ boxShadow: open ? "0 8px 32px 0 rgba(60,60,60,0.15)" : undefined }}>
      <button
        className="w-full flex justify-between items-center px-6 py-4 focus:outline-none group"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <div className="flex items-center gap-3">
          <BoxIcon size={24} />
          <div>
            <div className="font-bold text-lg tracking-tight">
              {result.queryType || "TOOL"} Result
            </div>
            <div className="text-xs text-zinc-500 mt-1">
              {result.explanation}
            </div>
          </div>
        </div>
        <span className="ml-2">
          {open ? <ArrowUpIcon size={20} /> : <ChevronDownIcon size={20} />}
        </span>
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ${open ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"}`}
      >
        <div className="px-6 pb-5 pt-1">
          <div className="mb-2">
            <span className="font-medium">Query:</span>
            <pre className="bg-zinc-50 dark:bg-zinc-800 rounded p-2 text-xs overflow-x-auto border mt-1">
              {result.query}
            </pre>
          </div>
          <div className="mb-2">
            <span className="font-medium">Data:</span>
            <pre className="bg-zinc-50 dark:bg-zinc-800 rounded p-2 text-xs overflow-x-auto border mt-1">
              {JSON.stringify(result.data, null, 2)}
            </pre>
          </div>
          <div className="flex flex-wrap gap-4 text-xs text-zinc-500 mt-2">
            <div className="flex items-center gap-1"><CheckCircleFillIcon size={16} /> Rows: {result.data?.rowCount}</div>
            <div className="flex items-center gap-1"><ClockRewind size={16} /> Execution Time: {result.executionTime}</div>
            <div className="flex items-center gap-1"><BoxIcon size={16} /> Timestamp: {new Date(result.timestamp).toLocaleString()}</div>
          </div>
        </div>
      </div>
    </div>
  );
} 