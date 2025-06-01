import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, of, shareReplay, tap } from 'rxjs';
import { environment } from '../../../../../environments/environment.development';
import { buildHttpParams } from '../../helpers/build-http-params';
import { ApiResponse } from '../../models/dm_hanghoathitruong/api-response';
import { PagedResult } from '../../models/helpers/paged-result';
import { CreateNhomHangHoaDto } from '../../models/dm_nhomhanghoathitruong/CreateNhomHangHoaDto';
import { UpdateNhomHangHoaDto } from '../../models/dm_nhomhanghoathitruong/UpdateNhomHangHoaDto';
import { NhomHangHoaDetailDto } from '../../models/dm_nhomhanghoathitruong/NhomHangHoaDetailDto';
import { NhomHangHoaDto } from '../../models/dm_nhomhanghoathitruong/NhomHangHoaDto';
import { HangHoa } from '../../models/dm_hanghoathitruong/dm-thitruong';

@Injectable({
  providedIn: 'root'
})
export class DmNhomHangHoaService {
  private http = inject(HttpClient);
  private apiUrl = environment.appUrl;
  private endpoint = 'NhomHangHoas';
  
  // Cache storage
  private rootNodesCache: {
    data: NhomHangHoaDetailDto | null;
    timestamp: number;
    observable: Observable<NhomHangHoaDetailDto> | null;
  } = {
    data: null,
    timestamp: 0,
    observable: null
  };
  
  // Cache TTL in milliseconds (e.g., 5 minutes)
  private cacheTTL = 5 * 60 * 1000;

  /**
   * Lấy nhóm hàng hóa theo ID
   */
  getById(id: string): Observable<NhomHangHoaDto> {
    return this.http.get<NhomHangHoaDto>(`${this.apiUrl}/${this.endpoint}/${id}`);
  }

  /**
   * Lấy danh sách nhóm hàng hóa phân trang
   */
  getAll(params: { pageIndex: number; pageSize: number }): Observable<PagedResult<NhomHangHoaDto>> {
    const httpParams = new HttpParams()
      .set('pageIndex', params.pageIndex.toString())
      .set('pageSize', params.pageSize.toString());

    return this.http.get<PagedResult<NhomHangHoaDto>>(
      `${this.apiUrl}/${this.endpoint}`,
      { params: httpParams }
    );
  }

  /**
   * Tìm kiếm nhóm hàng hóa
   */
  search(searchParams: Record<string, any>): Observable<PagedResult<NhomHangHoaDto>> {
    const params = buildHttpParams(searchParams);

    return this.http.get<PagedResult<NhomHangHoaDto>>(
      `${this.apiUrl}/${this.endpoint}/search`,
      { params }
    );
  }

  /**
   * Lấy danh sách nhóm con trực tiếp của một nhóm
   */
  getChildGroups(parentId: string): Observable<NhomHangHoaDto[]> {
    return this.http.get<NhomHangHoaDto[]>(
      `${this.apiUrl}/${this.endpoint}/${parentId}/children`
    );
  }

  /**
   * Lấy nhóm hàng hóa gốc với các nhóm con
   * Uses cached data if available and not expired
   */
  getRootNodes(): Observable<NhomHangHoaDetailDto> {
    const now = Date.now();
    
    // If we have valid cached data, return it
    if (this.rootNodesCache.data && 
        now - this.rootNodesCache.timestamp < this.cacheTTL) {
      return of(this.rootNodesCache.data);
    }
    
    // If there's an ongoing request, return the same observable
    if (this.rootNodesCache.observable) {
      return this.rootNodesCache.observable;
    }
    
    // Otherwise, make a new request and cache it
    const observable = this.http.get<NhomHangHoaDetailDto>(
      `${this.apiUrl}/${this.endpoint}/root-nodes`
    ).pipe(
      shareReplay(1)
    );
    
    // Store the observable for potential concurrent requests
    this.rootNodesCache.observable = observable;
    
    // Subscribe to store the actual data
    observable.subscribe({
      next: (data) => {
        this.rootNodesCache.data = data;
        this.rootNodesCache.timestamp = Date.now();
        this.rootNodesCache.observable = null; // Clear the observable reference
      },
      error: () => {
        this.rootNodesCache.observable = null; // Clear on error
      }
    });
    
    return observable;
  }
  
  /**
   * Invalidate the root nodes cache
   * Call this when you create, update, or delete a node
   */
  invalidateRootNodesCache(): void {
    this.rootNodesCache = {
      data: null,
      timestamp: 0,
      observable: null
    };
  }

  /**
   * Lấy tất cả hàng hóa trong một nhóm (bao gồm các nhóm con)
   */
  getProductsInGroup(
    groupId: string, 
    paginationParams: { pageIndex: number; pageSize: number }
  ): Observable<PagedResult<HangHoa>> {
    const params = new HttpParams()
      .set('pageIndex', paginationParams.pageIndex.toString())
      .set('pageSize', paginationParams.pageSize.toString());

    return this.http.get<PagedResult<HangHoa>>(
      `${this.apiUrl}/${this.endpoint}/${groupId}/products`,
      { params }
    );
  }

  /**
   * Tạo mới nhóm hàng hóa
   */
  create(createDto: CreateNhomHangHoaDto): Observable<ApiResponse<NhomHangHoaDto>> {
    return this.http.post<ApiResponse<NhomHangHoaDto>>(
      `${this.apiUrl}/${this.endpoint}`,
      createDto
    ).pipe(
      tap(() => this.invalidateRootNodesCache())
    );
  }

  /**
   * Cập nhật nhóm hàng hóa
   */
  update(id: string, updateDto: UpdateNhomHangHoaDto): Observable<ApiResponse<NhomHangHoaDto>> {
    const observable = this.http.put<ApiResponse<NhomHangHoaDto>>(
      `${this.apiUrl}/${this.endpoint}/${id}`,
      updateDto
    );
    
    // Invalidate cache when updating nhóm hàng hóa
    observable.subscribe(() => this.invalidateRootNodesCache());
    
    return observable;
  }

  /**
   * Xóa nhóm hàng hóa và các dữ liệu liên quan
   */
  delete(id: string): Observable<ApiResponse<string>> {
    const observable = this.http.delete<ApiResponse<string>>(
      `${this.apiUrl}/${this.endpoint}/${id}`
    );
    
    // Invalidate cache when deleting nhóm hàng hóa
    observable.subscribe(() => this.invalidateRootNodesCache());
    
    return observable;
  }
}
