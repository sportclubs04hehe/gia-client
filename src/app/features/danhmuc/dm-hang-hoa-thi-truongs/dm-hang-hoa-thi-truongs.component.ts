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

      const nodeId = event.node.id;
      const hasLoadedChildren = treeTable.nodeChildrenMap.has(nodeId);
      if (!hasLoadedChildren) {
        this.loadChildrenForNode(nodeId, 1, treeTable.defaultPageSize)
          .subscribe({
            next: (result) => {
              const convertedData = this.convertToHHThiTruongDto(result.data);
              treeTable.nodeChildrenMap.set(nodeId, convertedData);
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

    modalRef.componentInstance.title = 'Thêm mới mặt hàng';
    modalRef.componentInstance.nhomHangHoaList = this.parentCategories;

    modalRef.result.then(
      (result) => {
        if (result && result.success) {
          this.toastr.success('Thêm mới mặt hàng thành công', 'Thành công');

          if (result.parentId) {
            this.expandAndSelectNewItem(result.parentId, result.item);
          } else {
            this.loadParentCategories();
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

    // Lưu lại thông tin ban đầu của mặt hàng trước khi sửa
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
            if (result === 'saved') {
              this.spinnerService.showTableSpinner();
              this.dmHangHoaThiTruongService.getById(item.id).subscribe({
                next: (updatedItem) => {
                  // Xử lý cập nhật UI và di chuyển node nếu parent thay đổi
                  this.updateItemInDataStructures(updatedItem, originalParentId);
                  this.toastr.success('Cập nhật mặt hàng thành công', 'Thành công');
                  this.spinnerService.hideTableSpinner();
                },
                error: (error) => {
                  console.error('Lỗi khi tải lại thông tin mặt hàng sau cập nhật:', error);
                  this.spinnerService.hideTableSpinner();
                  this.toastr.error('Không thể tải lại thông tin mặt hàng', 'Lỗi');
                }
              });
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
      return;
    }

    this.updateRootDataIfNeeded(pathTree);
    this.processOptimizedPathTree(pathTree, newItem);

    this.spinnerService.hideTableSpinner();
  }

  /**
   * Xử lý cây đường dẫn đã tối ưu và thiết lập trạng thái mở rộng
   */
  private processOptimizedPathTree(pathTree: HHThiTruongTreeNodeDto[], newItem: HHThiTruongDto): void {
    if (!this.treeTableComponent) return;
    this.processNodeAndChildren(pathTree);
    this.selectedItem = newItem;
    this.treeTableComponent.selectedRowId = newItem.id;

    setTimeout(() => {
      this.scrollToSelectedItem(newItem.id);
    }, 300);
  }

  /**
   * Mở rộng toàn bộ đường dẫn đến mặt hàng cha và chọn mặt hàng con vừa thêm
   */
  expandAndSelectNewItem(parentId: string, newItem: HHThiTruongDto): void {
    this.spinnerService.showTableSpinner();

    this.dmHangHoaThiTruongService.getFullPathWithChildren(parentId, newItem.id).subscribe({
      next: (pathTree) => this.handleOptimizedPathResponse(pathTree, newItem),
      error: (error) => {
        console.error('Lỗi khi tải đường dẫn tối ưu:', error);
        this.spinnerService.hideTableSpinner();

        this.loadParentCategories();
      }
    });
  }

  /**
   * Cập nhật dữ liệu gốc nếu cần từ kết quả API
   */
  private updateRootDataIfNeeded(pathTree: HHThiTruongTreeNodeDto[]): void {
    pathTree.forEach(rootNode => {
      const existingRoot = this.parentCategories.find(item => item.id === rootNode.id);
      if (!existingRoot) {
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
    const treeTable = this.treeTableComponent;
    if (!treeTable) return;

    for (const node of nodes) {
      if (node.matHangCon && node.matHangCon.length > 0) {
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

        this.processNodeAndChildren(node.matHangCon);
      }
    }
  }

  /**
   * Cập nhật mặt hàng trong tất cả cấu trúc dữ liệu liên quan và di chuyển node nếu parent thay đổi
   * @param updatedItem Mặt hàng đã cập nhật
   * @param originalParentId ID của nhóm cha ban đầu
   */
  private updateItemInDataStructures(updatedItem: HHThiTruongDto, originalParentId?: string): void {
    // Kiểm tra xem parent có thay đổi không
    const parentChanged = originalParentId !== updatedItem.matHangChaId;

    if (parentChanged) {
      // Xử lý trường hợp di chuyển node giữa các nhóm
      this.handleNodeRelocation(updatedItem, originalParentId);
    } else {
      // Cập nhật thông tin mặt hàng tại vị trí hiện tại
      this.updateItemInPlace(updatedItem);
    }

    // Luôn cập nhật selectedItem nếu đang được chọn
    if (this.selectedItem && this.selectedItem.id === updatedItem.id) {
      this.selectedItem = { ...updatedItem };
    }

    // Cuộn đến phần tử được cập nhật
    setTimeout(() => {
      this.scrollToSelectedItem(updatedItem.id);
    }, 300);
  }

  /**
   * Cập nhật thông tin mặt hàng tại vị trí hiện tại trong cây
   */
  private updateItemInPlace(updatedItem: HHThiTruongDto): void {
    // 1. Cập nhật trong danh sách gốc nếu là mặt hàng gốc
    const rootIndex = this.parentCategories.findIndex(x => x.id === updatedItem.id);
    if (rootIndex >= 0) {
      this.parentCategories[rootIndex] = { ...updatedItem };
      this.parentCategories = [...this.parentCategories];
    }

    // 2. Cập nhật trong các TreeTable nodeChildrenMap nếu là mặt hàng con
    if (this.treeTableComponent) {
      let updated = false;
      this.treeTableComponent.nodeChildrenMap.forEach((children, parentId) => {
        const childIndex = children.findIndex(x => x.id === updatedItem.id);
        if (childIndex >= 0) {
          const updatedChildren = [...children];
          updatedChildren[childIndex] = { ...updatedItem };
          this.treeTableComponent.nodeChildrenMap.set(parentId, updatedChildren);
          updated = true;
        }
      });

      if (updated && this.treeTableComponent.detectChanges) {
        setTimeout(() => this.treeTableComponent.detectChanges());
      }
    }
  }

  /**
   * Xử lý di chuyển node khi parent thay đổi
   */
  private handleNodeRelocation(updatedItem: HHThiTruongDto, originalParentId?: string): void {
    const treeTable = this.treeTableComponent;
    if (!treeTable) return;

    // 1. Xóa khỏi danh sách cũ
    if (originalParentId) {
      // Xóa khỏi nodeChildrenMap nếu là con của node khác
      const oldParentChildren = treeTable.nodeChildrenMap.get(originalParentId);
      if (oldParentChildren) {
        const filteredChildren = oldParentChildren.filter(x => x.id !== updatedItem.id);
        treeTable.nodeChildrenMap.set(originalParentId, filteredChildren);
      }
    } else {
      // Xóa khỏi danh sách gốc nếu trước đây là node gốc
      this.parentCategories = this.parentCategories.filter(x => x.id !== updatedItem.id);
    }

    // 2. Thêm vào danh sách mới
    if (updatedItem.matHangChaId) {
      // Thêm vào nodeChildrenMap của parent mới nếu parent mới đã được mở rộng
      if (treeTable.nodeChildrenMap.has(updatedItem.matHangChaId)) {
        const newParentChildren = treeTable.nodeChildrenMap.get(updatedItem.matHangChaId) || [];
        // Thêm vào chỉ khi chưa có trong danh sách
        if (!newParentChildren.some(x => x.id === updatedItem.id)) {
          treeTable.nodeChildrenMap.set(
            updatedItem.matHangChaId,
            [...newParentChildren, updatedItem]
          );
        }
      }

      // Tự động mở rộng đến vị trí mới của node
      this.expandToNodeAfterParentChange(updatedItem);
    } else {
      // Thêm vào danh sách gốc nếu trở thành node gốc
      if (!this.parentCategories.some(x => x.id === updatedItem.id)) {
        this.parentCategories = [...this.parentCategories, updatedItem];
      }
    }

    // Cập nhật giao diện
    if (treeTable.detectChanges) {
      setTimeout(() => treeTable.detectChanges());
    }
  }

  /**
   * Mở rộng cây đến vị trí mới của node sau khi chuyển nhóm
   */
  private expandToNodeAfterParentChange(updatedItem: HHThiTruongDto): void {
    if (!updatedItem.matHangChaId) return;

    this.spinnerService.showTableSpinner();

    // Sử dụng phương thức đã có để tự động mở đường dẫn đến node
    this.dmHangHoaThiTruongService.getFullPathWithChildren(updatedItem.matHangChaId, updatedItem.id)
      .subscribe({
        next: (pathTree) => {
          this.handleOptimizedPathResponse(pathTree, updatedItem);
          this.spinnerService.hideTableSpinner();
        },
        error: (error) => {
          console.error('Lỗi khi tải đường dẫn mới:', error);
          this.spinnerService.hideTableSpinner();
        }
      });
  }
}
