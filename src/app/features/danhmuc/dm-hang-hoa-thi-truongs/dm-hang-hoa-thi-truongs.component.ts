import { Component, inject, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap'; // Ensure this import is present
import { ActiveButtonComponent } from '../../../shared/components/active-button/active-button.component';
import { SearchBarComponent } from '../../../shared/components/search/search-bar/search-bar.component';
import { DmHangHoaThiTruongService } from '../services/api/dm-hang-hoa-thi-truong.service';
import { HHThiTruongDto } from '../models/dm-hh-thitruong/HHThiTruongDto';
import { HHThiTruongTreeNodeDto } from '../models/dm-hh-thitruong/HHThiTruongTreeNodeDto';
import { NgxSpinnerModule } from 'ngx-spinner';
import { TreeTableComponent } from '../../../shared/components/table/tree-table/tree-table.component';
import { TableColumn } from '../../../shared/models/table-column';
import { ThemmoiComponent } from './themmoi/themmoi.component';
import { SuaComponent } from './sua/sua.component';
import { catchError, map, Observable, of, Subject } from 'rxjs';
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

  // Add this property to track newly added items
  newlyAddedItemId: string | null = null;

  // Add property to store the parent ID of newly added items
  newItemParentId: string | null = null;

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
    // Set the newly added item ID
    this.newlyAddedItemId = result.item?.id;
    
    // Store the parent ID of the new item
    this.newItemParentId = result.parentId || null;
    
    if (result.parentId) {
      this.navigateToItemInTree(result.parentId, result.item);
      
      // After navigation, set the parent ID for the "View All" feature
      setTimeout(() => {
        if (this.treeTableComponent) {
          this.treeTableComponent.setParentForNewItem(result.parentId);
        }
      }, 500);
    } else {
      this.loadParentItems();
      this.selectAndScrollToItem(result.item);
    }
    
    // Clear the indicator after a few seconds
    setTimeout(() => {
      this.newlyAddedItemId = null;
      this.newItemParentId = null;
      // Force refresh view if needed
      if (this.treeTableComponent) {
        this.treeTableComponent.detectChanges();
      }
    }, 5000); // 5 seconds
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

override getFullPathWithChildren(parentId: string, itemId: string): Observable<HHThiTruongTreeNodeDto[]> {
  // Thay đổi ở đây: Sử dụng itemId thay vì parentId để lấy đường dẫn đầy đủ
  const idToUse = itemId || parentId;

  if (!idToUse) {
    return of([]);
  }

  // Sử dụng getHierarchicalDescendants để lấy cấu trúc cây phân cấp
  return this.dmHangHoaThiTruongService.getHierarchicalDescendants(idToUse).pipe(
    map(response => {
      if (!response || !response.data) {
        return [];
      }

      this.autoExpandPathNodes(response.data);
      
      return response.data;
    }),
    catchError(error => {
      console.error('Lỗi khi lấy cấu trúc cây:', error);
      return of([]);
    })
  );
}

// Thêm phương thức mới để tự động mở rộng các node cha
private autoExpandPathNodes(pathNodes: HHThiTruongDto[] | HHThiTruongTreeNodeDto[]): void {
  if (!this.treeTableComponent) return;
  
  // Tạo Map để lưu trữ các node con theo ID của node cha
  const nodeChildrenMap = new Map<string, HHThiTruongDto[]>();
  
  // Xây dựng Map node cha -> danh sách con
  for (const node of pathNodes) {
    if (node.matHangChaId) {
      if (!nodeChildrenMap.has(node.matHangChaId)) {
        nodeChildrenMap.set(node.matHangChaId, []);
      }
      nodeChildrenMap.get(node.matHangChaId)?.push(node as HHThiTruongDto);
    }
  }
  
  // Duyệt qua từng node trong đường dẫn (trừ node cuối là bản ghi mới)
  for (let i = 0; i < pathNodes.length - 1; i++) {
    const node = pathNodes[i];
    if (node.id) {
      // Mở rộng node
      this.treeTableComponent.expandedRows.set(node.id, true);
      
      // Nếu node này có con trong đường dẫn, cập nhật nodeChildrenMap của TreeTable
      if (nodeChildrenMap.has(node.id)) {
        if (this.treeTableComponent.nodeChildrenMap.has(node.id)) {
          // Đã có danh sách con, kiểm tra và thêm bản ghi mới nếu chưa tồn tại
          const existingChildren = this.treeTableComponent.nodeChildrenMap.get(node.id) || [];
          const newChildren = nodeChildrenMap.get(node.id) || [];
          
          // Thêm các bản ghi mới chưa có trong danh sách hiện tại
          for (const newChild of newChildren) {
            const exists = existingChildren.some(existing => existing.id === newChild.id);
            if (!exists) {
              existingChildren.push(newChild);
            }
          }
          
          // Cập nhật lại danh sách
          this.treeTableComponent.nodeChildrenMap.set(node.id, existingChildren);
        } else {
          // Chưa có danh sách con, thêm mới
          this.treeTableComponent.nodeChildrenMap.set(node.id, nodeChildrenMap.get(node.id) || []);
        }
      }
    }
  }
  
  // Đảm bảo bản ghi mới luôn được hiển thị bằng cách thêm trực tiếp vào danh sách con
  const lastNode = pathNodes[pathNodes.length - 1];
  if (lastNode && lastNode.matHangChaId) {
    const parentId = lastNode.matHangChaId;
    
    // Kiểm tra xem nhóm cha đã được mở rộng chưa
    if (this.treeTableComponent.expandedRows.get(parentId)) {
      const existingChildren = this.treeTableComponent.nodeChildrenMap.get(parentId) || [];
      
      // Kiểm tra bản ghi mới đã có trong danh sách chưa
      const exists = existingChildren.some(existing => existing.id === lastNode.id);
      if (!exists) {
        existingChildren.push(lastNode as HHThiTruongDto);
        this.treeTableComponent.nodeChildrenMap.set(parentId, existingChildren);
      }
    }
  }
  
  // Cập nhật UI
  this.treeTableComponent.detectChanges();
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

  // Add method to load all children for a parent
  loadAllChildrenForParent(parentId: string): void {
    if (!parentId || !this.treeTableComponent) return;
    
    this.spinnerService.showSavingSpinner();
    
    // Call service to get all children with a large page size
    this.dmHangHoaThiTruongService.getChildrenByParent(parentId, 1, 1000).subscribe({
      next: (result) => {
        if (result && result.data) {
          // Update the tree table with all children
          const allChildren = this.convertNodeToEntity(result.data);
          
          // Set all children to the tree table
          this.treeTableComponent.nodeChildrenMap.set(parentId, allChildren);
          
          // Ensure the node is expanded
          this.treeTableComponent.expandedRows.set(parentId, true);
          
          // Update pagination info
          this.treeTableComponent.nodePaginationMap.set(parentId, {
            currentPage: 1,
            totalPages: Math.ceil((result.pagination?.totalItems || allChildren.length) / this.treeTableComponent.defaultPageSize),
            hasNextPage: false,
            isLoadingMore: false
          });
          
          // Force refresh
          this.treeTableComponent.detectChanges();
          
          // Wait a bit and scroll to the newly added item to keep it visible
          setTimeout(() => {
            if (this.newlyAddedItemId) {
              this.scrollToSelectedItem(this.newlyAddedItemId);
            }
          }, 100);
        }
        
        this.spinnerService.hideSavingSpinner();
      },
      error: (error) => {
        console.error('Lỗi khi tải tất cả bản ghi con:', error);
        this.spinnerService.hideSavingSpinner();
      }
    });
  }
}
