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

@Component({
  selector: 'app-dm-hang-hoa-thi-truongs',
  standalone: true,
  imports: [
    CommonModule,
    ActiveButtonComponent,
    SearchBarComponent,
    NgxSpinnerModule,
    TreeTableComponent // Import TreeTableComponent
  ],
  templateUrl: './dm-hang-hoa-thi-truongs.component.html',
  styleUrl: './dm-hang-hoa-thi-truongs.component.css'
})
export class DmHangHoaThiTruongsComponent implements OnInit {
  private toastr = inject(ToastrService);
  private spinnerService = inject(SpinnerService);

  // Dữ liệu gốc cho TreeTable
  parentCategories: HHThiTruongDto[] = [];
  
  // Cấu hình các cột hiển thị trong bảng
  columns: TableColumn<HHThiTruongDto>[] = [
    { 
      field: 'ma',
      header: 'Mã',
      width: '25%'
    },
    { 
      field: 'ten',
      header: 'Tên',
      width: '35%'
    },
    { 
      field: 'tenDonViTinh',
      header: 'Đơn vị tính',
      width: '20%',
      formatter: (item) => item.tenDonViTinh || 'N/A'
    },
    { 
      field: 'dacTinh',
      header: 'Đặc tính',
      width: '20%',
      formatter: (item) => item.dacTinh || 'N/A'
    }
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
   * Truyền cho TreeTableComponent
   */
  hasChildrenForNode = (node: HHThiTruongDto | HHThiTruongTreeNodeDto): boolean => {
    // Nếu là nhóm mặt hàng (loại 0) thì có thể có con
    return node.loaiMatHang === LoaiMatHangEnum.Nhom;
  }

  /**
   * Hàm tải dữ liệu con cho một node
   * Truyền cho TreeTableComponent
   */
  loadChildrenForNode = (parentId: string, pageIndex: number, pageSize: number) => {
    return this.dmHangHoaThiTruongService.getChildrenByParent(parentId, pageIndex, pageSize);
  }
  
  /**
   * Xử lý sự kiện khi chọn một hàng
   */
  onRowSelected(item: HHThiTruongDto | HHThiTruongTreeNodeDto): void {
    // Xử lý logic khi chọn hàng (ví dụ: hiển thị chi tiết, mở form sửa, v.v.)
  }
  
  /**
   * Xử lý sự kiện khi mở/đóng một node
   */
  onNodeToggled(event: {node: HHThiTruongDto | HHThiTruongTreeNodeDto, expanded: boolean}): void {
    // Xử lý logic khi mở/đóng node (ví dụ: lưu trạng thái, v.v.)
  }
}
