import { Component, inject, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { SharedModule } from '../../../../shared/shared.module';
import { ApiResponse } from '../../models/dm_hanghoathitruong/api-response';
import { HangHoaCreateDto } from '../../models/dm_hanghoathitruong/hh-thitruong-create';
import { DmThitruongService } from '../../services/dm-thitruong.service';
import { ExcelImportResult, HHThiTruongExcelImportService } from '../../services/dm-hhthitruong-excel-import.service';
import { DonViTinhCreateDto } from '../../models/dm_donvitinh/don-vi-tinh_create.dto';
import { SpinnerService, SpinnerType } from '../../../../shared/services/spinner.service';
import { NgxSpinnerModule } from 'ngx-spinner';

@Component({
  selector: 'app-import-excel',
  standalone: true,
  imports: [
    SharedModule,
    NgxSpinnerModule
  ],
  templateUrl: './import-excel.component.html',
  styleUrl: './import-excel.component.css'
})
export class ImportExcelComponent implements OnInit {
  private activeModal = inject(NgbActiveModal);
  private toastr = inject(ToastrService);
  private excelService = inject(HHThiTruongExcelImportService);
  private dmService = inject(DmThitruongService);
  private spinner = inject(SpinnerService);
  
  title = 'Nhập dữ liệu từ Excel';
  isProcessing = false; // Keep this for backward compatibility
  selectedFile: File | null = null;
  parsedItems: HangHoaCreateDto[] = [];
  errorMessage = '';
  step = 1; 
  
  // Duplicate handling
  duplicateItems: { code: string; rows: number[] }[] = [];
  hasDuplicates = false;
  
  // Server-side error handling
  invalidItems: string[] = [];
  invalidItemCodes: Set<string> = new Set<string>();
  
  // New donvitinh items
  newDonViTinhs: DonViTinhCreateDto[] = [];
  
  ngOnInit(): void {}
  
  onFileSelected(event: any): void {
    const files: FileList = event.target.files;
    
    if (files.length > 0) {
      const file = files[0];
      
      // Validate file type
      if (!this.isExcelFile(file)) {
        this.errorMessage = 'Vui lòng chọn file Excel (.xlsx, .xls)';
        this.selectedFile = null;
        return;
      }
      
      // Clear all error states when a new file is selected
      this.selectedFile = file;
      this.errorMessage = '';
      this.duplicateItems = [];
      this.hasDuplicates = false;
      this.invalidItems = [];
      this.invalidItemCodes = new Set();
    }
  }
  
  resetState(): void {
    this.parsedItems = [];
    this.errorMessage = '';
    this.duplicateItems = [];
    this.hasDuplicates = false;
    this.invalidItems = [];
    this.invalidItemCodes = new Set();
  }
  
  async processFile(): Promise<void> {
    if (!this.selectedFile) {
      this.errorMessage = 'Vui lòng chọn file trước khi tải lên';
      return;
    }
    
    // Start loading indicators
    this.isProcessing = true;
    this.spinner.show(SpinnerType.Load);
    
    // Reset all error states
    this.errorMessage = '';
    this.duplicateItems = [];
    this.hasDuplicates = false;
    this.invalidItems = [];
    this.invalidItemCodes = new Set();
    this.newDonViTinhs = [];
    
    try {
      const result: ExcelImportResult = await this.excelService.importHangHoaFromExcel(this.selectedFile);
      this.parsedItems = result.items;
      this.duplicateItems = result.duplicates;
      this.hasDuplicates = this.duplicateItems.length > 0;
      this.newDonViTinhs = result.newDonViTinhs;
      
      if (this.parsedItems.length === 0) {
        this.errorMessage = 'Không tìm thấy dữ liệu trong file Excel';
        this.isProcessing = false;
        this.spinner.hide(SpinnerType.Load);
        return;
      }
      
      // Show error if duplicates are found
      if (this.hasDuplicates) {
        this.errorMessage = 'Phát hiện mã mặt hàng trùng lặp trong file Excel. Vui lòng sửa trước khi tiếp tục.';
      }
      
      this.step = 2; // Move to preview step
    } catch (error: any) {
      this.errorMessage = `Lỗi khi xử lý file: ${error.message}`;
      console.error('Excel import error:', error);
    } finally {
      this.isProcessing = false;
      this.spinner.hide(SpinnerType.Load);
    }
  }
  
  importData(): void {
    // Don't proceed if there are duplicates
    if (this.hasDuplicates) {
      this.errorMessage = 'Không thể nhập dữ liệu có mã trùng lặp. Vui lòng sửa lại file Excel.';
      this.toastr.error('Không thể nhập dữ liệu chứa mã trùng lặp', 'Lỗi dữ liệu');
      return;
    }
    
    this.isProcessing = true;
    this.spinner.show(SpinnerType.Save); // Use saving spinner for server operations
    this.errorMessage = '';
    this.invalidItems = [];
    this.invalidItemCodes = new Set();
    
    this.dmService.addBatch(this.parsedItems).subscribe({
      next: (result) => {
        this.isProcessing = false;
        this.spinner.hide(SpinnerType.Save);
        this.step = 3; 
        this.toastr.success(`Đã nhập thành công ${result.length} mặt hàng`, 'Nhập dữ liệu thành công');
      },
      error: (error) => {
        this.isProcessing = false;
        this.spinner.hide(SpinnerType.Save);
        
        if (error.errors && error.errors.invalidItems) {
          const batchError = error as ApiResponse<HangHoaCreateDto[]>;
        
          if (batchError.errors) {
            this.invalidItems = batchError.errors.invalidItems;
            
            this.invalidItems.forEach(item => {
              const match = item.match(/\[([^\]]+)\]/);
              if (match && match[1]) {
                this.invalidItemCodes.add(match[1]);
              }
            });
          }
          
          this.errorMessage = batchError.message || 'Có lỗi với một số mặt hàng trong danh sách';
        } else {
          // Regular error handling
          this.errorMessage = 'Lỗi khi nhập dữ liệu: ' + (error.error?.message || error.message || 'Không xác định');
        }
        
        console.error('Import error:', error);
      }
    });
  }
  
  // Other methods remain unchanged...
  downloadTemplate(): void {
    this.excelService.generateTemplate();
  }
  
  close(): void {
    this.activeModal.close(this.step === 3);
  }
  
  dismiss(): void {
    this.activeModal.dismiss();
  }
  
  private isExcelFile(file: File): boolean {
    const allowedTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/octet-stream'
    ];
    return allowedTypes.includes(file.type) || file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
  }
  
  isDuplicateInExcel(code: string): boolean {
    return this.duplicateItems.some(item => item.code === code);
  }
  
  hasError(itemCode: string): boolean {
    return this.invalidItemCodes.has(itemCode) || this.isDuplicateInExcel(itemCode);
  }
  
  backToUpload(): void {
    this.step = 1;
    this.resetState();
  }
}
