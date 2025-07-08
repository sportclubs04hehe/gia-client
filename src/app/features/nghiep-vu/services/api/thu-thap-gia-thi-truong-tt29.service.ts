import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../../../environments/environment.development';
import { CacheService } from '../utils/cache.service';
import { Observable, map, shareReplay, tap } from 'rxjs';
import { PagedResult } from '../../../danhmuc/models/helpers/paged-result';
import { buildHttpParams } from '../../../danhmuc/helpers/build-http-params';
import { ApiResponse } from '../../../danhmuc/models/dm_hanghoathitruong/api-response';
import { HHThiTruongDto } from '../../../danhmuc/models/dm-hh-thitruong/HHThiTruongDto';
import { LoaiGiaDto } from '../../../danhmuc/models/dm-loai-gia/LoaiGiaDto';
import { PaginationParams } from '../../../danhmuc/models/helpers/pagination-params';
import { SearchParams } from '../../../danhmuc/models/helpers/search-params';
import { CreateThuThapGiaModel, UpdateThuThapGiaModel } from '../../models/thu-thap-gia-thi-truong-tt29/CreateThuThapGiaModel';
import { ThuThapGiaThiTruongDto } from '../../models/thu-thap-gia-thi-truong-tt29/ThuThapGiaThiTruongDto';
import { HHThiTruongTreeNodeDto } from '../../../danhmuc/models/dm-hh-thitruong/HHThiTruongTreeNodeDto';

@Injectable({
  providedIn: 'root'
})
export class ThuThapGiaThiTruongTt29Service {
  private http = inject(HttpClient);
  private apiUrl = environment.appUrl;
  private endpoint = 'ThuThapGiaThiTruongs';
  private cacheService = inject(CacheService);
  private cachePrefix = 'thuthapgiatheott29';

  constructor() { }

  /**
   * Lấy danh sách nhóm hàng hóa cha để hiển thị trong dropdown chọn nhóm
   */
  getNhomHangHoaCha(): Observable<HHThiTruongDto[]> {
    const cacheKey = `${this.cachePrefix}_nhomhanghoacha`;
    const cached = this.cacheService.get<HHThiTruongDto[]>(cacheKey);

    if (cached) {
      return new Observable(observer => {
        observer.next(cached);
        observer.complete();
      });
    }

    return this.http.get<HHThiTruongDto[]>(`${this.apiUrl}/${this.endpoint}/nhom-hang-hoa`)
      .pipe(
        tap(data => this.cacheService.set(cacheKey, data, 3600)) // cache for 1 hour
      );
  }

  /**
   * Lấy danh sách loại giá để hiển thị trong dropdown
   */
  getLoaiGia(): Observable<LoaiGiaDto[]> {
    const cacheKey = `${this.cachePrefix}_loaigia`;
    const cached = this.cacheService.get<LoaiGiaDto[]>(cacheKey);

    if (cached) {
      return new Observable(observer => {
        observer.next(cached);
        observer.complete();
      });
    }

    return this.http.get<LoaiGiaDto[]>(`${this.apiUrl}/${this.endpoint}/loai-gia`)
      .pipe(
        tap(data => this.cacheService.set(cacheKey, data, 3600)) // cache for 1 hour
      );
  }

  /**
   * Lấy danh sách phiếu thu thập giá có phân trang
   */
  getAll(params: PaginationParams): Observable<PagedResult<ThuThapGiaThiTruongDto>> {
    const httpParams = buildHttpParams(params);
    return this.http.get<PagedResult<ThuThapGiaThiTruongDto>>(`${this.apiUrl}/${this.endpoint}`, { params: httpParams });
  }

  /**
   * Tìm kiếm phiếu thu thập giá theo các tiêu chí
   */
  search(params: SearchParams): Observable<PagedResult<ThuThapGiaThiTruongDto>> {
    const httpParams = buildHttpParams(params);
    return this.http.get<PagedResult<ThuThapGiaThiTruongDto>>(`${this.apiUrl}/${this.endpoint}/search`, { params: httpParams });
  }

  /**
   * Lấy thông tin một phiếu thu thập giá theo id
   */
  getById(id: string): Observable<ThuThapGiaThiTruongDto> {
    return this.http.get<ThuThapGiaThiTruongDto>(`${this.apiUrl}/${this.endpoint}/${id}`);
  }

  /**
   * Lấy thông tin chi tiết của một phiếu thu thập giá cùng danh sách chi tiết giá
   */
  getWithDetails(id: string): Observable<ThuThapGiaThiTruongDto> {
    return this.http.get<ThuThapGiaThiTruongDto>(`${this.apiUrl}/${this.endpoint}/${id}/details`);
  }

  /**
   * Tạo mới phiếu thu thập giá kèm danh sách chi tiết giá
   */
  create(model: CreateThuThapGiaModel): Observable<ApiResponse<ThuThapGiaThiTruongDto>> {
    return this.http.post<ApiResponse<ThuThapGiaThiTruongDto>>(`${this.apiUrl}/${this.endpoint}`, model);
  }

  /**
   * Cập nhật phiếu thu thập giá kèm danh sách chi tiết giá
   */
  update(id: string, model: UpdateThuThapGiaModel): Observable<ApiResponse<string>> {
    return this.http.put<ApiResponse<string>>(`${this.apiUrl}/${this.endpoint}/${id}`, model);
  }

  /**
   * Xóa một phiếu thu thập giá
   */
  delete(id: string): Observable<ApiResponse<string>> {
    return this.http.delete<ApiResponse<string>>(`${this.apiUrl}/${this.endpoint}/${id}`);
  }

  /**
* Lấy tất cả các mặt hàng con theo ID cha (bao gồm cả lồng nhau)
* @param parentId ID của mặt hàng cha
* @returns Observable chứa danh sách mặt hàng con dạng cây
*/
  getAllChildrenRecursive(parentId: string, ngayNhap?: Date): Observable<HHThiTruongTreeNodeDto[]> {
    let params = new HttpParams();

    if (ngayNhap) {
      params = params.set('ngayNhap', ngayNhap.toISOString());
    }

    return this.http.get<ApiResponse<HHThiTruongTreeNodeDto[]>>(
      `${this.apiUrl}/${this.endpoint}/recursive-children/${parentId}`,
      { params }
    ).pipe(
      map(response => response.data || []),
      shareReplay(1)
    );
  }

  /**
   * Tìm kiếm mặt hàng theo từ khóa
   * @param nhomHangHoaId ID của nhóm hàng hóa
   * @param searchTerm Từ khóa tìm kiếm
   * @param maxResults Số lượng kết quả tối đa
   * @returns Observable chứa danh sách mặt hàng phù hợp
   */
  searchMatHang(
  nhomHangHoaId: string, 
  searchTerm: string, 
  ngayNhap?: Date,
  maxResults: number = 25
): Observable<HHThiTruongTreeNodeDto[]> {
  let params = new HttpParams()
    .set('q', searchTerm)
    .set('maxResults', maxResults.toString());
  
  // Thêm ngayNhap vào params nếu có
  if (ngayNhap) {
    params = params.set('ngayNhap', ngayNhap.toISOString());
  }
  
  return this.http.get<ApiResponse<HHThiTruongTreeNodeDto[]>>(
    `${this.apiUrl}/${this.endpoint}/search-mat-hang/${nhomHangHoaId}`,
    { params }
  ).pipe(
    map(response => response.data || []),
    shareReplay(1)
  );
}
}
