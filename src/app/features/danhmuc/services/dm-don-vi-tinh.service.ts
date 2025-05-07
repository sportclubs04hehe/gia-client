import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DonViTinhDto } from '../models/dm_donvitinh/don-ti-tinh.dto';
import { DonViTinhCreateDto } from '../models/dm_donvitinh/don-vi-tinh_create.dto';
import { DonViTinhUpdateDto } from '../models/dm_donvitinh/don-vi-tinh_update.dto';
import { PagedResult } from '../models/paged-result';
import { PaginationParams } from '../models/pagination-params ';
import { SearchParams } from '../models/search-params';
import { buildHttpParams } from '../utils/build-http-params';
import { ApiResponse } from '../models/dm_hanghoathitruong/api-response';
import { environment } from '../../../../environments/environment.development';
import { DonViTinhSelectDto } from '../models/dm_donvitinh/don-vi-tinh-select.dto';

@Injectable({
  providedIn: 'root'
})
export class DmDonViTinhService {
  private baseUrl = `${environment.appUrl}/donvitinhs`;

  constructor(private http: HttpClient) { }

  /**
   * Lấy danh sách đơn vị tính có phân trang
   */
  getAll(params: PaginationParams): Observable<PagedResult<DonViTinhDto>> {
    const httpParams = buildHttpParams(params);
    return this.http.get<PagedResult<DonViTinhDto>>(this.baseUrl, { params: httpParams });
  }

  getAllSelect(params: PaginationParams): Observable<PagedResult<DonViTinhSelectDto>> {
    const httpParams = buildHttpParams(params);
    return this.http.get<PagedResult<DonViTinhSelectDto>>(`${this.baseUrl}/get-all-select`, { params: httpParams });
  }

  /**
   * Tìm kiếm đơn vị tính
   */
  search(params: SearchParams): Observable<PagedResult<DonViTinhDto>> {
    const httpParams = buildHttpParams(params);
    return this.http.get<PagedResult<DonViTinhDto>>(`${this.baseUrl}/search`, { params: httpParams });
  }

  /**
   * Lấy đơn vị tính theo ID
   */
  getById(id: string): Observable<DonViTinhDto> {
    return this.http.get<DonViTinhDto>(`${this.baseUrl}/${id}`);
  }

  /**
   * Lấy đơn vị tính theo mã
   */
  getByMa(ma: string): Observable<DonViTinhDto> {
    return this.http.get<DonViTinhDto>(`${this.baseUrl}/ma/${ma}`);
  }

  /**
   * Thêm mới đơn vị tính
   */
  create(donViTinh: DonViTinhCreateDto): Observable<ApiResponse<DonViTinhDto>> {
    return this.http.post<ApiResponse<DonViTinhDto>>(this.baseUrl, donViTinh);
  }

  /**
   * Tạo nhiều đơn vị tính
   */
  createMany(donViTinhs: DonViTinhCreateDto[]): Observable<DonViTinhDto[]> {
    return this.http.post<DonViTinhDto[]>(`${this.baseUrl}/many`, donViTinhs);
  }

  /**
   * Cập nhật đơn vị tính
   */
  update(id: string, donViTinh: DonViTinhUpdateDto): Observable<ApiResponse<DonViTinhDto>> {
    return this.http.put<ApiResponse<DonViTinhDto>>(`${this.baseUrl}/${id}`, donViTinh);
  }

  /**
   * Xóa đơn vị tính
   */
  delete(id: string): Observable<ApiResponse<string>> {
    return this.http.delete<ApiResponse<string>>(`${this.baseUrl}/${id}`);
  }

  /**
   * Kiểm tra đơn vị tính tồn tại
   */
  exists(id: string): Observable<boolean> {
    return this.http.get<boolean>(`${this.baseUrl}/exists/${id}`);
  }

  /**
   * Kiểm tra mã đơn vị tính đã tồn tại chưa
   * @param ma Mã đơn vị tính cần kiểm tra
   * @param excludeId ID của đơn vị tính cần loại trừ khỏi việc kiểm tra (dùng khi cập nhật)
   */
  existsByMa(ma: string, excludeId?: string): Observable<ApiResponse<boolean>> {
    let params = new HttpParams();
    
    if (excludeId) {
      params = params.set('excludeId', excludeId);
    }
    
    return this.http.get<ApiResponse<boolean>>(`${this.baseUrl}/exists-by-ma/${ma}`, { params });
  }
}
