import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import {
  ChevronUp,
  ChevronDown,
  Play,
  CheckCircle,
  Clock,
  AlertCircle,
  GripVertical,
} from 'lucide-react';

interface QueueItem {
  id: string;
  name: string;
  title?: string;
  status: 'ready' | 'not-ready' | 'standby' | 'live';
  duration?: number;
}

interface QueueManagementProps {
  items: QueueItem[];
  type: 'speaker' | 'startup';
  canManage?: boolean;
  onMakeLive?: (id: string) => void;
  onReorder?: (items: QueueItem[]) => void;
  onStatusChange?: (id: string, newStatus: 'ready' | 'not-ready') => void;
}

export function QueueManagement({
  items: initialItems,
  type,
  canManage = false,
  onMakeLive,
  onReorder,
  onStatusChange,
}: QueueManagementProps) {
  const [items, setItems] = useState(initialItems);

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  const moveUp = (index: number) => {
    if (index === 0) return;
    const newItems = [...items];
    [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
    setItems(newItems);
    onReorder?.(newItems);
  };

  const moveDown = (index: number) => {
    if (index === items.length - 1) return;
    const newItems = [...items];
    [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
    setItems(newItems);
    onReorder?.(newItems);
  };

  const toggleStatus = (id: string) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    const newStatus = (item.status === 'ready' ? 'not-ready' : 'ready') as 'ready' | 'not-ready';

    const newItems = items.map((i) =>
      i.id === id
        ? {
            ...i,
            status: newStatus,
          }
        : i
    );
    setItems(newItems);
    onReorder?.(newItems);
    onStatusChange?.(id, newStatus);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ready':
        return (
          <Badge className="bg-green-500 text-white text-[10px] h-4 gap-1">
            <CheckCircle className="h-2.5 w-2.5" />
            Ready
          </Badge>
        );
      case 'not-ready':
        return (
          <Badge variant="outline" className="text-[10px] h-4 gap-1">
            <Clock className="h-2.5 w-2.5" />
            Not Ready
          </Badge>
        );
      case 'standby':
        return (
          <Badge variant="secondary" className="text-[10px] h-4 gap-1">
            <AlertCircle className="h-2.5 w-2.5" />
            Standby
          </Badge>
        );
      case 'live':
        return (
          <Badge className="bg-red-500 text-white text-[10px] h-4 gap-1">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
            </span>
            LIVE
          </Badge>
        );
    }
  };

  const liveItems = items.filter((i) => i.status === 'live');
  const queueItems = items.filter((i) => i.status !== 'live');

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm capitalize">{type} Queue</CardTitle>
          <Badge variant="secondary" className="text-[10px]">
            {queueItems.length} waiting
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Live Now */}
        {liveItems.length > 0 && (
          <div className="space-y-2">
            {liveItems.map((item) => (
              <div key={item.id} className="p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-red-400">Currently Live</span>
                  {getStatusBadge('live')}
                </div>
                <p className="font-medium text-sm">{item.name}</p>
                {item.title && (
                  <p className="text-xs text-[--color-text-secondary]">{item.title}</p>
                )}
                {item.duration && (
                  <p className="text-xs text-[--color-text-secondary] mt-1">
                    Duration: {item.duration} min
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Queue */}
        <ScrollArea className="h-64">
          <div className="space-y-2 pr-3">
            {queueItems.length === 0 ? (
              <p className="text-xs text-[--color-text-secondary] text-center py-8">
                Queue is empty
              </p>
            ) : (
              queueItems.map((item, index) => (
                <div
                  key={item.id}
                  className="p-2.5 bg-[--color-surface] rounded-lg border border-[--color-border] hover:bg-[--color-surface-elevated] transition-colors"
                >
                  <div className="flex items-start gap-2">
                    {/* Position */}
                    <div className="flex flex-col items-center gap-0.5 pt-1">
                      <div className="w-5 h-5 rounded-full bg-[--color-primary] text-white flex items-center justify-center text-[10px] font-semibold">
                        {index + 1}
                      </div>
                      {canManage && (
                        <div className="flex flex-col gap-0.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-4 w-4 p-0"
                            onClick={() => moveUp(index)}
                            disabled={index === 0}
                          >
                            <ChevronUp className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-4 w-4 p-0"
                            onClick={() => moveDown(index)}
                            disabled={index === queueItems.length - 1}
                          >
                            <ChevronDown className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className="font-medium text-sm truncate">{item.name}</p>
                        {getStatusBadge(item.status)}
                      </div>
                      {item.title && (
                        <p className="text-xs text-[--color-text-secondary] truncate">
                          {item.title}
                        </p>
                      )}
                      {item.duration && (
                        <p className="text-xs text-[--color-text-secondary] mt-1">
                          {item.duration} min
                        </p>
                      )}

                      {/* Actions */}
                      {canManage && (
                        <div className="flex gap-1.5 mt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-6 text-[10px] px-2"
                            onClick={() => toggleStatus(item.id)}
                          >
                            {item.status === 'ready' ? 'Mark Not Ready' : 'Mark Ready'}
                          </Button>
                          <Button
                            variant="default"
                            size="sm"
                            className="h-6 text-[10px] px-2"
                            onClick={() => onMakeLive?.(item.id)}
                            disabled={item.status !== 'ready'}
                          >
                            <Play className="h-3 w-3 mr-1" />
                            Go Live
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
