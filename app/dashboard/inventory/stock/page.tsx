"use client";
import { useEffect, useState } from "react";
import { getInventories, updateInventoryRecord } from "@/lib/api";

type StockRecord = {
  id: number | string;
  ingredient_name: string;
  branch_name: string;
  location: string;
  quantity: number;
  unit: string;
  reorder_threshold: number;
  last_updated: string;
};

export default function StockPage() {
  const [stock, setStock] = useState<StockRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionMsg, setActionMsg] = useState<{type: 'success'|'error', text: string} | null>(null);
  
  // Quick Edit
  const [editingId, setEditingId] = useState<number | string | null>(null);
  const [editQty, setEditQty] = useState<number>(0);

  const loadData = async () => {
    setLoading(true);
    try {
      // we can pass param filters here if we want API. For now, fetch all.
      const data = await getInventories();
      setStock(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async (id: number | string) => {
    try {
      await updateInventoryRecord(id, { quantity: editQty });
      setEditingId(null);
      setActionMsg({ type: 'success', text: 'Stock updated successfully.' });
      loadData();
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err?.detail || 'Failed to update stock.' });
    }
  };

  const filteredStock = stock.filter((s) =>
    s.ingredient_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="animate-fadeUp">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-100 tracking-tight">Stock Levels</h1>
          <p className="text-slate-400 mt-1 text-sm">Monitor physical stock and replenish supplies.</p>
        </div>
        
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search ingredients..."
            className="w-full md:w-64 pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-slate-100 placeholder-slate-500 text-sm focus:border-indigo-500/70 focus:bg-white/[0.06] focus:ring-1 focus:ring-indigo-500/70 outline-none transition-all"
          />
        </div>
      </div>

      {actionMsg && (
        <div className={`mb-6 px-4 py-3 rounded-xl border text-sm animate-fadeDown flex justify-between items-center ${
          actionMsg.type === 'success' 
            ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400' 
            : 'bg-red-500/10 border-red-500/25 text-red-400'
        }`}>
          <span>{actionMsg.type === 'success' ? '✅ ' : '⚠️ '} {actionMsg.text}</span>
          <button onClick={() => setActionMsg(null)} className="text-xl leading-none opacity-60 hover:opacity-100">&times;</button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <span className="w-8 h-8 rounded-full border-4 border-indigo-500/30 border-t-indigo-500 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredStock.length === 0 ? (
            <div className="col-span-full py-10 text-center text-slate-500 bg-white/[0.02] border border-white/[0.05] rounded-2xl">
              No stock records found matching your search.
            </div>
          ) : (
            filteredStock.map((item) => {
              const isLow = item.quantity <= item.reorder_threshold;
              return (
                <div key={item.id} className={`relative p-5 rounded-2xl border ${isLow ? 'border-red-500/30' : 'border-white/[0.08]'} bg-white/[0.03] backdrop-blur-md hover:bg-white/[0.05] transition-colors`}>
                  {isLow && (
                    <span className="absolute top-4 right-4 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                    </span>
                  )}
                  <h3 className="text-lg font-semibold text-slate-100 mb-1 pr-6">{item.ingredient_name}</h3>
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-4 flex items-center gap-2">
                    <span>🏢 {item.branch_name}</span>
                    <span className="w-1 h-1 rounded-full bg-slate-600"></span>
                    <span>📍 {item.location || 'Main'}</span>
                  </p>
                  
                  <div className="flex items-end justify-between mt-6 pt-4 border-t border-white/[0.06]">
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Current Quantity</p>
                      {editingId === item.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={editQty}
                            onChange={(e) => setEditQty(Number(e.target.value))}
                            className="w-20 px-2 py-1 rounded bg-white/10 border border-white/20 text-white text-sm"
                          />
                          <span className="text-slate-400 text-sm">{item.unit}</span>
                        </div>
                      ) : (
                        <p className={`text-2xl font-bold ${isLow ? 'text-red-400' : 'text-emerald-400'}`}>
                          {item.quantity} <span className="text-sm font-medium text-slate-500">{item.unit}</span>
                        </p>
                      )}
                    </div>
                    
                    <div>
                      {editingId === item.id ? (
                        <div className="flex gap-2">
                          <button onClick={() => handleSave(item.id)} className="px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition">Save</button>
                          <button onClick={() => setEditingId(null)} className="px-3 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition">Cancel</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setEditingId(item.id); setEditQty(item.quantity); }}
                          className="px-3 py-1.5 text-xs font-semibold text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 rounded-lg transition-colors"
                        >
                          ✎ Adjust
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
