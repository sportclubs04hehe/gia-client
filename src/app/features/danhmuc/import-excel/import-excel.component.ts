import { Component, inject, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { HangHoaCreateDto } from '../models/hanghoathitruong/hh-thitruong-create';
import { DmThitruongService } from '../services/dm-thitruong.service';
import { ExcelImportService, ExcelImportResult } from '../services/excel-import.service';
import { SharedModule } from '../../../shared/shared.module';
import { BatchImportErrorResponse } from '../models/hanghoathitruong/batch-import-error-response';

@Component({
  selector: 'app-import-excel',
  standalone: true,
  imports: [
    SharedModule
  ],
  templateUrl: './import-excel.component.html',
  styleUrl: './import-excel.component.css'
})
export class ImportExcelComponent implements OnInit {
  private activeModal = inject(NgbActiveModal);
  private toastr = inject(ToastrService);
  private excelService = inject(ExcelImportService);
  private dmService = inject(DmThitruongService);
  
  title = 'Nhập dữ liệu từ Excel';
  isProcessing = false;
  selectedFile: File | null = null;
  parsedItems: HangHoaCreateDto[] = [];
  errorMessage = '';
  step = 1; // 1: Upload, 2: Preview, 3: Success
  
  // Add these new properties for duplicate handling
  duplicateItems: { code: string; rows: number[] }[] = [];
  hasDuplicates = false;
  
  // Add these properties for server-side error handling
  invalidItems: string[] = [];
  invalidItemCodes: Set<string> = new Set<string>();
  
  // Rest of your component remains unchanged
  
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
  
  // Add a method to clear all data and error states
  resetState(): void {
    this.parsedItems = [];
    this.errorMessage = '';
    this.duplicateItems = [];
    this.hasDuplicates = false;
    this.invalidItems = [];
    this.invalidItemCodes = new Set();
  }
  
  // Update the processFile method to reset all errors at the start
  async processFile(): Promise<void> {
    if (!this.selectedFile) {
      this.errorMessage = 'Vui lòng chọn file trước khi tải lên';
      return;
    }
    
    this.isProcessing = true;
    // Reset all error states
    this.errorMessage = '';
    this.duplicateItems = [];
    this.hasDuplicates = false;
    this.invalidItems = [];
    this.invalidItemCodes = new Set();
    
    try {
      const result: ExcelImportResult = await this.excelService.importHangHoaFromExcel(this.selectedFile);
      this.parsedItems = result.items;
      this.duplicateItems = result.duplicates;
      this.hasDuplicates = this.duplicateItems.length > 0;
      
      if (this.parsedItems.length === 0) {
        this.errorMessage = 'Không tìm thấy dữ liệu trong file Excel';
        this.isProcessing = false;
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
    this.errorMessage = '';
    this.invalidItems = [];
    this.invalidItemCodes = new Set();
    
    this.dmService.addBatch(this.parsedItems).subscribe({
      next: (result) => {
        this.isProcessing = false;
        this.step = 3; // Move to success step
        this.toastr.success(`Đã nhập thành công ${result.length} mặt hàng`, 'Nhập dữ liệu thành công');
      },
      error: (error) => {
        this.isProcessing = false;
        
        // Check if this is our specific batch import error
        if (error.errors && error.errors.invalidItems) {
          // This is a batch import error
          const batchError = error as BatchImportErrorResponse;
          this.invalidItems = batchError.errors.invalidItems;
          
          // Extract item codes from error messages
          this.invalidItems.forEach(item => {
            const match = item.match(/\[([^\]]+)\]/);
            if (match && match[1]) {
              this.invalidItemCodes.add(match[1]);
            }
          });
          
          this.errorMessage = batchError.message || 'Có lỗi với một số mặt hàng trong danh sách';
        } else {
          // Regular error handling
          this.errorMessage = 'Lỗi khi nhập dữ liệu: ' + (error.error?.message || error.message || 'Không xác định');
        }
        
        console.error('Import error:', error);
      }
    });
  }
  
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
  
  // Add method to check if an item code is duplicate in the Excel file
  isDuplicateInExcel(code: string): boolean {
    return this.duplicateItems.some(item => item.code === code);
  }
  
  // Update existing hasError method to include Excel duplicates
  hasError(itemCode: string): boolean {
    return this.invalidItemCodes.has(itemCode) || this.isDuplicateInExcel(itemCode);
  }
  
  // Add this method to go back to step 1 and reset all errors
  backToUpload(): void {
    this.step = 1;
    this.resetState();
  }
}
