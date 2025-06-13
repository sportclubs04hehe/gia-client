import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../../../environments/environment.development';
import { Observable } from 'rxjs';
import { PagedResult } from '../../../danhmuc/models/helpers/paged-result';
import { ApiResponse } from '../../../danhmuc/models/dm_hanghoathitruong/api-response';
import { ThuThapGiaThiTruongCreateDto } from '../../models/thu-thap-gia-thi-truong/ThuThapGiaThiTruongCreateDto';
import { ThuThapGiaThiTruongUpdateDto } from '../../models/thu-thap-gia-thi-truong/ThuThapGiaThiTruongUpdateDto';
import { SearchParams } from '../../../danhmuc/models/helpers/search-params';
import { ThuThapGiaThiTruongDto } from '../../models/thu-thap-gia-thi-truong/ThuThapGiaThiTruongDto';
import { PaginationParams } from '../../../danhmuc/models/helpers/pagination-params ';

@Injectable({
  providedIn: 'root'
})
export class ThuThapGiaThiTruongService {
  private http = inject(HttpClient);
  private apiUrl = environment.appUrl;
  private endpoint = 'ThuThapGiaThiTruongs';

  constructor() { }
  
  /**
   * Lấy danh sách giá thị trường có phân trang
   * @param params Tham số phân trang
   */
  getAll(params: PaginationParams): Observable<PagedResult<ThuThapGiaThiTruongDto>> {
    let httpParams = new HttpParams()
      .set('pageIndex', params.pageIndex.toString())
      .set('pageSize', params.pageSize.toString());
      
    return this.http.get<PagedResult<ThuThapGiaThiTruongDto>>(`${this.apiUrl}/${this.endpoint}`, { params: httpParams });
  }

  /**
   * Tìm kiếm giá thị trường với phân trang
   * @param params Tham số tìm kiếm
   */
  search(params: SearchParams): Observable<PagedResult<ThuThapGiaThiTruongDto>> {
    let httpParams = new HttpParams()
      .set('searchTerm', params.searchTerm || '')
      .set('pageIndex', params.pageIndex.toString())
      .set('pageSize', params.pageSize.toString());
      
    return this.http.get<PagedResult<ThuThapGiaThiTruongDto>>(`${this.apiUrl}/${this.endpoint}/search`, { params: httpParams });
  }

  /**
   * Lấy thông tin chi tiết giá thị trường theo ID
   * @param id ID của giá thị trường
   */
  getById(id: string): Observable<ApiResponse<ThuThapGiaThiTruongDto>> {
    return this.http.get<ApiResponse<ThuThapGiaThiTruongDto>>(`${this.apiUrl}/${this.endpoint}/${id}`);
  }

  /**
   * Tạo mới dữ liệu giá thị trường
   * @param createDto Dữ liệu tạo mới
   */
  create(createDto: ThuThapGiaThiTruongCreateDto): Observable<ApiResponse<ThuThapGiaThiTruongDto>> {
    return this.http.post<ApiResponse<ThuThapGiaThiTruongDto>>(`${this.apiUrl}/${this.endpoint}`, createDto);
  }

  /**
   * Cập nhật dữ liệu giá thị trường
   * @param updateDto Dữ liệu cập nhật
   */
  update(updateDto: ThuThapGiaThiTruongUpdateDto): Observable<ApiResponse<string>> {
    return this.http.put<ApiResponse<string>>(`${this.apiUrl}/${this.endpoint}`, updateDto);
  }

  /**
   * Xóa dữ liệu giá thị trường
   * @param id ID của giá thị trường cần xóa
   */
  delete(id: string): Observable<ApiResponse<string>> {
    return this.http.delete<ApiResponse<string>>(`${this.apiUrl}/${this.endpoint}/${id}`);
  }
}
