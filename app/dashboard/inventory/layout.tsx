export default function InventoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#0a0e1a] relative overflow-hidden flex flex-col md:flex-row">
      {/* Background Orbs */}
      <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full bg-indigo-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-violet-600/10 blur-[100px] pointer-events-none" />

      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r border-white/[0.07] bg-[#0a0e1a]/80 backdrop-blur-xl z-20 flex flex-col">
        <div className="flex items-center gap-2.5 p-6 border-b border-white/[0.07]">
          <span className="text-2xl">📦</span>
          <span className="font-bold text-slate-100 text-lg tracking-tight">
            Inventory <span className="text-indigo-400">Hub</span>
          </span>
        </div>
        
        <nav className="flex-1 p-4 flex gap-2 overflow-x-auto md:overflow-visible md:flex-col custom-scrollbar">
          {[
            { href: "/dashboard/inventory", label: "Overview", icon: "📊" },
            { href: "/dashboard/inventory/categories", label: "Categories", icon: "📁" },
            { href: "/dashboard/inventory/ingredients", label: "Ingredients", icon: "🥬" },
            { href: "/dashboard/inventory/products", label: "Products", icon: "🍔" },
            { href: "/dashboard/inventory/recipes", label: "Recipes", icon: "📝" },
            { href: "/dashboard/inventory/stock", label: "Stock Levels", icon: "🏢" },
            { href: "/dashboard/inventory/availability", label: "Availability", icon: "✅" },
            { href: "/dashboard/inventory/transactions", label: "Transactions", icon: "🔄" },
          ].map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-white/[0.05] transition-all whitespace-nowrap md:whitespace-normal"
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </a>
          ))}
        </nav>
        
        <div className="p-4 border-t border-white/[0.07]">
          <a
            href="/dashboard"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-white/[0.05] transition-all"
          >
            <span>⬅️</span>
            Back to Dashboard
          </a>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 relative z-10 overflow-y-auto w-full h-screen">
        <div className="max-w-6xl mx-auto p-6 md:p-10">
          {children}
        </div>
      </main>
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeUp {
          animation: fadeUp 0.5s ease both;
        }
      `}</style>
    </div>
  );
}
