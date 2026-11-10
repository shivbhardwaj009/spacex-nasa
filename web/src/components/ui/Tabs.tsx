"use client";

import React, { createContext, useContext, useState, useId } from "react";

interface TabsContextValue {
  selectedTab: string;
  setSelectedTab: (id: string) => void;
  baseId: string;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext() {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error("Tab components must be rendered inside <Tabs>");
  return ctx;
}

export interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  defaultValue: string;
  value?: string;
  onValueChange?: (value: string) => void;
}

export function Tabs({
  defaultValue,
  value,
  onValueChange,
  children,
  className = "",
  ...props
}: TabsProps) {
  const [internalTab, setInternalTab] = useState(defaultValue);
  const selectedTab = value !== undefined ? value : internalTab;
  const baseId = useId();

  const setSelectedTab = (tabId: string) => {
    if (value === undefined) {
      setInternalTab(tabId);
    }
    onValueChange?.(tabId);
  };

  return (
    <TabsContext.Provider value={{ selectedTab, setSelectedTab, baseId }}>
      <div className={`flex flex-col gap-3 ${className}`} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

export function TabsList({
  children,
  className = "",
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="tablist"
      className={`inline-flex items-center p-1 rounded-xl bg-space-950/60 border border-white/10 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export interface TabTriggerProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
  icon?: React.ReactNode;
}

export function TabTrigger({
  value,
  icon,
  children,
  className = "",
  ...props
}: TabTriggerProps) {
  const { selectedTab, setSelectedTab, baseId } = useTabsContext();
  const isSelected = selectedTab === value;

  return (
    <button
      role="tab"
      type="button"
      id={`${baseId}-tab-${value}`}
      aria-selected={isSelected}
      aria-controls={`${baseId}-panel-${value}`}
      tabIndex={isSelected ? 0 : -1}
      onClick={() => setSelectedTab(value)}
      className={`min-h-[40px] px-3.5 py-1.5 rounded-lg text-xs md:text-sm font-medium transition-all duration-150 inline-flex items-center justify-center gap-2 select-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-none ${
        isSelected
          ? "bg-cyan-500 text-space-950 font-semibold shadow-md shadow-cyan-500/20"
          : "text-space-300 hover:text-white hover:bg-white/5"
      } ${className}`}
      {...props}
    >
      {icon && <span aria-hidden="true">{icon}</span>}
      <span>{children}</span>
    </button>
  );
}

export interface TabContentProps
  extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

export function TabContent({
  value,
  children,
  className = "",
  ...props
}: TabContentProps) {
  const { selectedTab, baseId } = useTabsContext();
  const isSelected = selectedTab === value;

  if (!isSelected) return null;

  return (
    <div
      role="tabpanel"
      id={`${baseId}-panel-${value}`}
      aria-labelledby={`${baseId}-tab-${value}`}
      tabIndex={0}
      className={`focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-none ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
