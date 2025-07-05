import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, BehaviorSubject, of, shareReplay, tap, map } from 'rxjs';
import { environment } from '../../../../../environments/environment.development';
import { ApiResponse } from '../../models/dm_hanghoathitruong/api-response';
import { HHThiTruongTreeNodeDto } from '../../models/dm-hh-thitruong/HHThiTruongTreeNodeDto';
import { CreateHHThiTruongDto, UpdateHHThiTruongDto, CreateManyHHThiTruongDto } from '../../models/dm-hh-thitruong/CreateHHThiTruongDto';
import { HHThiTruongDto } from '../../models/dm-hh-thitruong/HHThiTruongDto';
import { CategoryInfoDto } from '../../models/dm-hh-thitruong/CategoryInfoDto';
import { HHThiTruongBatchImportDto } from '../../models/dm-hh-thitruong/HHThiTruongImportDto';
import { CodeValidationResult } from '../../models/helpers/CodeValidationResult';
import { MultipleCodeValidationRequestDto } from '../../models/helpers/MultipleCodeValidationRequestDto';
import { PagedResult } from '../../models/helpers/paged-result';

@Injectable({
  providedIn: 'root'
})
export class DmHangHoaThiTruongService {
  private http = inject(HttpClient);
  private apiUrl = environment.appUrl;
  private endpoint = 'Dm_HHThiTruongs';

  // Thêm biến cache để lưu trữ danh sách nhóm hàng hóa
  private categoriesCache: CategoryInfoDto[] = [];
  private categoriesCacheLoaded = false;
  private categoriesLoadingSubject = new BehaviorSubject<boolean>(false);

  // Observable để theo dõi trạng thái tải
  public categoriesLoading$ = this.categoriesLoadingSubject.asObservable();

  /**
   * Cache cho danh sách nhóm hàng hóa cha
   */
  private parentCategoriesCache: HHThiTruongDto[] = [];
  private parentCategoriesCacheLoaded = false;

  constructor() { }

  /**
   * Lấy thông tin mặt hàng thị trường theo ID
   */
  getById(id: string): Observable<HHThiTruongDto> {
    return this.http.get<HHThiTruongDto>(`${this.apiUrl}/${this.endpoint}/${id}`);
  }

  /**
   * Lấy danh sách các nhóm hàng hóa cha (không có mặt hàng cha)
   */
  getAllParentCategories(): Observable<HHThiTruongDto[]> {
    // Nếu đã có dữ liệu trong cache, trả về từ cache
    if (this.parentCategoriesCacheLoaded) {
      return of(this.parentCategoriesCache);
    }

    // Nếu chưa có cache, gọi API và lưu kết quả
    return this.http.get<HHThiTruongDto[]>(`${this.apiUrl}/${this.endpoint}/parents`)
      .pipe(
        tap(data => {
          this.parentCategoriesCache = data;
          this.parentCategoriesCacheLoaded = true;
        }),
        shareReplay(1)
      );
  }

  /**
   * Tìm kiếm nhóm hàng hóa trong cache thay vì gọi API
   * @param searchTerm Từ khóa tìm kiếm
   * @returns Danh sách kết quả tìm kiếm
   */
  searchCategoriesInCache(searchTerm: string): Observable<CategoryInfoDto[]> {
    if (!this.categoriesCacheLoaded) {
      // Nếu chưa có cache, load data trước
      return this.getAllCategoriesWithChildInfo().pipe(
        tap(() => this.categoriesLoadingSubject.next(false)),
        map(allData => this.filterCategories(allData, searchTerm))
      );
    }

    // Nếu đã có cache, tìm kiếm trực tiếp
    const results = this.filterCategories(this.categoriesCache, searchTerm);
    return of(results);
  }

