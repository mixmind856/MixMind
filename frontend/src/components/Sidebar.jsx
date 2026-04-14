import { LayoutDashboard, Music, BarChart2, Settings } from "lucide-react";

export default function Sidebar() {
  return (
    <aside
      className="
        hidden md:flex
        h-screen
         backdrop-blur-xl
        flex-col
        transition-all duration-300
        w-16 lg:w-64
        p-4 lg:p-6
      "
    >
      {/* Logo */}
      <h2 className="text-purple-400 font-bold mb-10 text-center lg:text-left">
        <span className="hidden lg:inline text-2xl">MixMind</span>
        <span className="lg:hidden text-xl">MM</span>
      </h2>

      {/* Nav */}
      <nav className="space-y-4 text-sm">
        <Item icon={<LayoutDashboard size={20} />} label="Dashboard" active />
        <Item icon={<Music size={20} />} label="Song Requests" />
        <Item icon={<Music size={20} />} label="Music Library" />
        <Item icon={<BarChart2 size={20} />} label="Analytics" />
        <Item icon={<Settings size={20} />} label="Settings" />
      </nav>
    </aside>
  );
}

function Item({ icon, label, active }) {
  return (
    <div
      className={`
        group flex items-center justify-center lg:justify-start
        gap-3 px-3 py-2 rounded-lg cursor-pointer
        transition
        ${active
          ? "bg-purple-600/20 text-purple-300"
          : "text-gray-400 hover:bg-white/10 hover:text-white"}
      `}
    >
      {icon}

      {/* Label hidden on md, shown on lg */}
      <span className="hidden lg:inline">{label}</span>

      {/* Tooltip on md */}
      <span
        className="
          absolute left-16
          bg-black text-white text-xs px-2 py-1 rounded
          opacity-0 group-hover:opacity-100
          pointer-events-none
          lg:hidden
        "
      >
        {label}
      </span>
    </div>
  );
}
