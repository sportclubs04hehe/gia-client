import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../../../environments/environment.development';
import { HangHoa } from '../models/dm_hanghoathitruong/dm-thitruong';
import { HangHoaCreateDto } from '../models/dm_hanghoathitruong/hh-thitruong-create';
import { HangHoaUpdateDto } from '../models/dm_hanghoathitruong/hh-thitruong-update';
import { PaginationParams } from '../models/pagination-params ';
import { SearchParams } from '../models/search-params';
import { SpecificationParams } from '../models/specification-params';
import { buildHttpParams } from '../utils/build-http-params';
import { PagedResult } from '../models/paged-result';
import { ApiResponse } from '../models/dm_hanghoathitruong/api-response';

@Injectable({
  providedIn: 'root'
})
export class DmThitruongService {
  private http = inject(HttpClient);
  private apiUrl = environment.appUrl;
  private endpoint = 'HangHoas';

  // Thêm mới
  add(createDto: HangHoaCreateDto) {
    return this.http.post<ApiResponse<HangHoa>>(`${this.apiUrl}/${this.endpoint}`, createDto);
  }

  // Thêm nhiều cùng lúc
  addBatch(createDtos: HangHoaCreateDto[]): Observable<HangHoa[]> {
    return this.http.post<HangHoa[]>(
      `${this.apiUrl}/${this.endpoint}/batch`,
      createDtos
    );
  }
  
  search(searchParams: SearchParams): Observable<PagedResult<HangHoa>> {
    const params = buildHttpParams(searchParams);
    
    return this.http.get<PagedResult<HangHoa>>(
      `${this.apiUrl}/${this.endpoint}/search`,
      { params }
    );
  }

  getAll(params: PaginationParams): Observable<PagedResult<HangHoa>> {
    const httpParams = new HttpParams()
      .set('pageIndex', params.pageIndex.toString())
      .set('PageSize', params.pageSize.toString());

    return this.http.get<PagedResult<HangHoa>>(
      `${this.apiUrl}/${this.endpoint}`,
      { params: httpParams }
    );
  }

  /**
 * Cập nhật thông tin hàng hóa
 */
  update(id: string, dto: HangHoaUpdateDto): Observable<ApiResponse<HangHoa>> {
    return this.http
      .put<ApiResponse<HangHoa>>(
        `${this.apiUrl}/${this.endpoint}/${id}`,
        dto
      );
  }
  /**
 * Xóa hàng hóa theo ID
 */
  delete(id: string): Observable<ApiResponse<string>> {
    return this.http.delete<ApiResponse<string>>(
      `${this.apiUrl}/${this.endpoint}/${id}`
    );
  }

  /**
   * Thêm nhiều hàng hóa cùng lúc
   */
  createMany(createDtos: HangHoaCreateDto[]) {
    return this.http.post<any>(`${this.apiUrl}/${this.endpoint}/batch`, createDtos);
  }

  /**
   * Lấy thông tin hàng hóa theo ID
   */
  getById(id: string): Observable<HangHoa> {
    return this.http.get<HangHoa>(`${this.apiUrl}/${this.endpoint}/${id}`);
  }

  /**
   * Lấy thông tin hàng hóa theo mã mặt hàng
   */
  getByMaMatHang(maMatHang: string): Observable<HangHoa> {
    return this.http.get<HangHoa>(`${this.apiUrl}/${this.endpoint}/ma/${maMatHang}`);
  }

  /**
   * Lấy danh sách hàng hóa theo nhóm hàng hóa
   */
  getByNhomHangHoa(nhomHangHoaId: string, paginationParams: PaginationParams): Observable<any> {
    const params = buildHttpParams(paginationParams);
    return this.http.get<any>(
      `${this.apiUrl}/${this.endpoint}/nhom/${nhomHangHoaId}`,
      { params }
    );
  }

  /**
   * Lọc và sắp xếp danh sách hàng hóa theo nhiều tiêu chí
   */
  getWithFilter(specParams: SpecificationParams): Observable<any> {
    const params = buildHttpParams(specParams);
    return this.http.get<any>(
      `${this.apiUrl}/${this.endpoint}/filter`,
      { params }
    );
  }

  /**
   * Lấy danh sách hàng hóa đang có hiệu lực
   */
  getActiveHangHoa(paginationParams: PaginationParams): Observable<any> {
    const params = buildHttpParams(paginationParams);
    return this.http.get<any>(
      `${this.apiUrl}/${this.endpoint}/active`,
      { params }
    );
  }

  /**
   * Kiểm tra sự tồn tại của hàng hóa theo ID
   */
  exists(id: string): Observable<boolean> {
    return this.http.get<boolean>(`${this.apiUrl}/${this.endpoint}/exists/${id}`);
  }

  /**
   * Kiểm tra sự tồn tại của hàng hóa theo mã mặt hàng
   */
  existsByMaMatHang(maMatHang: string): Observable<boolean> {
    return this.http.get<boolean>(`${this.apiUrl}/${this.endpoint}/exists-by-ma/${maMatHang}`);
  }

  /**
   * Đếm số lượng hàng hóa trong hệ thống
   */
  count(): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/${this.endpoint}/count`);
  }
}