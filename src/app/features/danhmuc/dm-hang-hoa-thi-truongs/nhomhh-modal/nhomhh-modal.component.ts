import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { DmHangHoaThiTruongService } from '../../services/api/dm-hang-hoa-thi-truong.service';
import { CategoryInfoDto } from '../../models/dm-hh-thitruong/CategoryInfoDto';
import { LoaiMatHangEnum } from '../../models/dm-hh-thitruong/HHThiTruongDto';
import { finalize } from 'rxjs';
import { TreeNode } from '../../models/tree-node';

@Component({
  selector: 'app-nhomhh-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './nhomhh-modal.component.html',
  styleUrl: './nhomhh-modal.component.css'
})
export class NhomhhModalComponent implements OnInit {
  // ID của nhóm hàng hóa đã chọn trước đó
  @Input() preSelectedId: string | null = null;
  
  // Dữ liệu cây nhóm hàng hóa
  rootNodes: TreeNode[] = [];
  
  // Nhóm được chọn hiện tại
  selectedNode: TreeNode | null = null;
  
  // Từ khóa tìm kiếm
  searchTerm = '';
  
  // Chế độ hiển thị: 'tree' hoặc 'search'
  viewMode: 'tree' | 'search' = 'tree';
  
  // Kết quả tìm kiếm (đã thêm hasChildren)
  searchResults: CategoryInfoDto[] = [];
  
  // Trạng thái tải
  loading = false;

  // Thêm thuộc tính để theo dõi item nào đang được hover
  isHovered: string | null = null;
  
  constructor(
    public activeModal: NgbActiveModal,
    private hangHoaService: DmHangHoaThiTruongService
  ) {}

  ngOnInit(): void {
    this.loadCategoriesTree();
  }

  /**
   * Tải cây nhóm hàng hóa
   */
  loadCategoriesTree(): void {
    this.loading = true;
    
    // Sử dụng bộ nhớ cache từ service
    this.hangHoaService.getAllCategoriesWithChildInfo()
      .pipe(finalize(() => this.loading = false))
      .subscribe({
        next: (data) => {
          // Lọc ra các node gốc (không có cha) và là NHÓM
          const rootItems = data.filter(item => 
            !item.matHangChaId && item.loaiMatHang === LoaiMatHangEnum.Nhom
          );
          
          // Chuyển đổi thành cây
          this.rootNodes = this.buildTreeNodes(rootItems, data);
          
          // Nếu có ID đã chọn, tìm và mở rộng nút tương ứng
          if (this.preSelectedId) {
            this.findAndSelectNode(this.preSelectedId);
          }
        },
        error: (error) => {
          console.error('Lỗi khi tải danh sách nhóm hàng hóa:', error);
        }
      });
  }

  /**
   * Xây dựng cây từ danh sách phẳng
   */
  private buildTreeNodes(items: CategoryInfoDto[], allItems: CategoryInfoDto[], level = 0, parent?: TreeNode): TreeNode[] {
    return items.map(item => {
      // Tạo node mới với các thuộc tính từ TreeNode có sẵn
      const node: TreeNode = {
        ...item,
        expanded: false,
        level,
        children: [],
        loadedChildren: false,  // Đánh dấu chưa tải con
        currentPage: 1,         // Trang hiện tại là 1
        hasMoreChildren: false, // Mặc định không có thêm con
        parent
      };
      
      // Thiết lập trạng thái mở rộng ban đầu cho các node gốc
      if (level === 0) {
        node.expanded = false;
      }
      
      // Đệ quy tìm con nếu node có con
      if (item.hasChildren) {
        // Tìm các item con trực tiếp
        const childItems = allItems.filter(child => 
          child.matHangChaId === item.id && child.loaiMatHang === LoaiMatHangEnum.Nhom
        );
        
        if (childItems.length > 0) {
          node.children = this.buildTreeNodes(childItems, allItems, level + 1, node);
          node.loadedChildren = true; // Đánh dấu đã tải con
        }
      }
      
      return node;
    });
  }

  /**
   * Tìm kiếm và chọn node theo ID
   */
  private findAndSelectNode(nodeId: string): void {
    const findNode = (nodes: TreeNode[]): boolean => {
      for (const node of nodes) {
        if (node.id === nodeId) {
          this.selectNode(node);
          this.expandParents(node);
          return true;
        }
        
        if (node.children && node.children.length) {
          const found = findNode(node.children);
          if (found) return true;
        }
      }
      
      return false;
    };
    
    findNode(this.rootNodes);
  }
  
  /**
   * Mở rộng tất cả node cha
   */
  private expandParents(node: TreeNode): void {
    let current = node.parent;
    while (current) {
      current.expanded = true;
      current = current.parent;
    }
  }

  /**
   * Mở rộng/thu gọn một node
   */
  toggleNode(node: TreeNode, event: Event): void {
    event.stopPropagation();
    
    // Nếu node không có con, không làm gì
    if (!node.hasChildren) return;
    
    node.expanded = !node.expanded;
    
    // Nếu cần tải con từ API riêng, có thể thêm code tại đây
  }

  /**
   * Chọn hoặc bỏ chọn một node
   * @param node Node được click
   */
  selectNode(node: TreeNode): void {
    // Nếu node được click đã được chọn trước đó, bỏ chọn nó
    if (this.selectedNode && this.selectedNode.id === node.id) {
      this.selectedNode = null;
      return;
    }
    
    // Nếu chưa được chọn, chọn node đó
    this.selectedNode = node;
  }

  /**
   * Tìm kiếm nhóm hàng hóa (sử dụng cache)
   */
  searchCategories(): void {
    if (!this.searchTerm.trim()) {
      this.viewMode = 'tree';
      return;
    }
    
    this.loading = true;
    this.viewMode = 'search';
    
    // Sử dụng phương thức tìm kiếm trong cache thay vì gọi API
    this.hangHoaService.searchCategoriesInCache(this.searchTerm)
      .pipe(finalize(() => this.loading = false))
      .subscribe({
        next: (results) => {
          // Lọc kết quả chỉ lấy các node là NHÓM
          this.searchResults = results.filter(
            item => item.loaiMatHang === LoaiMatHangEnum.Nhom
          );
        },
        error: (error) => {
          console.error('Lỗi khi tìm kiếm nhóm hàng hóa:', error);
        }
      });
  }

  /**
   * Quay lại chế độ xem cây
   */
  backToTree(): void {
    this.viewMode = 'tree';
    this.searchTerm = '';
  }

  /**
   * Chọn hoặc bỏ chọn một nhóm từ kết quả tìm kiếm
   * @param item Kết quả tìm kiếm được click
   */
  selectSearchResult(item: CategoryInfoDto): void {
    // Nếu item được click đã được chọn trước đó, bỏ chọn nó
    if (this.selectedNode && this.selectedNode.id === item.id) {
      this.selectedNode = null;
      return;
    }
    
    // Chuyển đổi CategoryInfoDto thành TreeNode
    this.selectedNode = {
      ...item,
      level: 0,
      expanded: false,
      children: [],
      loadedChildren: false,
      currentPage: 1,
      hasMoreChildren: false
    };
  }

  /**
   * Xác nhận lựa chọn và đóng modal
   */
  confirm(): void {
    if (this.selectedNode) {
      this.activeModal.close({
        id: this.selectedNode.id,
        ten: this.selectedNode.ten,
        ma: this.selectedNode.ma
      });
    }
  }

  /**
   * Đóng modal không chọn gì
   */
  close(): void {
    this.activeModal.dismiss('cancel');
  }
}
