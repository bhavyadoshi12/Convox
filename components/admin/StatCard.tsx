import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { memo } from 'react';

interface StatCardProps {
    label: string;
    value: number | string;
    icon: LucideIcon;
    color?: string;
}

const StatCard = ({ label, value, icon: Icon, color = "bg-blue-500" }: StatCardProps) => {
    return (
        <div className="flex items-center rounded-xl bg-white p-6 shadow-sm border border-gray-100 transition-transform hover:scale-[1.02]">
            <div className={cn("mr-4 rounded-lg p-3 text-white", color)}>
                <Icon className="h-6 w-6" />
            </div>
            <div>
                <p className="text-sm font-medium text-gray-500">{label}</p>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
            </div>
        </div>
    );
};

export default memo(StatCard);
