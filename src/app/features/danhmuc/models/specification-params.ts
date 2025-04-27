import { PaginationParams } from "./pagination-params ";

export interface SpecificationParams extends PaginationParams {
    searchTerm: string;
    sortBy: string;
    isDescending: boolean;
  }