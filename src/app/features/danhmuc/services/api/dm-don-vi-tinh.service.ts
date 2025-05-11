import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../../../../environments/environment.development';
import { DonViTinhDto } from '../../models/dm_donvitinh/don-ti-tinh.dto';
import { DonViTinhSelectDto } from '../../models/dm_donvitinh/don-vi-tinh-select.dto';
import { DonViTinhCreateDto } from '../../models/dm_donvitinh/don-vi-tinh_create.dto';
import { DonViTinhUpdateDto } from '../../models/dm_donvitinh/don-vi-tinh_update.dto';
import { ApiResponse } from '../../models/dm_hanghoathitruong/api-response';
import { PagedResult } from '../../models/paged-result';
import { PaginationParams } from '../../models/pagination-params ';
import { SearchParams } from '../../models/search-params';
import { buildHttpParams } from '../../utils/build-http-params';

@Injectable({
  providedIn: 'root'
})
export class DmDonViTinhService {
  private baseUrl = `${environment.appUrl}/donvitinhs`;

  // Cache for storing selection data
  private selectCache: { [key: string]: PagedResult<DonViTinhSelectDto> } = {};

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
    const cacheKey = `select_${params.pageIndex}_${params.pageSize}`;

    if (this.selectCache[cacheKey]) {
      console.log('Returning cached đơn vị tính data');
      return of(this.selectCache[cacheKey]);
    }

    console.log('Fetching đơn vị tính data from API');
    return this.http.get<PagedResult<DonViTinhSelectDto>>(
      `${this.baseUrl}/get-all-select`,
      { params: httpParams }
    ).pipe(
      tap(result => {
        this.selectCache[cacheKey] = result;
      })
    );
  }

  /**
   * Clear the select cache (call after CRUD operations)
   */
  clearSelectCache(): void {
    this.selectCache = {};
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
   * Lấy đơn vị tính theo tên
   * @param ten Tên đơn vị tính cần tìm
   */
  getByTen(ten: string): Observable<ApiResponse<DonViTinhDto>> {
    return this.http.get<ApiResponse<DonViTinhDto>>(`${this.baseUrl}/ten/${encodeURIComponent(ten)}`);
  }

  /**
   * Thêm mới đơn vị tính
   */
  create(donViTinh: DonViTinhCreateDto): Observable<ApiResponse<DonViTinhDto>> {
    return this.http.post<ApiResponse<DonViTinhDto>>(this.baseUrl, donViTinh)
      .pipe(tap(() => this.clearSelectCache()));
  }

  /**
   * Tạo nhiều đơn vị tính
   */
  createMany(donViTinhs: DonViTinhCreateDto[]): Observable<DonViTinhDto[]> {
    return this.http.post<DonViTinhDto[]>(`${this.baseUrl}/many`, donViTinhs);
  }

  /**
   * Tạo hoặc lấy nhiều đơn vị tính (nếu đã tồn tại thì không thêm mới)
   */
  createOrGetMany(donViTinhs: DonViTinhCreateDto[]): Observable<DonViTinhDto[]> {
    return this.http.post<DonViTinhDto[]>(`${this.baseUrl}/create-or-get-many`, donViTinhs);
  }

  /**
   * Thêm mới đơn vị tính nếu chưa tồn tại
   * @param ten Tên đơn vị tính cần thêm
   * @returns Thông tin đơn vị tính (đã tồn tại hoặc mới tạo)
   */
  addIfNotExists(ten: string): Observable<ApiResponse<DonViTinhDto>> {
    return this.http.post<ApiResponse<DonViTinhDto>>(`${this.baseUrl}/add-if-not-exists`, JSON.stringify(ten), {
      headers: {
        'Content-Type': 'application/json'
      }
    }).pipe(
      tap(() => this.clearSelectCache())
    );
  }

  // Thêm phương thức mới để xử lý nhiều đơn vị tính cùng lúc

  /**
   * Tìm hoặc tạo nhiều đơn vị tính theo tên cùng lúc
   * @param tenDonViTinhs Danh sách tên đơn vị tính
   * @returns Map từ tên đơn vị tính đến ID
   */
  getOrCreateManyByNames(tenDonViTinhs: string[]): Observable<ApiResponse<{ [key: string]: string }>> {
    return this.http.post<ApiResponse<{ [key: string]: string }>>(
      `${this.baseUrl}/get-or-create-by-names`,
      tenDonViTinhs
    ).pipe(
      tap(() => this.clearSelectCache())
    );
  }

  /**
   * Thêm nhiều đơn vị tính một lúc
   * @param donViTinhs Danh sách đơn vị tính cần thêm
   */
  bulkAdd(donViTinhs: DonViTinhCreateDto[]): Observable<ApiResponse<DonViTinhDto[]>> {
    return this.http.post<ApiResponse<DonViTinhDto[]>>(
      `${this.baseUrl}/bulk-add`,
      donViTinhs
    ).pipe(
      tap(() => this.clearSelectCache())
    );
  }

  /**
   * Cập nhật đơn vị tính
   */
  update(id: string, donViTinh: DonViTinhUpdateDto): Observable<ApiResponse<DonViTinhDto>> {
    return this.http.put<ApiResponse<DonViTinhDto>>(`${this.baseUrl}/${id}`, donViTinh)
      .pipe(tap(() => this.clearSelectCache()));
  }

  /**
   * Xóa đơn vị tính
   */
  delete(id: string): Observable<ApiResponse<string>> {
    return this.http.delete<ApiResponse<string>>(`${this.baseUrl}/${id}`)
      .pipe(tap(() => this.clearSelectCache()));
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
