import { useRole } from '@/contexts/RoleContext';
import { UserRole } from '@/types';
import { Shield } from 'lucide-react';

const roleStyles: Record<UserRole, { bg: string; text: string; border: string }> = {
  ADMIN: { bg: 'bg-red-600', text: 'text-white', border: 'border-red-700' },
  GERENTE: { bg: 'bg-purple-600', text: 'text-white', border: 'border-purple-700' },
  SUPERVISOR: { bg: 'bg-blue-600', text: 'text-white', border: 'border-blue-700' },
  VENDEDOR: { bg: 'bg-emerald-600', text: 'text-white', border: 'border-emerald-700' },
  ALMACENERO: { bg: 'bg-amber-500', text: 'text-black', border: 'border-amber-600' },
  CAJERO: { bg: 'bg-cyan-600', text: 'text-white', border: 'border-cyan-700' },
  RRHH: { bg: 'bg-pink-600', text: 'text-white', border: 'border-pink-700' },
  FIDELIZACION: { bg: 'bg-orange-500', text: 'text-white', border: 'border-orange-600' },
  MANTENIMIENTO: { bg: 'bg-slate-600', text: 'text-white', border: 'border-slate-700' },
};

export const RoleSelector = () => {
  const { currentRole, roleLabels } = useRole();
  const currentStyle = roleStyles[currentRole];

  return (
    <div className="flex items-center gap-1.5 sm:gap-3 bg-card/50 backdrop-blur-sm rounded-lg px-2 sm:px-3 py-1 sm:py-1.5 border border-border/50">
      <Shield className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground hidden xs:block" />
      <div
        className={`inline-flex items-center px-2 py-0.5 sm:px-3 sm:py-1 rounded-md text-[11px] sm:text-xs font-semibold border ${currentStyle.bg} ${currentStyle.text} ${currentStyle.border}`}
      >
        {roleLabels[currentRole]}
      </div>
    </div>
  );
};
