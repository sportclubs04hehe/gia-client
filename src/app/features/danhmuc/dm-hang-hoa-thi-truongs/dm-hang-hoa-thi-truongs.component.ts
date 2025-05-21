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

  parentCategories: HHThiTruongDto[] = [];
  isLoading = false;
  
  // Map để lưu trữ trạng thái mở rộng và danh sách con của từng hàng cha
  expandedRows = new Map<string, boolean>();
  childrenMap = new Map<string, HHThiTruongTreeNodeDto[]>();
  childLoadingMap = new Map<string, boolean>();
  
  constructor(private dmHangHoaThiTruongService: DmHangHoaThiTruongService) {}
  
  ngOnInit(): void {
    this.loadParentCategories();
  }
  
  loadParentCategories(): void {
    this.isLoading = true;
    
    this.dmHangHoaThiTruongService.getAllParentCategories().subscribe({
      next: (data) => {
        this.parentCategories = data;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading parent categories:', error);
        this.toastr.error('Không thể tải danh sách mặt hàng', 'Lỗi');
        this.isLoading = false;
      }
    });
  }

  // Phương thức kiểm tra hàng cha có mở rộng hay không
  isRowExpanded(itemId: string): boolean {
    return this.expandedRows.get(itemId) === true;
  }

  // Phương thức kiểm tra đang tải con hay không
  isLoadingChildren(itemId: string): boolean {
    return this.childLoadingMap.get(itemId) === true;
  }

  // Phương thức lấy danh sách con đã tải
  getChildren(itemId: string): HHThiTruongTreeNodeDto[] {
    return this.childrenMap.get(itemId) || [];
  }

  // Phương thức để toggle mở rộng/thu gọn hàng
  toggleRow(event: Event, item: HHThiTruongDto): void {
    // Ngăn chặn sự kiện lan đến hàng (tránh chọn hàng khi nhấp vào biểu tượng)
    event.stopPropagation();
    
    const itemId = item.id;
    const isCurrentlyExpanded = this.isRowExpanded(itemId);
    
    // Đảo ngược trạng thái mở rộng
    this.expandedRows.set(itemId, !isCurrentlyExpanded);
    
    // Nếu đang mở rộng và chưa tải dữ liệu con, thì tải dữ liệu
    if (!isCurrentlyExpanded && !this.childrenMap.has(itemId)) {
      this.loadChildrenForParent(itemId);
    }
  }

  // Phương thức tải dữ liệu con cho mặt hàng cha
  loadChildrenForParent(parentId: string): void {
    // Đánh dấu đang tải
    this.childLoadingMap.set(parentId, true);
    
    this.dmHangHoaThiTruongService.getChildrenByParent(parentId).subscribe({
      next: (result) => {
        // Lưu danh sách con vào map
        if (Array.isArray(result)) {
          // Nếu API trả về mảng trực tiếp
          this.childrenMap.set(parentId, result);
        } else if (result && 'data' in result) {
          // Nếu API trả về đối tượng phân trang
          this.childrenMap.set(parentId, result.data || []);
        } else {
          // Trường hợp khác
          this.childrenMap.set(parentId, []);
        }
        
        // Đánh dấu đã tải xong
        this.childLoadingMap.set(parentId, false);
      },
      error: (error) => {
        console.error(`Lỗi khi tải danh sách con cho mặt hàng ${parentId}:`, error);
        this.toastr.error('Không thể tải danh sách mặt hàng con', 'Lỗi');
        this.childLoadingMap.set(parentId, false);
        this.childrenMap.set(parentId, []);
      }
    });
  }

  // Xử lý chọn hàng
  selectedRow: HHThiTruongDto | null = null;
  
  selectRow(item: HHThiTruongDto): void {
    this.selectedRow = item;
  }
  
  // Phương thức chọn mặt hàng con
  selectChildRow(event: Event, child: HHThiTruongTreeNodeDto): void {
    event.stopPropagation();
    // Gán selected cho child item nếu cần
    // Có thể mở rộng để hỗ trợ chọn cả mặt hàng con
  }
}
