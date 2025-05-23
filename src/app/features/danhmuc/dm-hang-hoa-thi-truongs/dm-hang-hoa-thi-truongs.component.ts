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
    { field: 'ma', header: 'Mã', width: '15%' },
    { field: 'ten', header: 'Tên', width: '50%' },
    { field: 'tenDonViTinh', header: 'Đơn vị tính', width: '10%', formatter: (item) => item.tenDonViTinh || 'N/A' },
    { field: 'dacTinh', header: 'Đặc tính', width: '25%', formatter: (item) => item.dacTinh || 'N/A' }
  ];
  
  // Thêm ViewChild để truy cập TreeTableComponent
  @ViewChild(TreeTableComponent) treeTableComponent!: TreeTableComponent<HHThiTruongDto>;
  
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
  onRowSelected(item: any): void {
    this.selectedItem = item as HHThiTruongDto;
  }
  
  /**
   * Xử lý sự kiện khi mở/đóng một node
   */
  onNodeToggled(event: {node: HHThiTruongDto, expanded: boolean}): void {
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
    
    // Truyền mặt hàng cha (nếu có)
    if (this.selectedItem && this.selectedItem.loaiMatHang === LoaiMatHangEnum.Nhom) {
      modalRef.componentInstance.parentItem = this.selectedItem;
    }
    
    // Truyền danh sách nhóm hàng hóa để tránh gọi API lại
    // Map parentCategories thành dạng đơn giản {id, ten}
    const categoryOptions = this.parentCategories.map(item => ({ 
      id: item.id, 
      ten: item.ten 
    }));
    modalRef.componentInstance.nhomHangHoaList = categoryOptions;
    
    // Xử lý kết quả khi đóng modal
    modalRef.result.then(
      (result) => {
        if (result && typeof result === 'object' && 'id' in result) {
          // Kết quả là mặt hàng vừa thêm mới
          const newItem = result as HHThiTruongDto;
          this.toastr.success('Thêm mới mặt hàng thành công', 'Thành công');
          
          // Cập nhật UI dựa trên loại mặt hàng
          this.addNewItemToUI(newItem);
        }
      },
      () => {}
    );
  }

  /**
   * Cập nhật UI sau khi thêm mới mặt hàng
   * @param newItem Mặt hàng vừa được thêm mới
   */
  private addNewItemToUI(newItem: HHThiTruongDto): void {
    const treeTable = this.getTreeTableComponent();
    
    // Trường hợp 1: Mặt hàng cấp cao nhất (không có cha)
    if (!newItem.matHangChaId) {
      // Thêm vào danh sách gốc
      this.parentCategories = [...this.parentCategories, newItem];
      return;
    }
    
    // Trường hợp 2: Mặt hàng con thuộc một nhóm
    if (treeTable && newItem.matHangChaId) {
      if (treeTable.isNodeExpanded(newItem.matHangChaId)) {
        // Nhóm cha đang mở - thêm vào danh sách con hiển thị
        const children = treeTable.getNodeChildren(newItem.matHangChaId);
        treeTable.nodeChildrenMap.set(newItem.matHangChaId, [...children, newItem as any]);
        
        // Chọn mặt hàng vừa thêm
        this.selectRow(newItem);
      } else {
        // Nhóm cha chưa mở - xóa cache để khi mở sẽ tải lại dữ liệu mới nhất
        treeTable.nodeChildrenMap.delete(newItem.matHangChaId);
        
        // Tự động mở rộng nhóm cha và hiển thị mặt hàng mới (tùy chọn)
        this.autoExpandParentAndShowNewItem(newItem);
      }
    }
  }

  /**
   * Tự động mở rộng nhóm cha và hiển thị mặt hàng mới thêm
   * @param item Mặt hàng mới vừa thêm
   */
  private autoExpandParentAndShowNewItem(item: HHThiTruongDto): void {
    if (!item.matHangChaId) return;
    
    const treeTable = this.getTreeTableComponent();
    if (!treeTable) return;
    
    // Đánh dấu đang mở rộng
    treeTable.expandedRows.set(item.matHangChaId, true);
    
    // Tải dữ liệu con của nhóm cha
    this.loadChildrenForNode(item.matHangChaId, 1, this.treeTableComponent.defaultPageSize)
      .subscribe({
        next: (result) => {
          // Cập nhật dữ liệu con và chọn mặt hàng vừa thêm
          treeTable.nodeChildrenMap.set(item.matHangChaId, result.data);
          treeTable.nodeLoadingMap.set(item.matHangChaId, false);
          
          // Thiết lập thông tin phân trang
          treeTable.nodePaginationMap.set(item.matHangChaId, {
            currentPage: 1,
            totalPages: Math.ceil(result.pagination.totalItems / treeTable.defaultPageSize),
            hasNextPage: result.pagination.hasNextPage,
            isLoadingMore: false
          });
          
          // Xóa dòng emit event không tồn tại
          // Thay thế bằng cách gọi trực tiếp sự kiện toggle của TreeTable
          const parentNode = this.parentCategories.find(node => node.id === item.matHangChaId);
          if (parentNode) {
            // Thông báo cho TreeTable biết node đã được mở
            this.onNodeToggled({
              node: parentNode,
              expanded: true
            });
          }
          
          // Tìm và chọn mặt hàng mới
          const addedItem = result.data.find(child => child.id === item.id);
          if (addedItem) {
            this.selectRow(addedItem as unknown as HHThiTruongDto);
          }
        }
      });
  }

  /**
   * Mở modal chỉnh sửa mặt hàng
   */
  openEditModal(item: HHThiTruongDto): void {
    // Hiển thị spinner trong khi tải dữ liệu chi tiết
    this.spinnerService.showSavingSpinner();
    
    // Lưu lại ID nhóm cha cũ để so sánh sau khi cập nhật
    const oldParentId = item.matHangChaId;
    
    // Tải dữ liệu đầy đủ trước khi mở modal
    this.dmHangHoaThiTruongService.getById(item.id).subscribe({
      next: (fullItemData) => {
        const modalRef = this.modalService.open(SuaComponent, { 
          size: 'xl',
          backdrop: 'static',
          keyboard: false
        });
        
        modalRef.componentInstance.editingItem = fullItemData;
        
        // Xử lý kết quả khi đóng modal
        modalRef.result.then(
          (result) => {
            if (result === 'saved') {
              this.toastr.success('Cập nhật mặt hàng thành công', 'Thành công');
              
              // Tải lại thông tin mặt hàng để lấy dữ liệu mới nhất
              this.dmHangHoaThiTruongService.getById(item.id).subscribe({
                next: (updatedItem) => {
                  // Cập nhật UI kèm thông tin nhóm cha cũ
                  this.updateItemInUI(updatedItem, oldParentId);
                }
              });
            }
          },
          () => {} 
        );
        this.spinnerService.hideSavingSpinner();
      },
      error: (error) => {
        console.error('Lỗi khi tải dữ liệu chi tiết mặt hàng:', error);
        this.toastr.error('Không thể tải thông tin chi tiết mặt hàng', 'Lỗi');
        this.spinnerService.hideSavingSpinner();
      }
    });
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

  /**
   * Cập nhật dữ liệu trong UI sau khi sửa mặt hàng thành công
   * @param editedItem Mặt hàng đã được sửa
   * @param oldParentId ID của nhóm cha cũ trước khi sửa (nếu có)
   */
  private updateItemInUI(editedItem: HHThiTruongDto, oldParentId?: string): void {
    const treeTable = this.getTreeTableComponent();
    if (!treeTable) {
      this.loadParentCategories();
      return;
    }

    // Kiểm tra xem có thay đổi nhóm cha không
    if (oldParentId !== editedItem.matHangChaId) {
      // Xóa khỏi nhóm cha cũ nếu đang hiển thị
      this.removeItemFromOldParent(editedItem.id, oldParentId);
      
      // Thêm vào nhóm cha mới hoặc danh sách gốc
      if (!editedItem.matHangChaId) {
        // Thêm vào danh sách gốc nếu không có nhóm cha
        this.loadParentCategories();
      } else {
        // Thêm vào nhóm cha mới
        this.addItemToNewParent(editedItem);
      }
      return;
    }
    
    // Trường hợp không thay đổi nhóm cha, chỉ cập nhật dữ liệu
    if (!editedItem.matHangChaId) {
      // Cập nhật trong danh sách gốc
      const index = this.parentCategories.findIndex(item => item.id === editedItem.id);
      if (index >= 0) {
        this.parentCategories[index] = {...editedItem};
      }
    } else {
      // Cập nhật trong nhóm cha
      if (treeTable.isNodeExpanded(editedItem.matHangChaId)) {
        // Nếu nhóm cha đang mở, cập nhật item trong danh sách con
        const children = treeTable.getNodeChildren(editedItem.matHangChaId);
        const index = children.findIndex((item: any) => item.id === editedItem.id);
        
        if (index >= 0) {
          // Cập nhật trực tiếp trong danh sách con
          children[index] = {...editedItem} as any;
          treeTable.nodeChildrenMap.set(editedItem.matHangChaId, [...children]);
        }
      }
    }
  }

  /**
   * Tải lại dữ liệu con cho một node cụ thể
   * @param parentId ID của node cha cần tải lại dữ liệu con
   */
  private reloadChildrenData(parentId: string): void {
    // Lấy tham chiếu đến TreeTable
    const treeTable = this.getTreeTableComponent();
    if (!treeTable) return;
    
    // Đánh dấu đang tải
    treeTable.nodeLoadingMap.set(parentId, true);
    
    // Lấy thông tin phân trang hiện tại
    const pagination = treeTable.nodePaginationMap.get(parentId);
    if (!pagination) return;
    
    // Tải lại tất cả dữ liệu con đã hiển thị (dựa trên trang hiện tại)
    this.dmHangHoaThiTruongService.getChildrenByParent(
      parentId, 
      1, 
      pagination.currentPage * treeTable.defaultPageSize
    ).subscribe({
      next: (result) => {
        // Cập nhật danh sách con trong TreeTable
        treeTable.nodeChildrenMap.set(parentId, result.data);

        treeTable.nodePaginationMap.set(parentId, {
          ...pagination,
          hasNextPage: result.pagination.totalItems > result.data.length,
          isLoadingMore: false
        });
        
        // Đánh dấu đã tải xong
        treeTable.nodeLoadingMap.set(parentId, false);
        
        // Nếu mặt hàng được chọn nằm trong danh sách vừa tải, cập nhật lại selection
        if (this.selectedItem && this.selectedItem.id) {
          const updatedItem = result.data.find(item => item.id === this.selectedItem?.id);
          if (updatedItem) {
            // Sửa lỗi: Thêm type assertion để chuyển đổi kiểu an toàn
            this.selectedItem = updatedItem as unknown as HHThiTruongDto;
          }
        }
      },
      error: (error) => {
        console.error('Lỗi khi tải lại dữ liệu con:', error);
        treeTable.nodeLoadingMap.set(parentId, false);
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

  /**
   * Xóa mặt hàng khỏi nhóm cha cũ
   * @param itemId ID của mặt hàng cần xóa
   * @param oldParentId ID của nhóm cha cũ
   */
  private removeItemFromOldParent(itemId: string, oldParentId?: string): void {
    if (!oldParentId) return;
    
    const treeTable = this.getTreeTableComponent();
    if (!treeTable) return;
    
    // Chỉ xóa nếu nhóm cha đang được mở rộng (đã tải dữ liệu)
    if (treeTable.isNodeExpanded(oldParentId)) {
      const children = treeTable.getNodeChildren(oldParentId);
      const updatedChildren = children.filter((item: any) => item.id !== itemId);
      // Cập nhật lại danh sách con của nhóm cha cũ
      treeTable.nodeChildrenMap.set(oldParentId, updatedChildren);
    }
  }

  /**
   * Thêm mặt hàng vào nhóm cha mới
   * @param item Mặt hàng cần thêm vào
   */
  private addItemToNewParent(item: HHThiTruongDto): void {
    if (!item.matHangChaId) return;
    
    const treeTable = this.getTreeTableComponent();
    if (!treeTable) return;
    
    // Nếu nhóm cha đang được mở rộng, tải lại dữ liệu con
    if (treeTable.isNodeExpanded(item.matHangChaId)) {
      this.reloadChildrenData(item.matHangChaId);
    } else {
      treeTable.nodeChildrenMap.delete(item.matHangChaId);
    }
  }

  /**
   * Tự động mở rộng nhóm cha và hiển thị mặt hàng đã chuyển
   * @param item Mặt hàng đã được chuyển nhóm
   */
  private autoExpandParentAndShowItem(item: HHThiTruongDto): void {
    if (!item.matHangChaId) return;
    
    const treeTable = this.getTreeTableComponent();
    if (!treeTable) return;
    
    // Tìm node cha trong danh sách gốc
    const parentNode = this.parentCategories.find(node => node.id === item.matHangChaId);
    
    if (parentNode) {
      // Đánh dấu đang mở rộng
      treeTable.expandedRows.set(item.matHangChaId, true);
      
      // Tải dữ liệu con của nhóm cha
      this.loadChildrenForNode(item.matHangChaId, 1, this.treeTableComponent.defaultPageSize)
        .subscribe({
          next: (result) => {
            // Cập nhật dữ liệu con và chọn mặt hàng đã chuyển
            treeTable.nodeChildrenMap.set(item.matHangChaId, result.data);
            treeTable.nodeLoadingMap.set(item.matHangChaId, false);
            
            // Thiết lập thông tin phân trang
            treeTable.nodePaginationMap.set(item.matHangChaId, {
              currentPage: 1,
              totalPages: Math.ceil(result.pagination.totalItems / this.treeTableComponent.defaultPageSize),
              hasNextPage: result.pagination.hasNextPage,
              isLoadingMore: false
            });
            
            // Gọi trực tiếp sự kiện toggle thay vì emit
            this.onNodeToggled({
              node: parentNode,
              expanded: true
            });
            
            // Chọn mặt hàng đã chuyển
            const movedItem = result.data.find(child => child.id === item.id);
            if (movedItem) {
              this.selectRow(movedItem as unknown as HHThiTruongDto);
            }
          }
        });
    }
  }

  /**
   * Chọn một hàng trong bảng
   * @param item Mặt hàng cần chọn
   */
  private selectRow(item: HHThiTruongDto): void {
    // Cập nhật mặt hàng được chọn
    this.selectedItem = item;
    
    // Cập nhật UI hiển thị hàng được chọn
    const treeTable = this.getTreeTableComponent();
    if (treeTable) {
      treeTable.selectedRow = item.id;
    }
  }
}
