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

  // Cấu hình các cột hiển thị trong bảng với chiều rộng phù hợp
  columns: TableColumn<HHThiTruongDto>[] = [
    { field: 'ma', header: 'Mã', width: '20%' },
    { field: 'ten', header: 'Tên', width: '45%' },
    { field: 'tenDonViTinh', header: 'Đơn vị tính', width: '10%', formatter: (item) => item.tenDonViTinh || 'N/A' },
    { field: 'dacTinh', header: 'Đặc tính', width: '25%', formatter: (item) => item.dacTinh || 'N/A' }
  ];

  // Thêm ViewChild để truy cập TreeTableComponent
  @ViewChild(TreeTableComponent) treeTableComponent!: TreeTableComponent<HHThiTruongDto>;

  constructor(private dmHangHoaThiTruongService: DmHangHoaThiTruongService) { }

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
  onRowSelected(item: any): void {
    this.selectedItem = item as HHThiTruongDto;
  }

  /**
   * Xử lý sự kiện khi mở/đóng một node
   */
  onNodeToggled(event: { node: HHThiTruongDto, expanded: boolean }): void {
    if (event.expanded) {
      const treeTable = this.getTreeTableComponent();
      if (!treeTable) return;

      // Kiểm tra xem có dữ liệu con đã được tải chưa
      const nodeId = event.node.id;
      const hasLoadedChildren = treeTable.nodeChildrenMap.has(nodeId);

      // Nếu không có dữ liệu con hoặc đã bị xóa cache, tải lại
      if (!hasLoadedChildren) {
        this.loadChildrenForNode(nodeId, 1, treeTable.defaultPageSize)
          .subscribe({
            next: (result) => {
              treeTable.nodeChildrenMap.set(nodeId, result.data);
              treeTable.nodeLoadingMap.set(nodeId, false);

              // Thiết lập thông tin phân trang
              treeTable.nodePaginationMap.set(nodeId, {
                currentPage: 1,
                totalPages: Math.ceil(result.pagination.totalItems / treeTable.defaultPageSize),
                hasNextPage: result.pagination.hasNextPage,
                isLoadingMore: false
              });
            }
          });
      }
    }
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
        this.toastr.warning('Vui lòng chọn một mặt hàng để xóa', 'Cảnh báo');
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
    
    // Xử lý kết quả khi đóng modal
    modalRef.result.then(
      (result) => {
        // Nếu có dữ liệu trả về (không phải hủy), xem như thành công
        if (result) {
          this.toastr.success('Thêm mới mặt hàng thành công', 'Thành công');
          this.loadParentCategories(); // Tải lại dữ liệu
          
          // Cập nhật trạng thái chọn nếu có dữ liệu mới
          if (typeof result === 'object' && result.id) {
            this.selectedItem = result;
          }
        }
      },
      () => {
      }
    );
  }

  /**
   * Mở modal chỉnh sửa mặt hàng
   */
  openEditModal(item: HHThiTruongDto): void {
    this.spinnerService.showSavingSpinner();

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
            if (result === 'saved') {
              this.toastr.success('Cập nhật mặt hàng thành công', 'Thành công');

            }
          },
          () => { }
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
   * Lấy tham chiếu đến TreeTableComponent
   * @returns Reference đến TreeTableComponent hoặc null
   */
  private getTreeTableComponent(): any {
    return this.treeTableComponent;
  }

}
