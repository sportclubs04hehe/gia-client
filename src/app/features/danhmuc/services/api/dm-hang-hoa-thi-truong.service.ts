import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../../../environments/environment.development';
import { Observable } from 'rxjs';
import { PagedResult } from '../../models/paged-result';
import { ApiResponse } from '../../models/dm_hanghoathitruong/api-response';
import { buildHttpParams } from '../../utils/build-http-params';
import { HHThiTruongTreeNodeDto } from '../../models/dm-hh-thitruong/HHThiTruongTreeNodeDto';
import { CreateHHThiTruongDto, UpdateHHThiTruongDto, CreateManyHHThiTruongDto } from '../../models/dm-hh-thitruong/CreateHHThiTruongDto';
import { HHThiTruongDto } from '../../models/dm-hh-thitruong/HHThiTruongDto';
import { PaginationParams } from '../../models/pagination-params ';
import { SearchParams } from '../../models/search-params';

@Injectable({
  providedIn: 'root'
})
export class DmHangHoaThiTruongService {
  private http = inject(HttpClient);
  private apiUrl = environment.appUrl;
  private endpoint = 'Dm_HHThiTruongs';

  constructor() { }

  /**
   * Lấy thông tin mặt hàng thị trường theo ID
   */
  getById(id: string): Observable<HHThiTruongTreeNodeDto> {
    return this.http.get<HHThiTruongTreeNodeDto>(`${this.apiUrl}/${this.endpoint}/${id}`);
  }

  /**
   * Lấy danh sách tất cả mặt hàng thị trường có phân trang
   */
  getAll(params: PaginationParams): Observable<PagedResult<HHThiTruongDto>> {
    const httpParams = buildHttpParams(params);
    return this.http.get<PagedResult<HHThiTruongDto>>(`${this.apiUrl}/${this.endpoint}`, { params: httpParams });
  }

  /**
   * Lấy danh sách các nhóm hàng hóa cha (không có mặt hàng cha)
   */
  getAllParentCategories(): Observable<HHThiTruongDto[]> {
    return this.http.get<HHThiTruongDto[]>(`${this.apiUrl}/${this.endpoint}/parents`);
  }

  /**
   * Lấy cấu trúc phân cấp của hàng hóa thị trường dạng cây
   */
  getHierarchicalCategories(): Observable<HHThiTruongTreeNodeDto[]> {
    return this.http.get<HHThiTruongTreeNodeDto[]>(`${this.apiUrl}/${this.endpoint}/hierarchical`);
  }

  /**
   * Tìm kiếm mặt hàng thị trường theo tên hoặc mã
   */
  search(params: SearchParams): Observable<PagedResult<HHThiTruongDto>> {
    const httpParams = buildHttpParams(params);
    return this.http.get<PagedResult<HHThiTruongDto>>(`${this.apiUrl}/${this.endpoint}/search`, { params: httpParams });
  }

  /**
   * Thêm mới mặt hàng thị trường
   */
  create(createDto: CreateHHThiTruongDto): Observable<ApiResponse<HHThiTruongDto>> {
    return this.http.post<ApiResponse<HHThiTruongDto>>(`${this.apiUrl}/${this.endpoint}`, createDto);
  }

  /**
   * Cập nhật thông tin mặt hàng thị trường
   */
  update(id: string, updateDto: UpdateHHThiTruongDto): Observable<ApiResponse<HHThiTruongDto>> {
    return this.http.put<ApiResponse<HHThiTruongDto>>(`${this.apiUrl}/${this.endpoint}/${id}`, updateDto);
  }

  /**
   * Xóa mặt hàng thị trường theo ID
   */
  delete(id: string): Observable<ApiResponse<string>> {
    return this.http.delete<ApiResponse<string>>(`${this.apiUrl}/${this.endpoint}/${id}`);
  }

  /**
   * Xóa nhiều mặt hàng thị trường cùng lúc
   */
  deleteMultiple(ids: string[]): Observable<ApiResponse<string[]>> {
    return this.http.delete<ApiResponse<string[]>>(`${this.apiUrl}/${this.endpoint}/batch`, { body: ids });
  }

  /**
   * Thêm nhiều mặt hàng thị trường cùng lúc
   */
  createMany(createDto: CreateManyHHThiTruongDto): Observable<ApiResponse<HHThiTruongDto[]>> {
    return this.http.post<ApiResponse<HHThiTruongDto[]>>(`${this.apiUrl}/${this.endpoint}/batch`, createDto);
  }

  /**
   * Tìm kiếm phân cấp với các nút được mở rộng tự động
   */
  searchHierarchical(searchTerm: string): Observable<HHThiTruongTreeNodeDto[]> {
    const params = new HttpParams().set('searchTerm', searchTerm);
    return this.http.get<HHThiTruongTreeNodeDto[]>(`${this.apiUrl}/${this.endpoint}/search-hierarchical`, { params });
  }

  /**
   * Lấy danh sách con theo ID cha với phân trang
   */
  getChildrenByParent(parentId: string, pageIndex: number = 1, pageSize: number = 100): Observable<PagedResult<HHThiTruongTreeNodeDto>> {
    const params = new HttpParams()
      .set('pageIndex', pageIndex.toString())
      .set('pageSize', pageSize.toString());
    
    return this.http.get<PagedResult<HHThiTruongTreeNodeDto>>(`${this.apiUrl}/${this.endpoint}/children/${parentId}`, { params });
  }
}
