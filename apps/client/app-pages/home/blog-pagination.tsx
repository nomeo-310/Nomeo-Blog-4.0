import { PaginationWithInfo } from "@/components/ui/pagination";

/** Pagination footer — only rendered when there's more than one page of results. */
export function BlogPagination({
  page, totalPages, total, pageSize, hasResults, onPageChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  hasResults: boolean;
  onPageChange: (page: number) => void;
}) {
  if (!(totalPages > 1 && hasResults)) return null;
  return (
    <div className="mt-12">
      <PaginationWithInfo
        currentPage={page}
        totalPages={totalPages}
        totalItems={total}
        itemsPerPage={pageSize}
        onPageChange={onPageChange}
        variant="primary"
        maxVisiblePages={5}
        showPageNumbers={true}
        showInfo={true}
      />
    </div>
  );
}
