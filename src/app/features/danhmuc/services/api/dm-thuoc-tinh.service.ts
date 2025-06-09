import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment.development';
import { ApiResponse } from '../../models/dm_hanghoathitruong/api-response';
import { PagedResult } from '../../models/helpers/paged-result';
import { PaginationParams } from '../../models/helpers/pagination-params ';
import { buildHttpParams } from '../../helpers/build-http-params';
import { SearchParams } from '../../models/helpers/search-params';
import { DmThuocTinhDto } from '../../models/dm_thuoctinh/DmThuocTinhDto';
import { DmThuocTinhCreateDto, DmThuocTinhUpdateDto } from '../../models/dm_thuoctinh/DmThuocTinhCreateDto';
import { DmThuocTinhCategoryInfoDto } from '../../models/dm_thuoctinh/DmThuocTinhCategoryInfoDto';
import { DmThuocTinhCreateManyDto } from '../../models/dm_thuoctinh/DmThuocTinhCreateManyDto';
import { DmThuocTinhTreeNodeDto } from '../../models/dm_thuoctinh/DmThuocTinhTreeNodeDto';
import { CodeValidationResult } from '../../models/helpers/CodeValidationResult';
import { MultipleCodeValidationRequestDto } from '../../models/helpers/MultipleCodeValidationRequestDto';

@Injectable({
  providedIn: 'root'
})
export class DmThuocTinhService {
  private http = inject(HttpClient);
  private apiUrl = environment.appUrl;
  private endpoint = 'Dm_ThuocTinhs';
  private baseUrl = `${this.apiUrl}/${this.endpoint}`;

  /**
   * Lấy thông tin thuộc tính theo ID
   */
  getById(id: string): Observable<DmThuocTinhDto> {
    return this.http.get<DmThuocTinhDto>(`${this.baseUrl}/${id}`);
  }
  
  /**
   * Lấy danh sách các thuộc tính cha (không có thuộc tính cha)
   */
  getAllParentCategories(): Observable<DmThuocTinhDto[]> {
    return this.http.get<DmThuocTinhDto[]>(`${this.baseUrl}/parents`);
  }
  
  /**
   * Lấy danh sách tất cả các thuộc tính kèm thông tin có chứa con hay không
   */
  getAllCategoriesWithChildInfo(): Observable<DmThuocTinhCategoryInfoDto[]> {
    return this.http.get<DmThuocTinhCategoryInfoDto[]>(`${this.baseUrl}/categories-with-info`);
  }
  
  /**
   * Thêm mới thuộc tính
   */
  create(createDto: DmThuocTinhCreateDto): Observable<ApiResponse<DmThuocTinhDto>> {
    return this.http.post<ApiResponse<DmThuocTinhDto>>(this.baseUrl, createDto);
  }
  
  /**
   * Cập nhật thông tin thuộc tính
   */
  update(id: string, updateDto: DmThuocTinhUpdateDto): Observable<ApiResponse<DmThuocTinhDto>> {
    return this.http.put<ApiResponse<DmThuocTinhDto>>(`${this.baseUrl}/${id}`, updateDto);
  }
  
  /**
   * Xóa thuộc tính theo ID
   */
  delete(id: string): Observable<ApiResponse<string>> {
    return this.http.delete<ApiResponse<string>>(`${this.baseUrl}/${id}`);
  }
  
  /**
   * Xóa nhiều thuộc tính cùng lúc
   */
  deleteMultiple(ids: string[]): Observable<ApiResponse<string[]>> {
    return this.http.delete<ApiResponse<string[]>>(`${this.baseUrl}/batch`, { body: ids });
  }
  
  /**
   * Thêm nhiều thuộc tính cùng lúc
   */
  createMany(createDto: DmThuocTinhCreateManyDto): Observable<ApiResponse<DmThuocTinhDto[]>> {
    return this.http.post<ApiResponse<DmThuocTinhDto[]>>(`${this.baseUrl}/batch`, createDto);
  }
  
  /**
   * Lấy danh sách thuộc tính con theo thuộc tính cha có phân trang
   */
  getChildrenByParent(parentId: string, paginationParams: PaginationParams): Observable<PagedResult<DmThuocTinhTreeNodeDto>> {
    const params = buildHttpParams(paginationParams);
    return this.http.get<PagedResult<DmThuocTinhTreeNodeDto>>(`${this.baseUrl}/children/${parentId}`, { params });
  }
  
  /**
   * Tìm kiếm phân cấp với phân trang
   */
  searchHierarchical(searchParams: SearchParams): Observable<PagedResult<DmThuocTinhTreeNodeDto>> {
    const params = buildHttpParams(searchParams);
    return this.http.get<PagedResult<DmThuocTinhTreeNodeDto>>(`${this.baseUrl}/search-hierarchical`, { params });
  }
  
  /**
   * Lấy đường dẫn đầy đủ từ gốc đến node bao gồm các node con
   */
  getFullPathWithChildren(targetNodeId: string, newItemId?: string): Observable<DmThuocTinhTreeNodeDto[]> {
    let params = new HttpParams();
    if (newItemId) {
      params = params.set('newItemId', newItemId);
    }
    return this.http.get<DmThuocTinhTreeNodeDto[]>(`${this.baseUrl}/full-path/${targetNodeId}`, { params });
  }
  
  /**
   * Kiểm tra mã thuộc tính đã tồn tại trong cùng nhóm hay chưa
   */
  validateCode(ma: string, parentId?: string, exceptId?: string): Observable<ApiResponse<CodeValidationResult>> {
    let params = new HttpParams().set('ma', ma);
    
    if (parentId) {
      params = params.set('parentId', parentId);
    }
    
    if (exceptId) {
      params = params.set('exceptId', exceptId);
    }
    
    return this.http.get<ApiResponse<CodeValidationResult>>(`${this.baseUrl}/validate-code`, { params });
  }
  
  /**
   * Kiểm tra nhiều mã thuộc tính cùng lúc trong cùng nhóm
   */
  validateMultipleCodes(request: MultipleCodeValidationRequestDto): Observable<ApiResponse<CodeValidationResult[]>> {
    return this.http.post<ApiResponse<CodeValidationResult[]>>(`${this.baseUrl}/validate-multiple-codes`, request);
  }
}