  /**
   * Lọc danh sách nhóm hàng hóa theo từ khóa
   * @param data Danh sách dữ liệu đầu vào
   * @param searchTerm Từ khóa tìm kiếm
   * @returns Danh sách kết quả đã lọc
   */
  private filterCategories(data: CategoryInfoDto[], searchTerm: string): CategoryInfoDto[] {
    const term = searchTerm.toLowerCase().trim();

    // Nếu không có từ khóa, trả về tất cả
    if (!term) return data;

    // Lọc theo mã hoặc tên
    return data.filter(item =>
      item.ma?.toLowerCase().includes(term) ||
      item.ten?.toLowerCase().includes(term)
    );
  }

  /**
   * Thêm mới mặt hàng thị trường
   * @param dto Dữ liệu mặt hàng cần thêm mới
   * @returns Observable chứa kết quả từ API
   */
  create(dto: CreateHHThiTruongDto): Observable<ApiResponse<HHThiTruongDto>> {
    // Chuyển đổi từ camelCase sang PascalCase
    const formattedDto = {
      Ma: dto.ma,
      Ten: dto.ten,
      GhiChu: dto.ghiChu,
      NgayHieuLuc: dto.ngayHieuLuc,
      NgayHetHieuLuc: dto.ngayHetHieuLuc,
      LoaiMatHang: dto.loaiMatHang,
      MatHangChaId: dto.matHangChaId || null,
      DacTinh: dto.dacTinh,
      DonViTinhId: dto.donViTinhId || null
    };

    return this.http.post<ApiResponse<HHThiTruongDto>>(
      `${this.apiUrl}/${this.endpoint}`,
      formattedDto
    ).pipe(
      // Xóa cả hai loại cache
      tap(() => {
        this.refreshCategoriesCache();
        this.clearParentCategoriesCache();
      })
    );
  }

  /**
   * Cập nhật thông tin mặt hàng thị trường
   * @param id ID của mặt hàng cần cập nhật
   * @param updateDto Dữ liệu cập nhật
   * @returns Observable chứa kết quả từ API
   */
  update(id: string, updateDto: UpdateHHThiTruongDto): Observable<ApiResponse<HHThiTruongDto>> {
    // Chuyển đổi từ camelCase sang PascalCase
    const formattedDto = {
      Ma: updateDto.ma,
      Ten: updateDto.ten,
      GhiChu: updateDto.ghiChu,
      NgayHieuLuc: updateDto.ngayHieuLuc,
      NgayHetHieuLuc: updateDto.ngayHetHieuLuc,
      LoaiMatHang: updateDto.loaiMatHang,
      MatHangChaId: updateDto.matHangChaId || null,
      DacTinh: updateDto.dacTinh,
      DonViTinhId: updateDto.donViTinhId || null
    };

    return this.http.put<ApiResponse<HHThiTruongDto>>(
      `${this.apiUrl}/${this.endpoint}/${id}`,
      formattedDto
    ).pipe(
      // Làm mới cache sau khi cập nhật thành công
      tap(() => this.refreshCategoriesCache())
    );
  }

  /**
   * Xóa mặt hàng thị trường theo ID
   * @param id ID của mặt hàng cần xóa
   * @returns Observable chứa kết quả từ API
   */
  delete(id: string): Observable<ApiResponse<string>> {
    return this.http.delete<ApiResponse<string>>(
      `${this.apiUrl}/${this.endpoint}/${id}`
    ).pipe(
      // Làm mới cache sau khi xóa thành công
      tap(() => this.refreshCategoriesCache())
    );
  }

  /**
   * Xóa nhiều mặt hàng thị trường cùng lúc
   * @param ids Danh sách ID cần xóa
   * @returns Observable chứa kết quả từ API
   */
  deleteMultiple(ids: string[]): Observable<ApiResponse<string[]>> {
    return this.http.delete<ApiResponse<string[]>>(
      `${this.apiUrl}/${this.endpoint}/batch`,
      { body: ids }
    ).pipe(
      // Làm mới cache sau khi xóa nhiều thành công
      tap(() => this.refreshCategoriesCache())
    );
  }

