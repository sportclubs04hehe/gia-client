import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../../../environments/environment.development';
import { CacheService } from '../utils/cache.service';
import { Observable } from 'rxjs';
import { ApiResponse } from '../../../danhmuc/models/dm_hanghoathitruong/api-response';
import { ThuThapGiaChiTietDto } from '../../models/thu-thap-gia-chi-tiet/ThuThapGiaChiTietDto';
import { ThuThapGiaChiTietCreateDto } from '../../models/thu-thap-gia-chi-tiet/ThuThapGiaChiTietCreateDto';
import { ThuThapGiaChiTietUpdateDto } from '../../models/thu-thap-gia-chi-tiet/ThuThapGiaChiTietUpdateDto';

@Injectable({
  providedIn: 'root'
})
export class ThuThapGiaChiTietService {
  private http = inject(HttpClient);
  private apiUrl = environment.appUrl;
  private endpoint = 'ThuThapGiaChiTiets';
  private cacheService = inject(CacheService);
  private cachePrefix = 'thuthapgiachitiet';

  constructor() { }
  
  /**
   * Lấy danh sách chi tiết giá của một phiếu thu thập giá
   * @param thuThapGiaId ID của phiếu thu thập giá
   */
  getByThuThapGiaId(thuThapGiaId: string): Observable<ThuThapGiaChiTietDto[]> {
    return this.http.get<ThuThapGiaChiTietDto[]>(`${this.apiUrl}/${this.endpoint}/by-phieu/${thuThapGiaId}`);
  }
  
  /**
   * Lấy thông tin chi tiết giá theo id
   */
  getById(id: string): Observable<ThuThapGiaChiTietDto> {
    return this.http.get<ThuThapGiaChiTietDto>(`${this.apiUrl}/${this.endpoint}/${id}`);
  }
  
  /**
   * Lấy lịch sử giá của một mặt hàng
   */
  getLichSuGia(hangHoaId: string): Observable<ThuThapGiaChiTietDto[]> {
    return this.http.get<ThuThapGiaChiTietDto[]>(`${this.apiUrl}/${this.endpoint}/history/${hangHoaId}`);
  }
  
  /**
   * Tạo mới một chi tiết giá
   */
  create(model: ThuThapGiaChiTietCreateDto): Observable<ApiResponse<ThuThapGiaChiTietDto>> {
    return this.http.post<ApiResponse<ThuThapGiaChiTietDto>>(`${this.apiUrl}/${this.endpoint}`, model);
  }
  
  /**
   * Cập nhật một chi tiết giá
   */
  update(id: string, model: ThuThapGiaChiTietUpdateDto): Observable<ApiResponse<string>> {
    return this.http.put<ApiResponse<string>>(`${this.apiUrl}/${this.endpoint}/${id}`, model);
  }
  
  /**
   * Xóa một chi tiết giá
   */
  delete(id: string): Observable<ApiResponse<string>> {
    return this.http.delete<ApiResponse<string>>(`${this.apiUrl}/${this.endpoint}/${id}`);
  }
  
  /**
   * Lưu nhiều chi tiết giá cùng một lúc
   */
  saveMany(models: ThuThapGiaChiTietCreateDto[]): Observable<ApiResponse<boolean>> {
    return this.http.post<ApiResponse<boolean>>(`${this.apiUrl}/${this.endpoint}/batch`, models);
  }
  
  /**
   * Tính toán lại tỷ lệ tăng giảm cho các chi tiết giá của một phiếu
   */
  tinhToanTyLeTangGiam(thuThapGiaId: string): Observable<ApiResponse<boolean>> {
    return this.http.post<ApiResponse<boolean>>(`${this.apiUrl}/${this.endpoint}/${thuThapGiaId}/calculate`, {});
  }
}
