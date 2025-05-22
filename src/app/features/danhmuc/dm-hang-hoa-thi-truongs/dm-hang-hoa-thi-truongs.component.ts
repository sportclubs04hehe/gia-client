import { Component, inject, OnInit } from '@angular/core';
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
  private modalService = inject(NgbModal); // Tiêm NgbModal service
  
  // Trạng thái lựa chọn
  selectedItem: HHThiTruongDto | null = null;

  // Dữ liệu gốc cho TreeTable
  parentCategories: HHThiTruongDto[] = [];
  
  // Cấu hình các cột hiển thị trong bảng
  columns: TableColumn<HHThiTruongDto>[] = [
    { field: 'ma', header: 'Mã', width: '25%' },
    { field: 'ten', header: 'Tên', width: '35%' },
    { field: 'tenDonViTinh', header: 'Đơn vị tính', width: '20%', formatter: (item) => item.tenDonViTinh || 'N/A' },
    { field: 'dacTinh', header: 'Đặc tính', width: '20%', formatter: (item) => item.dacTinh || 'N/A' }
  ];
  
  constructor(private dmHangHoaThiTruongService: DmHangHoaThiTruongService) {}
  
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
   * Hàm kiểm tra node có con hoặc có thể có con không
   */
  hasChildrenForNode = (node: HHThiTruongDto | HHThiTruongTreeNodeDto): boolean => {
    return node.loaiMatHang === LoaiMatHangEnum.Nhom;
  }

  /**
   * Hàm tải dữ liệu con cho một node
   */
  loadChildrenForNode = (parentId: string, pageIndex: number, pageSize: number) => {
    return this.dmHangHoaThiTruongService.getChildrenByParent(parentId, pageIndex, pageSize);
  }
  
  /**
   * Xử lý sự kiện khi chọn một hàng
   */
  onRowSelected(item: HHThiTruongDto): void {
    this.selectedItem = item;
  }
  
  /**
   * Xử lý sự kiện khi mở/đóng một node
   */
  onNodeToggled(event: {node: HHThiTruongDto, expanded: boolean}): void {
    console.log(`${event.expanded ? 'Mở rộng' : 'Thu gọn'} mặt hàng: ${event.node.ma}`);
  }

  /**
   * Xử lý sự kiện từ nút thao tác (thêm, sửa, xóa)
   */
  onButtonAction(action: string): void {
    switch (action) {
      case 'add':
        this.openAddModal();
        break;
      case 'edit':
        if (this.selectedItem) {
          this.openEditModal(this.selectedItem);
        } else {
          this.toastr.warning('Vui lòng chọn một mặt hàng để chỉnh sửa', 'Cảnh báo');
        }
        break;
      case 'delete':
        if (this.selectedItem) {
          this.confirmDelete(this.selectedItem);
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
    
    // Truyền dữ liệu vào modal
    modalRef.componentInstance.title = 'Thêm mới mặt hàng';
    modalRef.componentInstance.parentItem = this.selectedItem; // Truyền mặt hàng cha (nếu có)
    
    // Xử lý kết quả khi đóng modal
    modalRef.result.then(
      (result) => {
        if (result === 'saved') {
          this.toastr.success('Thêm mới mặt hàng thành công', 'Thành công');
          this.loadParentCategories(); // Tải lại dữ liệu
        }
      },
      (reason) => {
      }
    );
  }

  /**
   * Mở modal chỉnh sửa mặt hàng
   */
  openEditModal(item: HHThiTruongDto): void {
    const modalRef = this.modalService.open(ThemmoiComponent, { 
      size: 'lg',
      backdrop: 'static',
      keyboard: false
    });
    
    // Truyền dữ liệu vào modal
    modalRef.componentInstance.title = 'Chỉnh sửa mặt hàng';
    modalRef.componentInstance.isEditMode = true;
    modalRef.componentInstance.editItem = item;
    
    // Xử lý kết quả khi đóng modal
    modalRef.result.then(
      (result) => {
        if (result === 'saved') {
          this.toastr.success('Cập nhật mặt hàng thành công', 'Thành công');
          this.loadParentCategories(); // Tải lại dữ liệu
        }
      },
      (reason) => {
      }
    );
  }

  /**
   * Xác nhận xóa mặt hàng
   */
  confirmDelete(item: HHThiTruongDto): void {
    // Hiển thị hộp thoại xác nhận (có thể dùng modal hoặc confirm)
    if (confirm(`Bạn có chắc chắn muốn xóa mặt hàng "${item.ten}" không?`)) {
      this.deleteItem(item.id);
    }
  }

  /**
   * Thực hiện xóa mặt hàng
   */
  deleteItem(id: string): void {
    this.spinnerService.showTableSpinner();
    
    this.dmHangHoaThiTruongService.delete(id).subscribe({
      next: (response) => {
        this.toastr.success('Xóa mặt hàng thành công', 'Thành công');
        this.selectedItem = null;
        this.loadParentCategories(); // Tải lại dữ liệu
        this.spinnerService.hideTableSpinner();
      },
      error: (error) => {
        console.error('Lỗi khi xóa mặt hàng:', error);
        this.toastr.error('Không thể xóa mặt hàng', 'Lỗi');
        this.spinnerService.hideTableSpinner();
      }
    });
  }
}
