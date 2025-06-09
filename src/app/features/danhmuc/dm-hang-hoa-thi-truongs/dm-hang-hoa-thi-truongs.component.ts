import { Component, inject, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap'; // Ensure this import is present
import { ActiveButtonComponent } from '../../../shared/components/active-button/active-button.component';
import { SearchBarComponent } from '../../../shared/components/search-bar/search-bar.component';
import { DmHangHoaThiTruongService } from '../services/api/dm-hang-hoa-thi-truong.service';
import { HHThiTruongDto } from '../models/dm-hh-thitruong/HHThiTruongDto';
import { HHThiTruongTreeNodeDto } from '../models/dm-hh-thitruong/HHThiTruongTreeNodeDto';
import { NgxSpinnerModule } from 'ngx-spinner';
import { TreeTableComponent } from '../../../shared/components/table/tree-table/tree-table.component';
import { TableColumn } from '../../../shared/models/table-column';
import { ThemmoiComponent } from './themmoi/themmoi.component';
import { SuaComponent } from './sua/sua.component';
import { Observable, Subject } from 'rxjs';
import { TreeCrudComponentBase } from '../../../shared/components/bases/tree-crud-component-base';
import { TreeSearchService } from '../services/utils/tree-search.service';
import { HhThiTruongImportExcelComponent } from './hh-thi-truong-import-excel/hh-thi-truong-import-excel.component';
import { Loai } from '../models/enum/loai';

@Component({
  selector: 'app-dm-hang-hoa-thi-truongs',
  standalone: true,
  imports: [
    CommonModule,
    ActiveButtonComponent,
    SearchBarComponent,
    NgxSpinnerModule,
    TreeTableComponent
  ],
  templateUrl: './dm-hang-hoa-thi-truongs.component.html',
  styleUrl: './dm-hang-hoa-thi-truongs.component.css'
})
export class DmHangHoaThiTruongsComponent extends TreeCrudComponentBase<HHThiTruongDto, HHThiTruongTreeNodeDto> implements OnInit, OnDestroy {
  private dmHangHoaThiTruongService = inject(DmHangHoaThiTruongService);
  private treeSearchService = inject(TreeSearchService);
  private ngbModalService = inject(NgbModal); 
  private destroy$ = new Subject<void>();

  isSearchActive = false;
  currentSearchTerm = '';
  searchResults: HHThiTruongDto[] = [];

  @ViewChild(TreeTableComponent) override treeTableComponent!: TreeTableComponent<HHThiTruongDto>;
  @ViewChild(SearchBarComponent) searchBarComponent?: SearchBarComponent;

  /* Cấu hình bảng hiển thị */
  columns: TableColumn<HHThiTruongDto>[] = [
    { field: 'ma', header: 'Mã', width: '20%' },
    { field: 'ten', header: 'Tên', width: '45%' },
    { field: 'tenDonViTinh', header: 'Đơn vị tính', width: '10%', formatter: (item) => item.tenDonViTinh || '' },
    { field: 'dacTinh', header: 'Đặc tính', width: '25%', formatter: (item) => item.dacTinh || '' }
  ];

  constructor() {
    super();
    // Bind the method to preserve 'this' context when used in template binding
    this.loadChildrenForNode = this.loadChildrenForNode.bind(this);
  }

  /* Lifecycle hooks */
  ngOnInit(): void {
    this.loadParentItems();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /* Quản lý tìm kiếm và xử lý kết quả */
  onSearch(searchTerm: string): void {
    if (!searchTerm || searchTerm.trim().length < 2) {
      this.onClearSearch();
      return;
    }

    this.currentSearchTerm = searchTerm;
    this.isSearchActive = true;

    this.treeSearchService.performSearch<HHThiTruongTreeNodeDto>(
      searchTerm,
      (term) => this.dmHangHoaThiTruongService.optimizedSearchHierarchical(term),
      this.destroy$,
      2,
      400
    ).subscribe({
      next: (results) => {
        this.handleSearchResults(results);
      },
      error: (error) => {
        console.error('Lỗi khi tìm kiếm:', error);
        this.isSearchActive = false;
      }
    });
  }

  /* Xử lý kết quả tìm kiếm phân cấp */
  private handleSearchResults(results: any): void {
    // Sử dụng service để trích xuất kết quả
    const nodeResults = this.treeSearchService.extractSearchResults<HHThiTruongTreeNodeDto>(results);

    if (nodeResults.length === 0) {
      this.parentItems = [];
      return;
    }

    // Now we're sure nodeResults is an array
    this.parentItems = this.convertNodeToEntity(nodeResults);

    // Đánh dấu là đang trong chế độ tìm kiếm
    this.isSearchActive = true;

    // Sử dụng TreeSearchService để xử lý kết quả
    this.treeSearchService.processSearchResults<HHThiTruongTreeNodeDto>(
      nodeResults,
      this.treeTableComponent,
      (results) => this.processTreePath(results),
      (results) => this.autoExpandNodesWithSearchResults(results)
    );
  }

  /* Quản lý hiển thị kết quả tìm kiếm */
  private autoExpandNodesWithSearchResults(nodes: HHThiTruongTreeNodeDto[]): void {
    this.treeSearchService.autoExpandSearchResults<HHThiTruongTreeNodeDto, HHThiTruongDto>(
      nodes,
      this.treeTableComponent,
      (node) => node.loaiMatHang === Loai.Cha,
      (node) => node.matHangCon || [],
      (nodes) => this.convertNodeToEntity(nodes)
    );
  }

  /* Xóa tìm kiếm và reset hiển thị */
  onClearSearch(): void {
    if (!this.isSearchActive) return;

    this.isSearchActive = false;
    this.currentSearchTerm = '';
    this.searchResults = [];
    this.loadParentItems(); // Tải lại dữ liệu gốc
  }

  /* Implement abstract methods từ lớp cơ sở */
  override getItemById(id: string): Observable<HHThiTruongDto> {
    return this.dmHangHoaThiTruongService.getById(id);
  }

  override getEntityName(): string {
    return 'mặt hàng';
  }

  override handleItemCreated(result: any): void {
    if (result.parentId) {
      this.navigateToItemInTree(result.parentId, result.item);
    } else {
      this.loadParentItems();
      this.selectAndScrollToItem(result.item);
    }
  }

  override handleItemUpdated(updatedItem: HHThiTruongDto, originalData?: any): void {
    const originalParentId = originalData?.matHangChaId;
    this.updateNodeInTree(updatedItem, originalParentId);
  }

  override handleItemDeleted(item: HHThiTruongDto, totalDeleted: number = 1): void {
    this.removeDeletedItemFromUI(item);
  }

  /* TreeCrudComponentBase implementation */
  override getParentIdFieldName(): string {
    return 'matHangChaId';
  }

  override hasChildrenForNode(node: HHThiTruongDto | HHThiTruongTreeNodeDto): boolean {
    return node.loaiMatHang === Loai.Cha;
  }

  override loadChildrenForNode(parentId: string, pageIndex: number, pageSize: number): Observable<any> {
    return this.dmHangHoaThiTruongService.getChildrenByParent(parentId, pageIndex, pageSize);
  }

  /* Chuyển đổi dữ liệu */
  override convertNodeToEntity(nodes: HHThiTruongTreeNodeDto[]): HHThiTruongDto[] {
    // Add defensive check for non-array inputs
    if (!nodes || !Array.isArray(nodes)) {
      console.error('Expected array in convertNodeToEntity but got:', typeof nodes, nodes);
      return [];
    }

    return nodes.map(node => ({
      id: node.id,
      ma: node.ma,
      ten: node.ten,
      loaiMatHang: node.loaiMatHang,
      matHangChaId: node.matHangChaId || null,
      donViTinhId: node.donViTinhId || null,
      tenDonViTinh: node.tenDonViTinh || null,
      ngayHieuLuc: node.ngayHieuLuc || '',
      ngayHetHieuLuc: node.ngayHetHieuLuc || null,
      ghiChu: node.ghiChu || null,
      dacTinh: node.dacTinh || null
    } as HHThiTruongDto));
  }

  override getFullPathWithChildren(parentId: string, itemId: string): Observable<HHThiTruongTreeNodeDto[]> {
    return this.dmHangHoaThiTruongService.getFullPathWithChildren(parentId, itemId);
  }

  override loadParentItemsFromService(): Observable<HHThiTruongDto[]> {
    return this.dmHangHoaThiTruongService.getAllParentCategories();
  }

  /* Override methods cho cấu trúc cụ thể */
  protected override getNodeChildren(node: any): HHThiTruongTreeNodeDto[] {
    return node.matHangCon || [];
  }

  /* Quản lý xóa dữ liệu */
  protected override deleteItem(item: HHThiTruongDto, hasChildren: boolean): void {
    this.spinnerService.showSavingSpinner();

    if (hasChildren) {
      // Xóa nhóm mặt hàng và tất cả con bên trong
      this.dmHangHoaThiTruongService.deleteMultiple([item.id]).subscribe({
        next: (response) => {
          this.spinnerService.hideSavingSpinner();
          const totalDeleted = response.data?.length ?? 0;
          this.handleItemDeleted(item, totalDeleted);

          // Custom success message
          if (totalDeleted > 1) {
            this.toastr.success(`Đã xóa nhóm mặt hàng và ${totalDeleted - 1} mặt hàng con`, 'Thông báo');
          } else {
            this.toastr.success('Đã xóa mặt hàng thành công', 'Thông báo');
          }
        },
        error: (error) => {
          this.handleDeleteError(error);
        }
      });
    } else {
      // Xóa mặt hàng đơn
      this.dmHangHoaThiTruongService.delete(item.id).subscribe({
        next: () => {
          this.spinnerService.hideSavingSpinner();
          this.handleItemDeleted(item);
          this.toastr.success('Đã xóa mặt hàng thành công', 'Thông báo');
        },
        error: (error) => {
          this.handleDeleteError(error);
        }
      });
    }
  }

  /* Quản lý hành động UI */
  onButtonAction(action: string): void {
    switch (action) {
      case 'add':
        // Use base class method from CrudComponentBase
        super.openAddModal(ThemmoiComponent, {
          size: 'xl',
          data: { nhomHangHoaList: this.parentItems }
        });
        break;
      case 'edit':
        if (this.selectedItem) {
          // Use base class method from CrudComponentBase
          super.openEditModal(SuaComponent, this.selectedItem, { size: 'xl' });
        } else {
          this.toastr.warning('Vui lòng chọn một mặt hàng để chỉnh sửa', 'Cảnh báo');
        }
        break;
      case 'delete':
        if (this.selectedItem) {
          const isItemWithChildren = this.selectedItem.loaiMatHang === Loai.Cha;
          // Use base class method from CrudComponentBase
          super.openDeleteConfirmationModal(this.selectedItem, {
            isGroup: isItemWithChildren,
            groupItemName: 'nhóm mặt hàng'
          });
        } else {
          this.toastr.warning('Vui lòng chọn một mặt hàng để xóa', 'Cảnh báo');
        }
        break;
      case 'import':
        this.openImportExcelModal();
        break;
      case 'refresh':
        this.isSearchActive = false;
        this.currentSearchTerm = '';
        this.searchResults = [];
        if (this.searchBarComponent) {
          this.searchBarComponent.clearSearch();
        }
        if (this.treeTableComponent) {
          this.treeTableComponent.expandedRows.clear();
          this.treeTableComponent.nodeChildrenMap.clear();
          this.treeTableComponent.nodeLoadingMap.clear();
          this.treeTableComponent.nodePaginationMap.clear();
          this.treeTableComponent.selectedRowId = '';
        }

        this.selectedItem = null;
        this.dmHangHoaThiTruongService.clearParentCategoriesCache();
        this.loadParentItems();
        break;
    }
  }

  openImportExcelModal(): void {
    const modalRef = this.ngbModalService.open(HhThiTruongImportExcelComponent, { 
      size: 'xl',
      backdrop: 'static'
    });

    modalRef.result.then((result) => {
      if (result === true) {
        // Import thành công, làm mới cache và danh sách
        this.dmHangHoaThiTruongService.clearParentCategoriesCache();
        this.loadParentItems();
      }
    }, () => {
      // Dismissed
    });
  }

  /* Xử lý lỗi */
  private handleDeleteError(error: any): void {
    this.spinnerService.hideSavingSpinner();
    console.error('Lỗi khi xóa mặt hàng:', error);
  }
}
