import { Component, ViewChild, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActiveButtonComponent } from '../../../shared/components/active-button/active-button.component';
import { SearchBarComponent } from '../../../shared/components/search-bar/search-bar.component';
import { DmHangHoaThiTruongService } from '../services/api/dm-hang-hoa-thi-truong.service';
import { HHThiTruongDto, LoaiMatHangEnum } from '../models/dm-hh-thitruong/HHThiTruongDto';
import { ToastrService } from 'ngx-toastr';
import { HHThiTruongTreeNodeDto } from '../models/dm-hh-thitruong/HHThiTruongTreeNodeDto';
import { SpinnerService } from '../../../shared/services/spinner.service';
import { NgxSpinnerModule } from 'ngx-spinner';
import { TreeTableComponent } from '../../../shared/components/table/tree-table/tree-table.component';
import { TableColumn } from '../../../shared/models/table-column';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ThemmoiComponent } from './themmoi/themmoi.component';
import { SuaComponent } from './sua/sua.component';
import { map } from 'rxjs/operators';
import { DeleteConfirmationComponent } from '../../../shared/components/notifications/delete-confirmation/delete-confirmation.component';

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
export class DmHangHoaThiTruongsComponent implements OnInit {
  private toastr = inject(ToastrService);
  private spinnerService = inject(SpinnerService);
  private modalService = inject(NgbModal);
  private dmHangHoaThiTruongService: DmHangHoaThiTruongService = inject(DmHangHoaThiTruongService);

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

  ngOnInit(): void {
    this.loadParentCategories();
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
        this.toastr.error('Không thể tải danh sách mặt hàng', 'Lỗi');
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
        this.openAddModal();
        break;
      case 'edit':
        this.selectedItem ? this.openEditModal(this.selectedItem) : 
          this.toastr.warning('Vui lòng chọn một mặt hàng để chỉnh sửa', 'Cảnh báo');
        break;
      case 'delete':
        if (this.selectedItem) {
          this.openDeleteConfirmationModal(this.selectedItem);
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
   * Mở modal thêm mới mặt hàng
   */
  openAddModal(): void {
    const modalRef = this.modalService.open(ThemmoiComponent, {
      size: 'xl',
      backdrop: 'static',
      keyboard: false
    });

    modalRef.componentInstance.title = 'Thêm mới mặt hàng';
    modalRef.componentInstance.nhomHangHoaList = this.parentCategories;

    modalRef.result.then(
      (result) => {
        if (!result?.success) return;
        
        this.toastr.success('Thêm mới mặt hàng thành công', 'Thành công');

        if (result.parentId) {
          this.navigateToItemInTree(result.parentId, result.item);
        } else {
          this.loadParentCategories();
          this.selectAndScrollToItem(result.item);
        }
      },
      () => {}
    );
  }

  /**
   * Mở modal chỉnh sửa mặt hàng
   */
  openEditModal(item: HHThiTruongDto): void {
    this.spinnerService.showSavingSpinner();
    const originalParentId = item.matHangChaId;

    this.dmHangHoaThiTruongService.getById(item.id).subscribe({
      next: (fullItemData) => {
        const modalRef = this.modalService.open(SuaComponent, {
          size: 'xl',
          backdrop: 'static',
          keyboard: false
        });

        modalRef.componentInstance.editingItem = fullItemData;

        modalRef.result.then(
          (result) => {
            if (result !== 'saved') return;
            
            this.spinnerService.showTableSpinner();
            this.dmHangHoaThiTruongService.getById(item.id).subscribe({
              next: (updatedItem) => {
                this.updateNodeInTree(updatedItem, originalParentId);
                this.toastr.success('Cập nhật mặt hàng thành công', 'Thành công');
                this.spinnerService.hideTableSpinner();
              },
              error: (error) => {
                console.error('Lỗi khi tải lại thông tin mặt hàng sau cập nhật:', error);
                this.spinnerService.hideTableSpinner();
                this.toastr.error('Không thể tải lại thông tin mặt hàng', 'Lỗi');
              }
            });
          },
          () => {}
        );
        this.spinnerService.hideSavingSpinner();
      },
      error: (error) => {
        console.error('Lỗi khi tải dữ liệu chi tiết mặt hàng:', error);
        this.spinnerService.hideSavingSpinner();
      }
    });
  }

  /**
   * Mở modal xác nhận xóa mặt hàng
   */
  openDeleteConfirmationModal(item: HHThiTruongDto): void {
    // Xác định loại xác nhận dựa trên loại mặt hàng
    const isItemWithChildren = item.loaiMatHang === LoaiMatHangEnum.Nhom;
    
    // Tạo tiêu đề và thông báo phù hợp
    let title = 'Xác nhận xóa mặt hàng';
    let message = `Bạn có chắc chắn muốn xóa mặt hàng này không?`;
    
    // Nếu là nhóm mặt hàng, cảnh báo về xóa các mặt hàng con
    if (isItemWithChildren) {
      title = 'Xác nhận xóa nhóm mặt hàng';
      message = `Bạn có chắc chắn muốn xóa nhóm mặt hàng này không? Tất cả mặt hàng con bên trong nhóm này cũng sẽ bị xóa.`;
    }
    
    // Mở modal xác nhận
    const modalRef = this.modalService.open(DeleteConfirmationComponent, {
      backdrop: 'static',
      keyboard: false
    });
    
    modalRef.componentInstance.title = title;
    modalRef.componentInstance.message = message;
    
    // Xử lý kết quả của modal
    modalRef.result.then(
      (result) => {
        if (result) {
          this.deleteItem(item, isItemWithChildren);
        }
      },
      () => {} // Dismiss
    );
  }

  /**
   * Xóa mặt hàng dựa trên loại (mặt hàng đơn hoặc nhóm có con)
   */
  deleteItem(item: HHThiTruongDto, hasChildren: boolean): void {
    this.spinnerService.showSavingSpinner();
    
    if (hasChildren) {
      // Xóa nhóm mặt hàng và tất cả con bên trong
      this.dmHangHoaThiTruongService.deleteMultiple([item.id]).subscribe({
        next: (response) => {
          this.handleDeleteSuccess(item, response.data?.length ?? 0);
        },
        error: (error) => {
          this.handleDeleteError(error);
        }
      });
    } else {
      // Xóa mặt hàng đơn
      this.dmHangHoaThiTruongService.delete(item.id).subscribe({
        next: (response) => {
          this.handleDeleteSuccess(item);
        },
        error: (error) => {
          this.handleDeleteError(error);
        }
      });
    }
  }

  /**
   * Xử lý khi xóa thành công
   */
  private handleDeleteSuccess(deletedItem: HHThiTruongDto, totalDeleted: number = 1): void {
    this.spinnerService.hideSavingSpinner();
    
    // Xóa khỏi UI
    this.removeDeletedItemFromUI(deletedItem);
    
    // Hiển thị thông báo phù hợp
    if (totalDeleted > 1) {
      this.toastr.success(`Đã xóa nhóm mặt hàng và ${totalDeleted - 1} mặt hàng con`, 'Xóa thành công');
    } else {
      this.toastr.success('Đã xóa mặt hàng thành công', 'Xóa thành công');
    }
    
    // Reset selected item nếu đang chọn mặt hàng bị xóa
    if (this.selectedItem && this.selectedItem.id === deletedItem.id) {
      this.selectedItem = null;
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
