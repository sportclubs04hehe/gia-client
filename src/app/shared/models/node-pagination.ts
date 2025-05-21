/**
 * Thông tin phân trang cho mỗi node
 */
export interface NodePagination {
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  isLoadingMore: boolean;
}
