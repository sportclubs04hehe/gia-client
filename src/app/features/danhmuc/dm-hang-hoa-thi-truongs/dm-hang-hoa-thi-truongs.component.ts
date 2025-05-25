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
    return this.dmHangHoaThiTruongService.getChildrenByParent(parentId, pageIndex, pageSize)
      .pipe(
        map(result => {
          // Chuyển đổi dữ liệu từ HHThiTruongTreeNodeDto sang HHThiTruongDto
          const convertedData = this.convertToHHThiTruongDto(result.data);

          return {
            data: convertedData,
            pagination: result.pagination
          };
        })
      );
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
              const convertedData = this.convertToHHThiTruongDto(result.data);
              treeTable.nodeChildrenMap.set(nodeId, convertedData);
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
    modalRef.componentInstance.nhomHangHoaList = this.parentCategories;

    // Xử lý kết quả khi đóng modal
    modalRef.result.then(
      (result) => {
        // Chỉ tiếp tục khi có kết quả thành công
        if (result && result.success) {
          this.toastr.success('Thêm mới mặt hàng thành công', 'Thành công');

          // Kiểm tra nếu là mặt hàng con
          if (result.parentId) {
            console.log('Mở rộng node cha và chọn mặt hàng mới:', result.parentId, result.item);

            // Mở rộng nhóm cha và hiển thị mặt hàng con vừa thêm
            this.expandAndSelectNewItem(result.parentId, result.item);
          } else {
            console.log('Tải lại danh sách gốc và chọn mặt hàng mới:', result.item);
            // Nếu là mặt hàng cấp cao nhất, tải lại toàn bộ danh sách
            this.loadParentCategories();

            // Sau khi tải lại, chọn mặt hàng vừa thêm
            if (result.item && result.item.id) {
              setTimeout(() => {
                this.selectedItem = result.item;
                if (this.treeTableComponent) {
                  this.treeTableComponent.selectedRowId = result.item.id;
                }
                this.scrollToSelectedItem(result.item.id);
              }, 200);
            }
          }
        }
      },
      () => {
        // Modal bị đóng không có kết quả
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
  * Xử lý kết quả trả về từ API đường dẫn tối ưu
  */
  private handleOptimizedPathResponse(pathTree: HHThiTruongTreeNodeDto[], newItem: HHThiTruongDto): void {
    if (!pathTree || pathTree.length === 0) {
      this.spinnerService.hideTableSpinner();
      this.toastr.warning('Không tìm thấy đường dẫn đến mặt hàng', 'Cảnh báo');
      return;
    }

    // Cập nhật dữ liệu gốc nếu cần thiết
    this.updateRootDataIfNeeded(pathTree);

    // Xử lý từng node trong đường dẫn và thiết lập trạng thái mở rộng
    this.processOptimizedPathTree(pathTree, newItem);

    this.spinnerService.hideTableSpinner();

    // Hiển thị thông báo thành công
    this.toastr.success('Hiển thị tất cả mặt hàng cùng cấp', 'Thành công');
  }

  /**
   * Xử lý cây đường dẫn đã tối ưu và thiết lập trạng thái mở rộng
   */
  private processOptimizedPathTree(pathTree: HHThiTruongTreeNodeDto[], newItem: HHThiTruongDto): void {
    // Đảm bảo có TreeTable component
    if (!this.treeTableComponent) return;

    // Duyệt qua cây và thiết lập trạng thái
    this.processNodeAndChildren(pathTree);

    // Chọn mặt hàng con vừa thêm mới
    this.selectedItem = newItem;
    this.treeTableComponent.selectedRowId = newItem.id;

    // Cuộn đến phần tử được chọn
    setTimeout(() => {
      this.scrollToSelectedItem(newItem.id);
    }, 300);
  }

  /**
   * Mở rộng toàn bộ đường dẫn đến mặt hàng cha và chọn mặt hàng con vừa thêm
   */
  expandAndSelectNewItem(parentId: string, newItem: HHThiTruongDto): void {
    this.spinnerService.showTableSpinner();

    // Sử dụng API tối ưu để tải toàn bộ đường dẫn và các mặt hàng anh em
    this.dmHangHoaThiTruongService.getFullPathWithChildren(parentId, newItem.id).subscribe({
      next: (pathTree) => this.handleOptimizedPathResponse(pathTree, newItem),
      error: (error) => {
        console.error('Lỗi khi tải đường dẫn tối ưu:', error);
        this.spinnerService.hideTableSpinner();
        this.toastr.error('Không thể mở rộng đường dẫn đến mặt hàng mới', 'Lỗi');

        // Tải lại toàn bộ danh sách nếu gặp lỗi
        this.loadParentCategories();
      }
    });
  }

  /**
   * Cập nhật dữ liệu gốc nếu cần từ kết quả API
   */
  private updateRootDataIfNeeded(pathTree: HHThiTruongTreeNodeDto[]): void {
    // Đảm bảo các node gốc trong kết quả có trong this.parentCategories
    pathTree.forEach(rootNode => {
      const existingRoot = this.parentCategories.find(item => item.id === rootNode.id);
      if (!existingRoot) {
        // Chuyển đổi từ TreeNodeDto sang Dto
        const convertedRoot = this.convertToHHThiTruongDto([rootNode])[0];
        this.parentCategories.push(convertedRoot);
      }
    });
  }

  /**
   * Chuyển đổi từ HHThiTruongTreeNodeDto[] sang HHThiTruongDto[]
   * @param treeNodes Danh sách node cây cần chuyển đổi
   * @returns Danh sách HHThiTruongDto tương ứng
   */
  private convertToHHThiTruongDto(treeNodes: HHThiTruongTreeNodeDto[]): HHThiTruongDto[] {
    return treeNodes.map(node => {
      return {
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
      } as HHThiTruongDto;
    });
  }

  /**
   * Cuộn đến phần tử được chọn trên giao diện
   * @param itemId ID của mặt hàng cần cuộn đến
   */
  private scrollToSelectedItem(itemId: string): void {
    try {
      setTimeout(() => {
        const element = document.querySelector(`[data-id="${itemId}"]`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('highlight-animation');

          // Xóa class animation sau khi hoàn thành
          setTimeout(() => {
            element.classList.remove('highlight-animation');
          }, 2000);
        }
      }, 100);
    } catch (error) {
      console.error('Lỗi khi cuộn đến phần tử:', error);
    }
  }

  /**
   * Lấy tham chiếu đến TreeTableComponent
   * @returns Reference đến TreeTableComponent
   */
  private getTreeTableComponent(): TreeTableComponent<HHThiTruongDto> {
    return this.treeTableComponent;
  }

  /**
   * Xử lý đệ quy từng node trong cây và thiết lập trạng thái mở rộng
   * @param nodes Danh sách các node cần xử lý
   */
  private processNodeAndChildren(nodes: HHThiTruongTreeNodeDto[]): void {
    // Lấy tham chiếu tới TreeTable
    const treeTable = this.treeTableComponent;
    if (!treeTable) return;

    // Duyệt qua từng node trong danh sách
    for (const node of nodes) {
      // Kiểm tra node có node con không
      if (node.matHangCon && node.matHangCon.length > 0) {
        // Thiết lập trạng thái mở rộng
        treeTable.expandedRows.set(node.id, true);

        // Chuyển đổi dữ liệu từ TreeNodeDto sang Dto
        const convertedData = this.convertToHHThiTruongDto(node.matHangCon);

        // Cập nhật dữ liệu trong TreeTable
        treeTable.nodeChildrenMap.set(node.id, convertedData);
        treeTable.nodeLoadingMap.set(node.id, false);

        // Thiết lập thông tin phân trang nếu cần
        treeTable.nodePaginationMap.set(node.id, {
          currentPage: 1,
          totalPages: Math.ceil(node.matHangCon.length / treeTable.defaultPageSize),
          hasNextPage: false, // Không có trang tiếp theo vì đã tải tất cả
          isLoadingMore: false
        });

        // Đệ quy xử lý các node con
        this.processNodeAndChildren(node.matHangCon);
      }
    }
  }
}
