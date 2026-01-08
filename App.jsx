import React, { useMemo, useState } from "react";
import {
  LayoutGrid,
  PlusSquare,
  Trophy,
  History as HistoryIcon,
  ChevronDown,
  Plus,
  Globe,
  Image as ImageIcon,
  Code,
  ArrowUp,
  MessageSquareText,
  Settings,
} from "lucide-react";

function Tooltip({ text }) {
  return (
    <div
      className={[
        "pointer-events-none absolute left-full top-1/2 -translate-y-1/2",
        "ml-3 z-50 whitespace-nowrap rounded-lg",
        "bg-black/80 backdrop-blur-md border border-white/10",
        "px-2.5 py-1.5 text-xs text-white/90 shadow-xl",
        "opacity-0 translate-x-1 group-hover:opacity-100 group-hover:translate-x-0",
        "transition-all duration-200 ease-out",
      ].join(" ")}
      role="tooltip"
    >
      {text}
      <div
        className={[
          "absolute right-full top-1/2 -translate-y-1/2",
          "h-2 w-2 rotate-45",
          "bg-black/80 border-l border-t border-white/10",
        ].join(" ")}
      />
    </div>
  );
}

function SidebarIconButton({
  icon: Icon,
  tooltip,
  isActive,
  onClick,
  ariaLabel,
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      className={[
        "group relative",
        "h-11 w-11 rounded-xl",
        "flex items-center justify-center",
        "border",
        isActive ? "border-white/20 bg-white/10" : "border-white/10 bg-black/20",
        "hover:bg-white/10 hover:border-white/20",
        "focus:outline-none focus:ring-2 focus:ring-white/20",
        "transition-colors duration-200",
      ].join(" ")}
    >
      <Icon
        className={isActive ? "h-5 w-5 text-white" : "h-5 w-5 text-white/80"}
      />
      <Tooltip text={tooltip} />
    </button>
  );
}

function SidebarRow({ icon: Icon, label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "w-full",
        "flex items-center gap-3",
        "rounded-xl px-3 py-2.5",
        "border",
        active ? "border-white/20 bg-white/10" : "border-transparent bg-transparent",
        "hover:bg-white/5 hover:border-white/10",
        "focus:outline-none focus:ring-2 focus:ring-white/20",
        "transition-colors duration-200",
      ].join(" ")}
    >
      <span
        className={[
          "h-9 w-9 rounded-lg",
          "flex items-center justify-center",
          active ? "bg-white/10" : "bg-black/20",
          "border border-white/10",
        ].join(" ")}
      >
        <Icon
          className={active ? "h-5 w-5 text-white" : "h-5 w-5 text-white/80"}
        />
      </span>
      <span className="text-sm font-medium text-white/90">{label}</span>
      {active ? (
        <span className="ml-auto h-2 w-2 rounded-full bg-white/70 shadow-[0_0_0_4px_rgba(255,255,255,0.06)]" />
      ) : (
        <span className="ml-auto h-2 w-2 rounded-full bg-transparent" />
      )}
    </button>
  );
}

