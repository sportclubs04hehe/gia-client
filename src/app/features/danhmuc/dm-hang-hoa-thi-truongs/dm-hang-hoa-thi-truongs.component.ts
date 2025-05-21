import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActiveButtonComponent } from '../../../shared/components/active-button/active-button.component';
import { SearchBarComponent } from '../../../shared/components/search-bar/search-bar.component';
import { DmHangHoaThiTruongService } from '../services/api/dm-hang-hoa-thi-truong.service';
import { HHThiTruongDto } from '../models/dm-hh-thitruong/HHThiTruongDto';
import { ToastrService } from 'ngx-toastr';
import { HHThiTruongTreeNodeDto } from '../models/dm-hh-thitruong/HHThiTruongTreeNodeDto';

@Component({
  selector: 'app-dm-hang-hoa-thi-truongs',
  standalone: true,
  imports: [
    CommonModule,
    ActiveButtonComponent,
    SearchBarComponent,
  ],
  templateUrl: './dm-hang-hoa-thi-truongs.component.html',
  styleUrl: './dm-hang-hoa-thi-truongs.component.css'
})
export class DmHangHoaThiTruongsComponent implements OnInit {
  private toastr = inject(ToastrService);

  // Danh sách mặt hàng cha (cấp đầu tiên)
  parentCategories: HHThiTruongDto[] = [];
  isLoading = false;
  
  // Map để lưu trữ trạng thái mở rộng của từng node
  expandedRows = new Map<string, boolean>();
  
  // Map để lưu trữ các node con đã tải cho từng mặt hàng
  nodeChildrenMap = new Map<string, HHThiTruongTreeNodeDto[]>();
  
  // Map theo dõi trạng thái đang tải của mỗi node
  nodeLoadingMap = new Map<string, boolean>();
  
  // Hàng đang được chọn
  selectedRow: HHThiTruongTreeNodeDto | HHThiTruongDto | null = null;
  
  constructor(private dmHangHoaThiTruongService: DmHangHoaThiTruongService) {}
  
  ngOnInit(): void {
    this.loadParentCategories();
  }
  
  // Tải danh sách mặt hàng cha (cấp cao nhất)
  loadParentCategories(): void {
    this.isLoading = true;
    
    this.dmHangHoaThiTruongService.getAllParentCategories().subscribe({
      next: (data) => {
        this.parentCategories = data;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Lỗi khi tải danh sách mặt hàng cha:', error);
        this.toastr.error('Không thể tải danh sách mặt hàng', 'Lỗi');
        this.isLoading = false;
      }
    });
  }

  // Kiểm tra node có đang mở rộng không
  isNodeExpanded(nodeId: string): boolean {
    return this.expandedRows.get(nodeId) === true;
  }

  // Kiểm tra đang tải con cho node không
  isLoadingChildren(nodeId: string): boolean {
    return this.nodeLoadingMap.get(nodeId) === true;
  }

  // Lấy danh sách con của node
  getNodeChildren(nodeId: string): HHThiTruongTreeNodeDto[] {
    return this.nodeChildrenMap.get(nodeId) || [];
  }

  // Kiểm tra node có con không hoặc có thể có con không
  hasChildren(item: HHThiTruongTreeNodeDto | HHThiTruongDto): boolean {
    // Nếu là nhóm mặt hàng (loại 0) thì có thể có con
    return item.loaiMatHang === 0 || 
           // Hoặc đã có dữ liệu con được tải
           (this.nodeChildrenMap.has(item.id) && this.getNodeChildren(item.id).length > 0);
  }

  // Mở rộng/thu gọn một node
  toggleNode(event: Event, item: HHThiTruongTreeNodeDto | HHThiTruongDto): void {
    // Ngăn chặn sự kiện lan đến hàng
    event.stopPropagation();
    
    const nodeId = item.id;
    const isCurrentlyExpanded = this.isNodeExpanded(nodeId);
    
    // Đảo ngược trạng thái mở rộng
    this.expandedRows.set(nodeId, !isCurrentlyExpanded);
    
    // Nếu đang mở rộng và chưa tải dữ liệu con, thì tải dữ liệu
    if (!isCurrentlyExpanded && !this.nodeChildrenMap.has(nodeId)) {
      this.loadChildrenForNode(nodeId);
    }
  }

  // Tải dữ liệu con cho một node
  loadChildrenForNode(nodeId: string): void {
    // Đánh dấu đang tải
    this.nodeLoadingMap.set(nodeId, true);
    
    this.dmHangHoaThiTruongService.getChildrenByParent(nodeId).subscribe({
      next: (result) => {
        let children: HHThiTruongTreeNodeDto[] = [];
        
        // Xử lý kết quả API trả về
        if (Array.isArray(result)) {
          children = result;
        } else if (result && 'data' in result) {
          children = result.data || [];
        }
        
        // Lưu danh sách con vào map
        this.nodeChildrenMap.set(nodeId, children);
        
        // Đánh dấu đã tải xong
        this.nodeLoadingMap.set(nodeId, false);
      },
      error: (error) => {
        console.error(`Lỗi khi tải danh sách con cho mặt hàng ${nodeId}:`, error);
        this.toastr.error('Không thể tải danh sách mặt hàng con', 'Lỗi');
        this.nodeLoadingMap.set(nodeId, false);
        this.nodeChildrenMap.set(nodeId, []);
      }
    });
  }

  // Xử lý chọn hàng
  selectRow(item: HHThiTruongDto | HHThiTruongTreeNodeDto): void {
    this.selectedRow = item;
  }
  
  // Tính toán độ thụt lề dựa vào cấp độ
  calculateIndent(level: number): string {
    return `${level * 20}px`;
  }
}
