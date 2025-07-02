import { HttpClient, HttpParams } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { environment } from "../../../../../environments/environment.development";
import { Observable, of } from "rxjs";
import { catchError, tap } from "rxjs/operators";
import { PaginationParams } from "../../models/helpers/pagination-params";
import { SearchParams } from "../../models/helpers/search-params";
import { PagedResult } from "../../models/helpers/paged-result";
import { ApiResponse } from "../../models/dm_hanghoathitruong/api-response";
import { LoaiGiaDto } from "../../models/dm-loai-gia/LoaiGiaDto";
import { LoaiGiaCreateDto, LoaiGiaUpdateDto } from "../../models/dm-loai-gia/LoaiGiaCreateDto";
import { CacheService } from "../../../nghiep-vu/services/utils/cache.service";
@Injectable({
  providedIn: 'root'
})
export class DmLoaiGiaService {
  private http = inject(HttpClient);
  private apiUrl = environment.appUrl;
  private endpoint = 'Dm_LoaiGias'; 
  private cacheService = inject(CacheService);
  private cachePrefix = 'loaigia';
  
  /**
   * Lấy danh sách loại giá có phân trang và sử dụng cache
   */
  getAll(params: PaginationParams): Observable<PagedResult<LoaiGiaDto>> {
    const cacheKey = `${this.cachePrefix}_all_${params.pageIndex}_${params.pageSize}`;
    const cachedData = this.cacheService.get<PagedResult<LoaiGiaDto>>(cacheKey);
    
    if (cachedData) {
      return of(cachedData);
    }

    let httpParams = new HttpParams()
      .set('pageIndex', params.pageIndex.toString())
      .set('pageSize', params.pageSize.toString());
      
    return this.http.get<PagedResult<LoaiGiaDto>>(
      `${this.apiUrl}/${this.endpoint}`, 
      { params: httpParams }
    ).pipe(
      tap(result => this.cacheService.set(cacheKey, result))
    );
  }

  /**
   * Tìm kiếm loại giá với phân trang và sử dụng cache
   */
  search(params: SearchParams): Observable<PagedResult<LoaiGiaDto>> {
    // Không cache kết quả tìm kiếm với từ khóa rỗng
    if (!params.searchTerm.trim()) {
      return this.getAll({ pageIndex: params.pageIndex, pageSize: params.pageSize });
    }
    
    const cacheKey = `${this.cachePrefix}_search_${params.searchTerm}_${params.pageIndex}_${params.pageSize}`;
    const cachedData = this.cacheService.get<PagedResult<LoaiGiaDto>>(cacheKey);
    
    if (cachedData) {
      return of(cachedData);
    }

    let httpParams = new HttpParams()
      .set('searchTerm', params.searchTerm)
      .set('pageIndex', params.pageIndex.toString())
      .set('pageSize', params.pageSize.toString());
      
    return this.http.get<PagedResult<LoaiGiaDto>>(
      `${this.apiUrl}/${this.endpoint}/search`, 
      { params: httpParams }
    ).pipe(
      tap(result => this.cacheService.set(cacheKey, result))
    );
  }

  /**
   * Lấy chi tiết loại giá với cache
   */
  getById(id: string): Observable<ApiResponse<LoaiGiaDto>> {
    const cacheKey = `${this.cachePrefix}_detail_${id}`;
    const cachedData = this.cacheService.get<ApiResponse<LoaiGiaDto>>(cacheKey);
    
    if (cachedData) {
      return of(cachedData);
    }

    return this.http.get<ApiResponse<LoaiGiaDto>>(
      `${this.apiUrl}/${this.endpoint}/${id}`
    ).pipe(
      tap(result => this.cacheService.set(cacheKey, result))
    );
  }

  /**
   * Tạo mới loại giá và xóa cache liên quan
   */
  create(createDto: LoaiGiaCreateDto): Observable<ApiResponse<LoaiGiaDto>> {
    return this.http.post<ApiResponse<LoaiGiaDto>>(
      `${this.apiUrl}/${this.endpoint}`, 
      createDto
    ).pipe(
      tap(() => this.clearListCache())
    );
  }

  /**
   * Cập nhật loại giá và xóa cache liên quan
   */
  update(id: string, updateDto: LoaiGiaUpdateDto): Observable<ApiResponse<string>> {
    return this.http.put<ApiResponse<string>>(
      `${this.apiUrl}/${this.endpoint}/${id}`, 
      updateDto
    ).pipe(
      tap(() => {
        this.clearListCache();
        this.cacheService.remove(`${this.cachePrefix}_detail_${id}`);
      })
    );
  }

  /**
   * Xóa loại giá và cập nhật cache
   */
  delete(id: string): Observable<ApiResponse<string>> {
    return this.http.delete<ApiResponse<string>>(
      `${this.apiUrl}/${this.endpoint}/${id}`
    ).pipe(
      tap(() => {
        this.clearListCache();
        this.cacheService.remove(`${this.cachePrefix}_detail_${id}`);
      })
    );
  }

  /**
   * Kiểm tra loại giá có tồn tại không
   */
  exists(id: string): Observable<boolean> {
    return this.http.get<boolean>(`${this.apiUrl}/${this.endpoint}/exists/${id}`);
  }

  /**
   * Xóa cache danh sách
   */
  private clearListCache(): void {
    this.cacheService.removeByPrefix(`${this.cachePrefix}_all`);
    this.cacheService.removeByPrefix(`${this.cachePrefix}_search`);
  }
}