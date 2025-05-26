import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActiveButtonComponent } from '../../../shared/components/active-button/active-button.component';
import { SearchBarComponent } from '../../../shared/components/search-bar/search-bar.component';
import { DmHangHoaThiTruongService } from '../services/api/dm-hang-hoa-thi-truong.service';
import { HHThiTruongDto, LoaiMatHangEnum } from '../models/dm-hh-thitruong/HHThiTruongDto';
import { HHThiTruongTreeNodeDto } from '../models/dm-hh-thitruong/HHThiTruongTreeNodeDto';
import { NgxSpinnerModule } from 'ngx-spinner';
import { TreeTableComponent } from '../../../shared/components/table/tree-table/tree-table.component';
import { TableColumn } from '../../../shared/models/table-column';
import { ThemmoiComponent } from './themmoi/themmoi.component';
import { SuaComponent } from './sua/sua.component';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { TreeCrudComponentBase } from '../../../shared/components/bases/tree-crud-component-base';

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
export class DmHangHoaThiTruongsComponent extends TreeCrudComponentBase<HHThiTruongDto, HHThiTruongTreeNodeDto> implements OnInit {
  private dmHangHoaThiTruongService = inject(DmHangHoaThiTruongService);
  
  // Cấu hình bảng
  columns: TableColumn<HHThiTruongDto>[] = [
    { field: 'ma', header: 'Mã', width: '20%' },
    { field: 'ten', header: 'Tên', width: '45%' },
    { field: 'tenDonViTinh', header: 'Đơn vị tính', width: '10%', formatter: (item) => item.tenDonViTinh || 'N/A' },
    { field: 'dacTinh', header: 'Đặc tính', width: '25%', formatter: (item) => item.dacTinh || 'N/A' }
  ];

  // Create a bound version of the loadChildrenForNode method to fix "this" context
  boundLoadChildrenForNode = (parentId: string, pageIndex: number, pageSize: number) => {
    return this.dmHangHoaThiTruongService.getChildrenByParent(parentId, pageIndex, pageSize);
  }

  constructor() {
    super();
  }
  
  ngOnInit(): void {
    this.loadParentItems();
  }

  /**
   * Implement abstract methods from parent classes
   */
  // From CrudComponentBase
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

  // From TreeCrudComponentBase
  override getParentIdFieldName(): string {
    return 'matHangChaId';
  }
  
  override hasChildrenForNode(node: HHThiTruongDto | HHThiTruongTreeNodeDto): boolean {
    return node.loaiMatHang === LoaiMatHangEnum.Nhom;
  }
  
  override loadChildrenForNode(parentId: string, pageIndex: number, pageSize: number): Observable<any> {
    return this.dmHangHoaThiTruongService.getChildrenByParent(parentId, pageIndex, pageSize);
  }
  
  override convertNodeToEntity(nodes: HHThiTruongTreeNodeDto[]): HHThiTruongDto[] {
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
  
  /**
   * Override getNodeChildren for specific structure
   */
  protected override getNodeChildren(node: any): HHThiTruongTreeNodeDto[] {
    return node.matHangCon || [];
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
   * Xử lý sự kiện từ nút thao tác (thêm, sửa, xóa, làm mới)
   */
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
        this.loadParentItems();
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
}
