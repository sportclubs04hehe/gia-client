import { Component, ViewChild, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActiveButtonComponent } from '../../../shared/components/active-button/active-button.component';
import { SearchBarComponent } from '../../../shared/components/search-bar/search-bar.component';
import { DmHangHoaThiTruongService } from '../services/api/dm-hang-hoa-thi-truong.service';
import { HHThiTruongDto, LoaiMatHangEnum } from '../models/dm-hh-thitruong/HHThiTruongDto';
import { HHThiTruongTreeNodeDto } from '../models/dm-hh-thitruong/HHThiTruongTreeNodeDto';
import { SpinnerService } from '../../../shared/services/spinner.service';
import { NgxSpinnerModule } from 'ngx-spinner';
import { TreeTableComponent } from '../../../shared/components/table/tree-table/tree-table.component';
import { TableColumn } from '../../../shared/models/table-column';
import { ThemmoiComponent } from './themmoi/themmoi.component';
import { SuaComponent } from './sua/sua.component';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { CrudComponentBase } from '../../../shared/components/bases/crud-component-base';

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
export class DmHangHoaThiTruongsComponent extends CrudComponentBase<HHThiTruongDto> implements OnInit {
  private dmHangHoaThiTruongService = inject(DmHangHoaThiTruongService);
  
  // Trạng thái và dữ liệu
  selectedItem: HHThiTruongDto | null = null;
  parentCategories: HHThiTruongDto[] = [];

  // Cấu hình bảng
  columns: TableColumn<HHThiTruongDto>[] = [
    { field: 'ma', header: 'Mã', width: '20%' },
    { field: 'ten', header: 'Tên', width: '45%' },
    { field: 'tenDonViTinh', header: 'Đơn vị tính', width: '10%', formatter: (item) => item.tenDonViTinh || 'N/A' },
    { field: 'dacTinh', header: 'Đặc tính', width: '25%', formatter: (item) => item.dacTinh || 'N/A' }
  ];

  @ViewChild(TreeTableComponent) treeTableComponent!: TreeTableComponent<HHThiTruongDto>;

  constructor() {
    super();
  }
  
  ngOnInit(): void {
    this.loadParentCategories();
  }