  /**
   * Thêm nhiều mặt hàng thị trường cùng lúc
   * @param createDto Dữ liệu nhiều mặt hàng cần thêm
   * @returns Observable chứa kết quả từ API
   */
  createMany(createDto: CreateManyHHThiTruongDto): Observable<ApiResponse<HHThiTruongDto[]>> {
    // Chuyển đổi từ camelCase sang PascalCase cho mỗi item
    const formattedItems = createDto.items.map(item => ({
      Ma: item.ma,
      Ten: item.ten,
      GhiChu: item.ghiChu,
      NgayHieuLuc: item.ngayHieuLuc,
      NgayHetHieuLuc: item.ngayHetHieuLuc,
      LoaiMatHang: item.loaiMatHang,
      MatHangChaId: item.matHangChaId || null,
      DacTinh: item.dacTinh,
      DonViTinhId: item.donViTinhId || null
    }));

    return this.http.post<ApiResponse<HHThiTruongDto[]>>(
      `${this.apiUrl}/${this.endpoint}/batch`,
      { items: formattedItems }
    ).pipe(
      // Làm mới cache sau khi thêm nhiều thành công
      tap(() => this.refreshCategoriesCache())
    );
  }

  /**
   * Import mặt hàng thị trường từ Excel
   * @param importDto Dữ liệu import bao gồm mặt hàng cha và danh sách mặt hàng con
   * @returns Observable chứa kết quả từ API
   */
  importFromExcel(importDto: HHThiTruongBatchImportDto): Observable<ApiResponse<HHThiTruongDto[]>> {
    // Chuyển đổi từ camelCase sang PascalCase
    const formattedDto = {
      MatHangChaId: importDto.matHangChaId,
      Items: importDto.items.map(item => ({
        Ma: item.ma,
        Ten: item.ten,
        GhiChu: item.ghiChu,
        LoaiMatHang: item.loaiMatHang,
        DacTinh: item.dacTinh,
        NgayHieuLuc: item.ngayHieuLuc,
        NgayHetHieuLuc: item.ngayHetHieuLuc,
        DonViTinhTen: item.donViTinhTen
      }))
    };

    return this.http.post<ApiResponse<HHThiTruongDto[]>>(
      `${this.apiUrl}/${this.endpoint}/import-from-excel`,
      formattedDto
    ).pipe(
      // Làm mới cache sau khi import thành công
      tap(() => {
        this.refreshCategoriesCache();
        this.clearParentCategoriesCache();
        this.clearSearchCache();
      })
    );
  }

  /**
   * Làm mới cache khi cần thiết
   * Được gọi sau các thao tác thêm, sửa, xóa
   */
  refreshCategoriesCache(): void {
    this.categoriesCacheLoaded = false;
    this.categoriesCache = [];
    this.categoriesLoadingSubject.next(false);
  }

  /**
   * Xóa cache khi có thay đổi dữ liệu
   */
  clearParentCategoriesCache(): void {
    this.parentCategoriesCacheLoaded = false;
    this.parentCategoriesCache = [];
  }

  /**
   * Lấy danh sách tất cả các nhóm hàng hóa kèm thông tin có chứa con hay không
   * @returns Observable chứa danh sách nhóm hàng hóa từ cache hoặc API
   */
  getAllCategoriesWithChildInfo(): Observable<CategoryInfoDto[]> {
    // Nếu đã có dữ liệu trong cache, trả về từ cache
    if (this.categoriesCacheLoaded && this.categoriesCache.length > 0) {
      return of(this.categoriesCache);
    }

    // Đánh dấu đang tải
    this.categoriesLoadingSubject.next(true);

    // Gọi API và lưu kết quả vào cache
    return this.http.get<CategoryInfoDto[]>(`${this.apiUrl}/${this.endpoint}/categories-with-info`)
      .pipe(
        tap(data => {
          this.categoriesCache = data;
          this.categoriesCacheLoaded = true;
          this.categoriesLoadingSubject.next(false);
        }),
        shareReplay(1) // Chia sẻ kết quả nếu có nhiều subscriber
      );
  }

