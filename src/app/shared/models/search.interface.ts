import { Observable } from "rxjs";
import { ApiResponse } from "../../features/danhmuc/models/dm_hanghoathitruong/api-response";
import { PagedResult } from "../../features/danhmuc/models/helpers/paged-result";
import { PaginationParams } from "../../features/danhmuc/models/helpers/pagination-params ";
import { SearchParams } from "../../features/danhmuc/models/helpers/search-params";

export interface SearchService<T> {
  getAll(params: PaginationParams): Observable<PagedResult<T>>;
  search(params: SearchParams): Observable<PagedResult<T>>;
  getById(id: string): Observable<ApiResponse<T>>;
  create(createDto: any): Observable<ApiResponse<T>>;
  update(updateDto: any): Observable<ApiResponse<string>>;
  delete(id: string): Observable<ApiResponse<string>>;
}