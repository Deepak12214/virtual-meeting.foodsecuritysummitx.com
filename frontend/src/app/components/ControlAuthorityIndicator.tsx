import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';
import { Shield, User, Users } from 'lucide-react';

interface ControlAuthority {
  role: string;
  name: string;
  mode: 'full' | 'limited' | 'presentation';
}

interface ControlAuthorityIndicatorProps {
  authorities: ControlAuthority[];
}

export function ControlAuthorityIndicator({ authorities }: ControlAuthorityIndicatorProps) {
  const getModeColor = (mode: string) => {
    switch (mode) {
      case 'full':
        return 'bg-green-500';
      case 'limited':
        return 'bg-yellow-500';
      case 'presentation':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getModeLabel = (mode: string) => {
    switch (mode) {
      case 'full':
        return 'Full Control';
      case 'limited':
        return 'Limited Control';
      case 'presentation':
        return 'Presentation Mode';
      default:
        return 'Observer';
    }
  };

  return (
    <Card className="bg-[--color-surface-elevated] border-[--color-border]">
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="h-4 w-4 text-[--color-text-secondary]" />
          <span className="text-xs font-medium text-[--color-text-secondary]">
            Current Room Authority
          </span>
        </div>
        <div className="space-y-1.5">
          {authorities.map((auth, index) => (
            <div key={index} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-[10px] font-semibold">
                  {auth.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <p className="font-medium">{auth.name}</p>
                  <p className="text-[10px] text-[--color-text-secondary] capitalize">
                    {auth.role.replace('_', ' ')}
                  </p>
                </div>
              </div>
              <Badge className={`${getModeColor(auth.mode)} text-white text-[10px] h-5`}>
                {getModeLabel(auth.mode)}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