function Sidebar({
  isCollapsed,
  setIsCollapsed,
  activeItem,
  setActiveItem,
  recentChats,
  collapsible,
}) {
  const toggleSidebar = () => {
    if (!collapsible) return;
    setIsCollapsed((v) => !v);
  };

  return (
    <aside
      className={[
        "h-screen shrink-0",
        isCollapsed ? "w-[72px]" : "w-[280px]",
        "transition-[width] duration-300 ease-in-out",
        "bg-black/40 backdrop-blur-xl",
        "border-r border-white/10",
        "shadow-[0_20px_60px_rgba(0,0,0,0.55)]",
        "overflow-hidden",
        "flex flex-col",
      ].join(" ")}
      aria-label="Sidebar"
    >
      <div className={isCollapsed ? "p-3" : "p-3"}>
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label={
            collapsible
              ? isCollapsed
                ? "Expand sidebar"
                : "Collapse sidebar"
              : "Sidebar"
          }
          className={[
            "group w-full",
            "rounded-2xl",
            "border border-white/10",
            "bg-black/25",
            "hover:bg-white/10 hover:border-white/20",
            "focus:outline-none focus:ring-2 focus:ring-white/20",
            "transition-colors duration-200",
            isCollapsed
              ? "h-11 flex items-center justify-center"
              : "h-12 flex items-center gap-3 px-3",
          ].join(" ")}
        >
          <span
            className={[
              "h-9 w-9 rounded-xl",
              "bg-white/10 border border-white/10",
              "flex items-center justify-center",
              "shadow-sm",
              "shrink-0",
            ].join(" ")}
          >
            <LayoutGrid className="h-5 w-5 text-white" />
          </span>

          <span className={isCollapsed ? "hidden" : "min-w-0 flex-1"}>
            <span className="block text-left text-sm font-semibold text-white/95 leading-5">
              DualMind
            </span>
            <span className="block text-left text-xs text-white/55 leading-4">
              Arena
            </span>
          </span>

          {collapsible && isCollapsed ? <Tooltip text="Expand" /> : null}
        </button>
      </div>

      {isCollapsed ? (
        <div className="flex-1 px-3">
          <div className="flex flex-col items-center gap-3 pt-2">
            <SidebarIconButton
              icon={PlusSquare}
              tooltip="New Chat"
              ariaLabel="New Chat"
              isActive={activeItem === "new"}
              onClick={() => setActiveItem("new")}
            />
            <SidebarIconButton
              icon={Trophy}
              tooltip="Leaderboard"
              ariaLabel="Leaderboard"
              isActive={activeItem === "leaderboard"}
              onClick={() => setActiveItem("leaderboard")}
            />
            <SidebarIconButton
              icon={HistoryIcon}
              tooltip="History"
              ariaLabel="History"
              isActive={activeItem === "history"}
              onClick={() => setActiveItem("history")}
            />
            <SidebarIconButton
              icon={Settings}
              tooltip="Settings"
              ariaLabel="Settings"
              isActive={activeItem === "settings"}
              onClick={() => setActiveItem("settings")}
            />
          </div>
        </div>
      ) : (
        <div className="flex-1 px-3 pb-3 flex flex-col min-h-0">
          <button
            type="button"
            onClick={() => setActiveItem("new")}
            className={[
              "w-full mt-1",
              "rounded-xl px-3 py-3",
              "bg-white/10 border border-white/15",
              "hover:bg-white/15 hover:border-white/25",
              "focus:outline-none focus:ring-2 focus:ring-white/20",
              "transition-colors duration-200",
              "flex items-center gap-3",
            ].join(" ")}
          >
            <span className="h-9 w-9 rounded-lg bg-white/10 border border-white/10 flex items-center justify-center">
              <PlusSquare className="h-5 w-5 text-white" />
            </span>
            <span className="text-sm font-semibold text-white/95">New Chat</span>
          </button>

          <div className="mt-4 flex flex-col gap-2">
            <SidebarRow
              icon={Trophy}
              label="Leaderboard"
              active={activeItem === "leaderboard"}
              onClick={() => setActiveItem("leaderboard")}
            />
            <SidebarRow
              icon={HistoryIcon}
              label="History"
              active={activeItem === "history"}
              onClick={() => setActiveItem("history")}
            />
            <SidebarRow
              icon={Settings}
              label="Settings"
              active={activeItem === "settings"}
              onClick={() => setActiveItem("settings")}
            />
          </div>

          <div className="pt-4">
            <div className="flex flex-wrap gap-x-3 gap-y-2 text-[11px] text-white/45">
              <a href="#" className="hover:text-white/70 transition-colors duration-200">
                Terms of use
              </a>
              <a href="#" className="hover:text-white/70 transition-colors duration-200">
                Privacy Policy
              </a>
              <a href="#" className="hover:text-white/70 transition-colors duration-200">
                Cookies
              </a>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}

function BattlePill() {
  return (
    <button
      type="button"
      className={[
        "inline-flex items-center gap-2",
        "bg-black/30 backdrop-blur-md border border-white/10",
        "rounded-full px-4 py-2",
        "text-sm font-medium text-white/85",
        "hover:bg-white/10 hover:border-white/20",
        "focus:outline-none focus:ring-2 focus:ring-white/20",
        "transition-colors duration-200",
      ].join(" ")}
    >
      <span className="h-7 w-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
        <LayoutGrid className="h-4 w-4 text-white/80" />
      </span>
      <span>Battle</span>
      <ChevronDown className="h-4 w-4 text-white/60" />
    </button>
  );
}

function HeroCard() {
  return (
    <div
      className={[
        "mx-auto w-full max-w-3xl",
        "rounded-3xl",
        "bg-black/30 backdrop-blur-xl",
        "border border-white/10",
        "shadow-[0_30px_80px_rgba(0,0,0,0.55)]",
        "p-6 md:p-8",
      ].join(" ")}
    >
      <div className="flex items-start gap-4">
        <div className="h-12 w-12 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center shrink-0">
          <MessageSquareText className="h-6 w-6 text-white/85" />
        </div>
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl font-semibold text-white/95 leading-tight">
            Start a battle
          </h1>
          <p className="mt-2 text-sm md:text-base text-white/65">
            Type a prompt — you’ll get two model replies side-by-side.
          </p>
        </div>
      </div>
    </div>
  );
}

function IconPillButton({ icon: Icon, ariaLabel }) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      className={[
        "h-11 w-11 rounded-xl",
        "bg-black/10 border border-white/10",
        "hover:bg-white/10 hover:border-white/20",
        "focus:outline-none focus:ring-2 focus:ring-white/20",
        "transition-colors duration-200",
        "flex items-center justify-center",
      ].join(" ")}
    >
      <Icon className="h-5 w-5 text-white/70" />
    </button>
  );
}

function ChatComposer() {
  return (
    <div className="w-full max-w-4xl mx-auto">
      <div
        className={[
          "rounded-2xl",
          "bg-black/35 backdrop-blur-xl",
          "border border-white/10",
          "shadow-[0_22px_70px_rgba(0,0,0,0.6)]",
          "p-3",
        ].join(" ")}
      >
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 shrink-0">
            <IconPillButton ariaLabel="Add" icon={Plus} />
            <IconPillButton ariaLabel="Browse" icon={Globe} />
            <IconPillButton ariaLabel="Image" icon={ImageIcon} />
            <IconPillButton ariaLabel="Code" icon={Code} />
          </div>

          <input
            type="text"
            placeholder="Ask anything…"
            className={[
              "flex-1 min-w-0",
              "bg-transparent",
              "px-3 py-2",
              "text-sm text-white/90 placeholder:text-white/45",
              "focus:outline-none",
            ].join(" ")}
          />

          <button
            type="button"
            aria-label="Send"
            className={[
              "h-11 w-11 rounded-xl",
              "bg-white/10 border border-white/15",
              "hover:bg-white/15 hover:border-white/25",
              "focus:outline-none focus:ring-2 focus:ring-white/20",
              "transition-colors duration-200",
              "flex items-center justify-center",
            ].join(" ")}
          >
            <ArrowUp className="h-5 w-5 text-white/90" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeItem, setActiveItem] = useState("new");

  const recentChats = useMemo(() => {
    return [];
  }, []);

  return (
    <div className="h-screen w-screen overflow-hidden bg-black text-white">
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-[#060612] via-[#05050a] to-[#090015]" />
        <div className="absolute inset-0 bg-[radial-gradient(900px_circle_at_25%_20%,rgba(88,101,242,0.18),transparent_55%),radial-gradient(800px_circle_at_70%_30%,rgba(74,171,194,0.14),transparent_55%),radial-gradient(700px_circle_at_55%_75%,rgba(203,146,117,0.14),transparent_55%)]" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-black/40" />
        <div className="absolute inset-0 shadow-[inset_0_0_200px_rgba(0,0,0,0.85)]" />
      </div>

      <div className="h-full w-full flex">
        <Sidebar
          isCollapsed={false}
          setIsCollapsed={setIsCollapsed}
          activeItem={activeItem}
          setActiveItem={setActiveItem}
          recentChats={recentChats}
          collapsible={false}
        />

        <main className="flex-1 min-w-0 relative">
          <div className="px-6 pt-6">
            <BattlePill />
          </div>

          <div className="px-6 pt-10">
            <HeroCard />
          </div>

          <div className="absolute left-0 right-0 bottom-0 px-6 pb-6">
            <ChatComposer />
          </div>
        </main>
      </div>
    </div>
  );
}
