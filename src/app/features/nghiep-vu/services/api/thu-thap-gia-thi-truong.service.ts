import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../../../environments/environment.development';
import { Observable, of } from 'rxjs';
import { PagedResult } from '../../../danhmuc/models/helpers/paged-result';
import { ApiResponse } from '../../../danhmuc/models/dm_hanghoathitruong/api-response';
import { ThuThapGiaThiTruongCreateDto } from '../../models/thu-thap-gia-thi-truong/ThuThapGiaThiTruongCreateDto';
import { ThuThapGiaThiTruongUpdateDto } from '../../models/thu-thap-gia-thi-truong/ThuThapGiaThiTruongUpdateDto';
import { SearchParams } from '../../../danhmuc/models/helpers/search-params';
import { ThuThapGiaThiTruongDto } from '../../models/thu-thap-gia-thi-truong/ThuThapGiaThiTruongDto';
import { PaginationParams } from '../../../danhmuc/models/helpers/pagination-params';
import { tap } from 'rxjs/operators';
import { CacheService } from '../utils/cache.service';

@Injectable({
  providedIn: 'root'
})
export class ThuThapGiaThiTruongService {
  private http = inject(HttpClient);
  private cacheService = inject(CacheService);
  private apiUrl = environment.appUrl;
  private endpoint = 'ThuThapGiaThiTruongs';
  private cachePrefix = 'ttgtt';

  constructor() { }
  
  /**
   * Lấy danh sách giá thị trường có phân trang và sử dụng cache
   */
  getAll(params: PaginationParams): Observable<PagedResult<ThuThapGiaThiTruongDto>> {
    const cacheKey = `${this.cachePrefix}_all_${params.pageIndex}_${params.pageSize}`;
    const cachedData = this.cacheService.get<PagedResult<ThuThapGiaThiTruongDto>>(cacheKey);
    
    if (cachedData) {
      return of(cachedData);
    }

    let httpParams = new HttpParams()
      .set('pageIndex', params.pageIndex.toString())
      .set('pageSize', params.pageSize.toString());
      
    return this.http.get<PagedResult<ThuThapGiaThiTruongDto>>(
      `${this.apiUrl}/${this.endpoint}`, 
      { params: httpParams }
    ).pipe(
      tap(result => this.cacheService.set(cacheKey, result))
    );
  }

  /**
   * Tìm kiếm giá thị trường với phân trang và sử dụng cache
   */
  search(params: SearchParams): Observable<PagedResult<ThuThapGiaThiTruongDto>> {
    // Không cache kết quả tìm kiếm với từ khóa rỗng
    if (!params.searchTerm.trim()) {
      return this.getAll({ pageIndex: params.pageIndex, pageSize: params.pageSize });
    }
    
    const cacheKey = `${this.cachePrefix}_search_${params.searchTerm}_${params.pageIndex}_${params.pageSize}`;
    const cachedData = this.cacheService.get<PagedResult<ThuThapGiaThiTruongDto>>(cacheKey);
    
    if (cachedData) {
      return of(cachedData);
    }

    let httpParams = new HttpParams()
      .set('searchTerm', params.searchTerm)
      .set('pageIndex', params.pageIndex.toString())
      .set('pageSize', params.pageSize.toString());
      
    return this.http.get<PagedResult<ThuThapGiaThiTruongDto>>(
      `${this.apiUrl}/${this.endpoint}/search`, 
      { params: httpParams }
    ).pipe(
      tap(result => this.cacheService.set(cacheKey, result))
    );
  }

  /**
   * Lấy chi tiết với cache
   */
  getById(id: string): Observable<ApiResponse<ThuThapGiaThiTruongDto>> {
    const cacheKey = `${this.cachePrefix}_detail_${id}`;
    const cachedData = this.cacheService.get<ApiResponse<ThuThapGiaThiTruongDto>>(cacheKey);
    
    if (cachedData) {
      return of(cachedData);
    }

    return this.http.get<ApiResponse<ThuThapGiaThiTruongDto>>(
      `${this.apiUrl}/${this.endpoint}/${id}`
    ).pipe(
      tap(result => this.cacheService.set(cacheKey, result))
    );
  }

  /**
   * Tạo mới và xóa cache liên quan
   */
  create(createDto: ThuThapGiaThiTruongCreateDto): Observable<ApiResponse<ThuThapGiaThiTruongDto>> {
    return this.http.post<ApiResponse<ThuThapGiaThiTruongDto>>(
      `${this.apiUrl}/${this.endpoint}`, 
      createDto
    ).pipe(
      tap(() => this.clearListCache())
    );
  }

  /**
   * Cập nhật và xóa cache liên quan
   */
  update(updateDto: ThuThapGiaThiTruongUpdateDto): Observable<ApiResponse<string>> {
    return this.http.put<ApiResponse<string>>(
      `${this.apiUrl}/${this.endpoint}`, 
      updateDto
    ).pipe(
      tap(() => {
        this.clearListCache();
        this.cacheService.remove(`${this.cachePrefix}_detail_${updateDto.id}`);
      })
    );
  }

  /**
   * Xóa và cập nhật cache
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
   * Xóa cache danh sách
   */
  private clearListCache(): void {
    this.cacheService.removeByPrefix(`${this.cachePrefix}_all`);
    this.cacheService.removeByPrefix(`${this.cachePrefix}_search`);
  }
}
