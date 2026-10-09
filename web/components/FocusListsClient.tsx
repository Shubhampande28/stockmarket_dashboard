"use client";

import { useEffect, useState } from "react";
import { getFocusList, FOCUS_LIST_IDS, type FocusListData, type FocusListId } from "@/lib/api";
import { Skeleton, ErrorPanel } from "./states/DataStates";

export default function FocusListsClient() {
  const [active, setActive] = useState<FocusListId>(FOCUS_LIST_IDS[0]);
  const [data, setData] = useState<Record<string, FocusListData>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  async function load(id: FocusListId) {
    if (data[id]) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(false);
    try {
      const result = await getFocusList(id);
      if ("error" in result) {
        setError(true);
      } else {
        setData((prev) => ({ ...prev, [id]: result }));
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // load() sets `loading` before its first await -- a standard fetch-on-
    // change effect, which the new react-hooks/set-state-in-effect rule
    // flags even through one level of function-call indirection. `load` is
    // intentionally left out of deps (redefined each render; including it
    // would need useCallback for no behavioral benefit here).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load(active);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const current = data[active];

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-1.5">
        {FOCUS_LIST_IDS.map((id) => (
          <button
            key={id}
            type="button"
            aria-pressed={id === active}
            onClick={() => setActive(id)}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium ${
              id === active ? "border-ink bg-ink text-white" : "border-line-2 text-ink-3"
            }`}
          >
            {data[id]?.label ?? id}
          </button>
        ))}
      </div>

      {loading && !current && <Skeleton height={300} />}
      {error && !current && <ErrorPanel onRetry={() => load(active)} />}

      {current && (
        <div className="rounded-[18px] border border-line p-4">
          <p className="mb-3 text-sm text-ink-4">{current.rule}</p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-4">
                  {current.cols.map((c, i) => (
                    <th key={c} className={`py-2 ${i >= 2 ? "text-right font-tabular" : ""}`}>
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {current.rows.map((row, ri) => (
                  <tr key={ri} className="border-b border-line">
                    {row.map((v, ci) => (
                      <td key={ci} className={`py-2 ${ci >= 2 ? "text-right font-tabular" : ""}`}>
                        {ci === 0 ? <b>{v}</b> : v}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-ink-4">{current.disclaimer}</p>
        </div>
      )}
    </div>
  );
}
