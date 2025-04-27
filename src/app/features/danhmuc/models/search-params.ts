import { PaginationParams } from "./pagination-params ";

export interface SearchParams extends PaginationParams {
  searchTerm: string;
}
