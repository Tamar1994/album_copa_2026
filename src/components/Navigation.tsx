import type { Tab } from '../types';
import {
  BarChart2,
  BookOpen,
  Camera,
  PlusCircle,
} from 'lucide-react';

interface Props {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'progresso', label: 'Progresso', icon: <BarChart2 size={22} /> },
  { id: 'album', label: 'Álbum', icon: <BookOpen size={22} /> },
  { id: 'verificar', label: 'Verificar', icon: <Camera size={22} /> },
  { id: 'adicionar', label: 'Adicionar', icon: <PlusCircle size={22} /> },
];

export function Navigation({ activeTab, onTabChange }: Props) {
  return (
    <nav className="flex-shrink-0 bg-zinc-900 border-t border-zinc-800 safe-bottom">
      <div className="flex">
        {TABS.map(({ id, label, icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 transition-colors ${
                isActive ? 'text-copa-green' : 'text-zinc-500 active:text-zinc-300'
              }`}
            >
              {icon}
              <span className="text-[10px] font-medium">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