  /**
   * Implement abstract methods from CrudComponentBase
   */
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
      this.loadParentCategories();
      this.selectAndScrollToItem(result.item);
    }
  }
  
  override handleItemUpdated(updatedItem: HHThiTruongDto, originalData?: any): void {
    const originalParentId = originalData?.matHangChaId;
    this.updateNodeInTree(updatedItem, originalParentId);
  }
  
  override handleItemDeleted(item: HHThiTruongDto, totalDeleted: number = 1): void {
    this.removeDeletedItemFromUI(item);
    
    // Reset selected item if it was the deleted one
    if (this.selectedItem?.id === item.id) {
      this.selectedItem = null;
    }
  }

  /**
   * Override base class method for custom delete handling
   */
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

  /**
   * Tải danh sách mặt hàng cha (cấp cao nhất)
   */
  loadParentCategories(): void {
    this.spinnerService.showTableSpinner();
    this.dmHangHoaThiTruongService.getAllParentCategories().subscribe({
      next: (data) => {
        this.parentCategories = data;
        this.spinnerService.hideTableSpinner();
      },
      error: (error) => {
        console.error('Lỗi khi tải danh sách mặt hàng cha:', error);
        this.spinnerService.hideTableSpinner();
      }
    });
  }

  /**
   * Kiểm tra node có con
   */
  hasChildrenForNode = (node: HHThiTruongDto | HHThiTruongTreeNodeDto): boolean => {
    return node.loaiMatHang === LoaiMatHangEnum.Nhom;
  }

  /**
   * Tải dữ liệu con cho một node
   */
  loadChildrenForNode = (parentId: string, pageIndex: number, pageSize: number) => {
    return this.dmHangHoaThiTruongService.getChildrenByParent(parentId, pageIndex, pageSize)
      .pipe(map(result => ({
        data: this.convertToHHThiTruongDto(result.data),
        pagination: result.pagination
      })));
  }

  /**
   * Xử lý sự kiện khi chọn một hàng
   */
  onRowSelected(item: any): void {
    this.selectedItem = item as HHThiTruongDto;
  }

  /**
   * Xử lý sự kiện khi mở/đóng một node
   */
  onNodeToggled(event: { node: HHThiTruongDto, expanded: boolean }): void {
    if (!event.expanded) return;

    const treeTable = this.treeTableComponent;
    if (!treeTable) return;

    const nodeId = event.node.id;
    if (treeTable.nodeChildrenMap.has(nodeId)) return;

    this.loadChildrenForNode(nodeId, 1, treeTable.defaultPageSize).subscribe({
      next: (result) => {
        treeTable.nodeChildrenMap.set(nodeId, result.data);
        treeTable.nodeLoadingMap.set(nodeId, false);
        treeTable.nodePaginationMap.set(nodeId, {
          currentPage: 1,
          totalPages: Math.ceil(result.pagination.totalItems / treeTable.defaultPageSize),
          hasNextPage: result.pagination.hasNextPage,
          isLoadingMore: false
        });
      }
    });
  }

  /**
   * Xử lý sự kiện từ nút thao tác (thêm, sửa, xóa, làm mới)
   */
  onButtonAction(action: string): void {
    switch (action) {
      case 'add':
        // Use base class method from CrudComponentBase
        super.openAddModal(ThemmoiComponent, {
          size: 'xl',
          data: { nhomHangHoaList: this.parentCategories }
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
          const isItemWithChildren = this.selectedItem.loaiMatHang === LoaiMatHangEnum.Nhom;
          // Use base class method from CrudComponentBase
          super.openDeleteConfirmationModal(this.selectedItem, {
            isGroup: isItemWithChildren,
            groupItemName: 'nhóm mặt hàng'
          });
        } else {
          this.toastr.warning('Vui lòng chọn một mặt hàng để xóa', 'Cảnh báo');
        }
        break;
      case 'refresh':
        this.loadParentCategories();
        break;
    }
  }

  /**
   * Xử lý khi xóa gặp lỗi
   */
  private handleDeleteError(error: any): void {
    this.spinnerService.hideSavingSpinner();
    console.error('Lỗi khi xóa mặt hàng:', error);
    
    // Hiển thị thông báo lỗi
    if (error.error?.message) {
      this.toastr.error(error.error.message, 'Lỗi');
    } else {
      this.toastr.error('Không thể xóa mặt hàng. Vui lòng thử lại sau.', 'Lỗi');
    }
  }

  /**
   * Xóa mặt hàng khỏi UI
   */
  private removeDeletedItemFromUI(deletedItem: HHThiTruongDto): void {
    // Implementation unchanged
    const treeTable = this.treeTableComponent;
    
    // Xóa khỏi danh sách gốc nếu là mặt hàng ở cấp cao nhất
    if (!deletedItem.matHangChaId) {
      this.parentCategories = this.parentCategories.filter(item => item.id !== deletedItem.id);
    }
    
    // Xóa khỏi nodeChildrenMap trong TreeTable
    if (treeTable && deletedItem.matHangChaId) {
      const parentChildren = treeTable.nodeChildrenMap.get(deletedItem.matHangChaId);
      if (parentChildren) {
        treeTable.nodeChildrenMap.set(
          deletedItem.matHangChaId,
          parentChildren.filter(item => item.id !== deletedItem.id)
        );
        
        // Force update UI
        if (treeTable.detectChanges) {
          setTimeout(() => treeTable.detectChanges());
        }
      }
    }
  }

  // Rest of the tree-specific methods unchanged
  /**
   * Di chuyển đến mặt hàng trong cây và hiển thị
   */
  navigateToItemInTree(parentId: string, item: HHThiTruongDto): void {
    this.spinnerService.showTableSpinner();
    this.dmHangHoaThiTruongService.getFullPathWithChildren(parentId, item.id).subscribe({
      next: (pathTree) => {
        if (!pathTree?.length) {
          this.spinnerService.hideTableSpinner();
          return;
        }

        // Cập nhật root data nếu cần
        pathTree.forEach(rootNode => {
          const existingRoot = this.parentCategories.find(x => x.id === rootNode.id);
          if (!existingRoot) {
            this.parentCategories.push(this.convertToHHThiTruongDto([rootNode])[0]);
          }
        });

        // Xử lý cây đường dẫn
        this.processTreePath(pathTree);
        
        // Chọn mặt hàng và scroll đến
        this.selectAndScrollToItem(item);
        this.spinnerService.hideTableSpinner();
      },
      error: (error) => {
        console.error('Lỗi khi tải đường dẫn:', error);
        this.spinnerService.hideTableSpinner();
        this.loadParentCategories();
      }
    });
  }

  /**
   * Cập nhật node trong cây (khi thay đổi thông tin hoặc di chuyển)
   */
  private updateNodeInTree(updatedItem: HHThiTruongDto, originalParentId?: string): void {
    const parentChanged = originalParentId !== updatedItem.matHangChaId;

    if (parentChanged) {
      this.relocateNodeInTree(updatedItem, originalParentId);
    } else {
      this.updateNodeInPlace(updatedItem);
    }

    // Cập nhật selected item
    if (this.selectedItem?.id === updatedItem.id) {
      this.selectedItem = {...updatedItem};
    }
    
    this.scrollToSelectedItem(updatedItem.id);
  }

  /**
   * Cập nhật thông tin node mà không thay đổi vị trí
   */
  private updateNodeInPlace(updatedItem: HHThiTruongDto): void {
    const treeTable = this.treeTableComponent;
    let updated = false;

    // Cập nhật trong danh sách gốc
    const rootIndex = this.parentCategories.findIndex(x => x.id === updatedItem.id);
    if (rootIndex >= 0) {
      this.parentCategories[rootIndex] = {...updatedItem};
      this.parentCategories = [...this.parentCategories];
      updated = true;
    }

    // Cập nhật trong node children
    if (treeTable) {
      treeTable.nodeChildrenMap.forEach((children, parentId) => {
        const childIndex = children.findIndex(x => x.id === updatedItem.id);
        if (childIndex >= 0) {
          const updatedChildren = [...children];
          updatedChildren[childIndex] = {...updatedItem};
          treeTable.nodeChildrenMap.set(parentId, updatedChildren);
          updated = true;
        }
      });

      if (updated && treeTable.detectChanges) {
        setTimeout(() => treeTable.detectChanges());
      }
    }
  }

  /**
   * Di chuyển node sang vị trí mới trong cây
   */
  private relocateNodeInTree(updatedItem: HHThiTruongDto, originalParentId?: string): void {
    const treeTable = this.treeTableComponent;
    if (!treeTable) return;

    // 1. Xóa khỏi vị trí cũ
    if (originalParentId) {
      const oldParentChildren = treeTable.nodeChildrenMap.get(originalParentId);
      if (oldParentChildren) {
        treeTable.nodeChildrenMap.set(originalParentId, 
          oldParentChildren.filter(x => x.id !== updatedItem.id));
      }
    } else {
      this.parentCategories = this.parentCategories.filter(x => x.id !== updatedItem.id);
    }

    // 2. Thêm vào vị trí mới
    if (updatedItem.matHangChaId) {
      if (treeTable.nodeChildrenMap.has(updatedItem.matHangChaId)) {
        const newParentChildren = treeTable.nodeChildrenMap.get(updatedItem.matHangChaId) || [];
        if (!newParentChildren.some(x => x.id === updatedItem.id)) {
          treeTable.nodeChildrenMap.set(
            updatedItem.matHangChaId,
            [...newParentChildren, updatedItem]
          );
        }
      }
      // Mở đường dẫn đến node mới
      this.navigateToItemInTree(updatedItem.matHangChaId, updatedItem);
    } else {
      if (!this.parentCategories.some(x => x.id === updatedItem.id)) {
        this.parentCategories = [...this.parentCategories, updatedItem];
      }
    }

    // Cập nhật UI
    if (treeTable.detectChanges) {
      setTimeout(() => treeTable.detectChanges());
    }
  }

  /**
   * Xử lý cây đường dẫn và mở rộng các node
   */
  private processTreePath(nodes: HHThiTruongTreeNodeDto[]): void {
    const treeTable = this.treeTableComponent;
    if (!treeTable) return;

    for (const node of nodes) {
      if (!node.matHangCon?.length) continue;
      
      // Mở rộng node và lưu dữ liệu con
      treeTable.expandedRows.set(node.id, true);
      
      const convertedData = this.convertToHHThiTruongDto(node.matHangCon);
      treeTable.nodeChildrenMap.set(node.id, convertedData);
      treeTable.nodeLoadingMap.set(node.id, false);
      
      treeTable.nodePaginationMap.set(node.id, {
        currentPage: 1,
        totalPages: Math.ceil(node.matHangCon.length / treeTable.defaultPageSize),
        hasNextPage: false,
        isLoadingMore: false
      });
      
      // Xử lý con đệ quy
      this.processTreePath(node.matHangCon);
    }
  }

  /**
   * Chọn mặt hàng và cuộn đến vị trí của nó
   */
  private selectAndScrollToItem(item?: HHThiTruongDto): void {
    if (!item?.id) return;
    
    setTimeout(() => {
      this.selectedItem = item;
      if (this.treeTableComponent) {
        this.treeTableComponent.selectedRowId = item.id;
      }
      this.scrollToSelectedItem(item.id);
    }, 200);
  }

  /**
   * Cuộn đến phần tử được chọn trên giao diện
   */
  private scrollToSelectedItem(itemId: string): void {
    try {
      setTimeout(() => {
        const element = document.querySelector(`[data-id="${itemId}"]`);
        if (!element) return;
        
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.classList.add('highlight-animation');

        setTimeout(() => {
          element.classList.remove('highlight-animation');
        }, 2000);
      }, 100);
    } catch (error) {
      console.error('Lỗi khi cuộn đến phần tử:', error);
    }
  }

  /**
   * Chuyển đổi từ HHThiTruongTreeNodeDto[] sang HHThiTruongDto[]
   */
  private convertToHHThiTruongDto(treeNodes: HHThiTruongTreeNodeDto[]): HHThiTruongDto[] {
    return treeNodes.map(node => ({
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
}
