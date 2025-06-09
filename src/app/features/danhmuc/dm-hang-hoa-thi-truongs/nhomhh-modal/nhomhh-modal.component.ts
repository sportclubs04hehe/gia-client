import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { DmHangHoaThiTruongService } from '../../services/api/dm-hang-hoa-thi-truong.service';
import { CategoryInfoDto } from '../../models/dm-hh-thitruong/CategoryInfoDto';
import { finalize, debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import { TextHighlightPipe } from '../../../../shared/pipes/text-highlight.pipe';
import { TruncatePipe } from '../../../../shared/pipes/truncate.pipe';
import { TreeNode } from '../../models/helpers/tree-node';
import { Loai } from '../../models/enum/loai';

@Component({
  selector: 'app-nhomhh-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TextHighlightPipe,
    TruncatePipe,
  ],
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
  
  // Subject để theo dõi thay đổi trong ô tìm kiếm
  private searchTerms = new Subject<string>();
  
  // Chế độ hiển thị: 'tree' hoặc 'search'
  viewMode: 'tree' | 'search' = 'tree';
  
  // Kết quả tìm kiếm
  searchResults: CategoryInfoDto[] = [];
  
  // Trạng thái tải
  loading = false;
  
  constructor(
    public activeModal: NgbActiveModal,
    private hangHoaService: DmHangHoaThiTruongService
  ) {}

  ngOnInit(): void {
    this.loadCategoriesTree();
    
    // Thiết lập subscription cho tìm kiếm theo thời gian thực
    this.searchTerms.pipe(
      // Chờ 300ms sau mỗi lần nhập để tránh quá nhiều request
      debounceTime(300),
      // Bỏ qua nếu giá trị không thay đổi
      distinctUntilChanged()
    ).subscribe(term => {
      // Thực hiện tìm kiếm
      this.performSearch(term);
    });
  }

  /**
   * Phương thức được gọi mỗi khi người dùng nhập vào ô tìm kiếm
   */
  onSearchInput(term: string): void {
    this.searchTerms.next(term);
  }
  
  /**
   * Thực hiện tìm kiếm với từ khóa đã nhập
   */
  private performSearch(term: string): void {
    if (!term.trim()) {
      this.viewMode = 'tree';
      return;
    }
    
    this.loading = true;
    this.viewMode = 'search';
    
    // Sử dụng phương thức tìm kiếm trong cache
    this.hangHoaService.searchCategoriesInCache(term)
      .pipe(finalize(() => this.loading = false))
      .subscribe({
        next: (results) => {
          // Lọc kết quả chỉ lấy các node là NHÓM
          this.searchResults = results.filter(
            item => item.loaiMatHang === Loai.Cha
          );
        },
        error: (error) => {
          console.error('Lỗi khi tìm kiếm nhóm hàng hóa:', error);
        }
      });
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
            !item.matHangChaId && item.loaiMatHang === Loai.Cha
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
   * @param items Các mục cần xây dựng thành node
   * @param allItems Tất cả các mục trong hệ thống
   * @param level Cấp độ hiện tại của node
   * @param parent Node cha (nếu có)
   * @returns Mảng các TreeNode đã được xây dựng
   */
  private buildTreeNodes(items: CategoryInfoDto[], allItems: CategoryInfoDto[], level = 0, parent?: TreeNode): TreeNode[] {
    return items.map(item => {
      // Tạo node mới với các thuộc tính từ TreeNode có sẵn
      const node: TreeNode = {
        ...item,
        expanded: false,
        level,
        children: [],  // Luôn khởi tạo mảng rỗng
        loadedChildren: false,
        currentPage: 1,
        hasMoreChildren: false,
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
          child.matHangChaId === item.id && child.loaiMatHang === Loai.Cha
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
   * @param node Node cần toggle
   * @param event Event click
   */
  toggleNode(node: TreeNode, event: Event): void {
    event.stopPropagation();
    node.expanded = !node.expanded;
    
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
