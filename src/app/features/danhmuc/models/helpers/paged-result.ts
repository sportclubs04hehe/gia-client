export interface PagedResult<T> {
    data: T[];
    pagination: {
        currentPage: number;
        itemsPerPage: number;
        totalItems: number;
        totalPages: number;
        hasPreviousPage: boolean;
        hasNextPage: boolean;
        pageSize: number;
    };
}