  /**
   * Tìm kiếm phân cấp với các nút được mở rộng tự động
   * @param searchTerm Từ khóa tìm kiếm
   * @returns Observable chứa cây kết quả tìm kiếm
   */
  searchHierarchical(searchTerm: string): Observable<HHThiTruongTreeNodeDto[]> {
    if (!searchTerm || searchTerm.trim().length < 2) {
      return of([]);
    }

    const params = new HttpParams()
      .set('searchTerm', searchTerm.trim())
      .set('pageIndex', '1')
      .set('pageSize', '15'); // Lấy đủ kết quả để hiển thị

    return this.http.get<any>(
      `${this.apiUrl}/${this.endpoint}/search-hierarchical`,
      { params }
    ).pipe(
      map(response => {
        // Handle different response formats
        if (Array.isArray(response)) {
          return response;
        } else if (response && response.data && Array.isArray(response.data)) {
          return response.data; // Extract the data array from PagedResult
        }
        return []; // Default to empty array if unexpected format
      }),
      shareReplay(1)
    );
  }

  /**
   * Tối ưu: Tìm kiếm kết hợp cache cho các truy vấn lặp lại
   * @param searchTerm Từ khóa tìm kiếm
   * @returns Observable chứa kết quả tìm kiếm
   */
  private searchCache = new Map<string, HHThiTruongTreeNodeDto[]>();
  private searchInProgress = new Map<string, boolean>();

  optimizedSearchHierarchical(searchTerm: string): Observable<HHThiTruongTreeNodeDto[]> {
    // Chuẩn hóa từ khóa tìm kiếm
    const normalizedTerm = searchTerm.trim().toLowerCase();

    // Kiểm tra nếu đã có trong cache
    if (this.searchCache.has(normalizedTerm)) {
      return of(this.searchCache.get(normalizedTerm)!);
    }

    // Kiểm tra nếu đang tìm kiếm
    if (this.searchInProgress.get(normalizedTerm)) {
      // Đợi kết quả từ request hiện tại
      return this.searchHierarchical(normalizedTerm);
    }

    // Đánh dấu đang tìm kiếm
    this.searchInProgress.set(normalizedTerm, true);

    // Thực hiện tìm kiếm và lưu vào cache
    return this.searchHierarchical(normalizedTerm).pipe(
      tap(results => {
        this.searchCache.set(normalizedTerm, results);
        this.searchInProgress.set(normalizedTerm, false);
      }),
      shareReplay(1)
    );
  }

  /**
   * Xóa cache tìm kiếm khi dữ liệu thay đổi
   */
  clearSearchCache(): void {
    this.searchCache.clear();
    this.searchInProgress.clear();
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

  validateCode(ma: string, parentId?: string, exceptId?: string): Observable<ApiResponse<CodeValidationResult>> {
    let params = new HttpParams()
      .set('ma', ma);

    if (parentId) {
      params = params.set('parentId', parentId);
    }

    if (exceptId) {
      params = params.set('exceptId', exceptId);
    }

    return this.http.get<ApiResponse<CodeValidationResult>>(
      `${this.apiUrl}/${this.endpoint}/validate-code`,
      { params }
    );
  }

  validateMultipleCodes(request: MultipleCodeValidationRequestDto): Observable<ApiResponse<CodeValidationResult[]>> {
    return this.http.post<ApiResponse<CodeValidationResult[]>>(
      `${this.apiUrl}/${this.endpoint}/validate-multiple-codes`,
      request
    );
  }

  /**
     * Lấy cấu trúc cây phân cấp của mặt hàng thị trường
     * @param parentId ID của mặt hàng cha cần lấy cấu trúc cây
     * @returns Observable<ApiResponse<HHThiTruongTreeNodeDto[]>> Trả về cấu trúc cây phân cấp
     */
  getHierarchicalDescendants(parentId: string): Observable<ApiResponse<HHThiTruongTreeNodeDto[]>> {
    return this.http.get<ApiResponse<HHThiTruongTreeNodeDto[]>>(
      `${this.apiUrl}/${this.endpoint}/hierarchical-path/${parentId}`
    );
  }

}
