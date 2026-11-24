import {
  Briefcase,
  Building2,
  Bus,
  Coins,
  Film,
  Fuel,
  GraduationCap,
  Landmark,
  MoreHorizontal,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Stethoscope,
  TrendingUp,
  Users,
  Utensils,
} from 'lucide-react';
import type { CategoryId } from '../types/ledger';

interface CategoryIconProps {
  categoryId: CategoryId;
  className?: string;
}

export function CategoryIcon({ categoryId, className = 'w-5 h-5' }: CategoryIconProps) {
  switch (categoryId) {
    case 'food':
      return <Utensils className={className} />;
    case 'maintenance':
      return <Building2 className={className} />;
    case 'telecom':
      return <Smartphone className={className} />;
    case 'insurance':
      return <ShieldCheck className={className} />;
    case 'loan':
      return <Landmark className={className} />;
    case 'academy':
      return <GraduationCap className={className} />;
    case 'medical':
      return <Stethoscope className={className} />;
    case 'fuel':
      return <Fuel className={className} />;
    case 'transport':
      return <Bus className={className} />;
    case 'family':
      return <Users className={className} />;
    case 'shopping':
      return <ShoppingBag className={className} />;
    case 'leisure':
      return <Film className={className} />;
    case 'salary':
      return <Briefcase className={className} />;
    case 'allowance':
      return <Coins className={className} />;
    case 'invest':
      return <TrendingUp className={className} />;
    case 'etc_inc':
      return <Plus className={className} />;
    case 'etc_exp':
    default:
      return <MoreHorizontal className={className} />;
  }
}
