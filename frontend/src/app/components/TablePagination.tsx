import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';
import { Button } from './ui/button';
import { getPageItems } from '../utils/pagination';

interface TablePaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

/** Prev / numbered pages with ellipses / Next — for client- or server-paginated tables. */
export function TablePagination({ currentPage, totalPages, onPageChange }: TablePaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <nav aria-label="Pagination" className="flex items-center gap-1">
      <Button
        variant="outline"
        size="sm"
        disabled={currentPage <= 1}
        onClick={() => onPageChange(currentPage - 1)}
        aria-label="Previous page"
      >
        <ChevronLeft />
        <span className="hidden sm:inline">Previous</span>
      </Button>

      {getPageItems(currentPage, totalPages).map((item) =>
        typeof item === 'number' ? (
          <Button
            key={item}
            variant={item === currentPage ? 'default' : 'outline'}
            size="sm"
            className="w-8 h-8 p-0"
            aria-label={`Page ${item}`}
            aria-current={item === currentPage ? 'page' : undefined}
            onClick={() => onPageChange(item)}
          >
            {item}
          </Button>
        ) : (
          <span key={item} aria-hidden className="w-8 h-8 flex items-center justify-center text-muted-foreground">
            <MoreHorizontal className="h-4 w-4" />
          </span>
        )
      )}

      <Button
        variant="outline"
        size="sm"
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        aria-label="Next page"
      >
        <span className="hidden sm:inline">Next</span>
        <ChevronRight />
      </Button>
    </nav>
  );
}
