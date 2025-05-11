import { Component, inject, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { SharedModule } from '../../../../shared/shared.module';
import { HHThiTruongExcelImportService } from '../../services/export/dm-hhthitruong-excel-import.service';
import { DonViTinhCreateDto } from '../../models/dm_donvitinh/don-vi-tinh_create.dto';
import { SpinnerService, SpinnerType } from '../../../../shared/services/spinner.service';
import { NgxSpinnerModule } from 'ngx-spinner';
import { HangHoaImportDto } from '../../models/dm_hanghoathitruong/hanghoa-import.dto';
import { ExcelImportResult } from '../../models/dm_hanghoathitruong/excel-import-result';

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
  private spinner = inject(SpinnerService);
  
  title = 'Nhập dữ liệu từ Excel';
  isProcessing = false; // Keep this for backward compatibility
  selectedFile: File | null = null;
  parsedItems: HangHoaImportDto[] = [];
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
  
  // Thêm thuộc tính mới để lưu trữ mã đã tồn tại
  existingCodes: Set<string> = new Set<string>();

  // Thêm thuộc tính mới để lưu trữ thông tin về các dòng không hợp lệ
  invalidRows: {
    rowIndex: number;
    errors: {
      field: string;
      message: string;
    }[];
  }[] = [];

  // Có lỗi validation không
  hasValidationErrors = false;

  Array = Array;
  
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
    
    this.isProcessing = true;
    this.spinner.show(SpinnerType.Load);
    
    this.errorMessage = '';
    this.duplicateItems = [];
    this.hasDuplicates = false;
    this.invalidItems = [];
    this.invalidItemCodes = new Set();
    this.existingCodes = new Set();
    this.invalidRows = []; // Reset danh sách dòng không hợp lệ
    this.hasValidationErrors = false;
    
    try {
      // Đọc file Excel và trích xuất dữ liệu
      const result: ExcelImportResult = await this.excelService.importHangHoaFromExcel(this.selectedFile);
      this.parsedItems = result.items;
      this.duplicateItems = result.duplicates;
      this.hasDuplicates = this.duplicateItems.length > 0;
      this.invalidRows = result.invalidRows || [];
      this.hasValidationErrors = this.invalidRows.length > 0;
      
      if (this.parsedItems.length === 0) {
        this.errorMessage = 'Không tìm thấy dữ liệu trong file Excel';
        this.isProcessing = false;
        this.spinner.hide(SpinnerType.Load);
        return;
      }
      
      // Kiểm tra mã đã tồn tại trong hệ thống
      this.existingCodes = await this.excelService.checkExistingCodes(this.parsedItems);
      
      // Hiển thị cảnh báo nếu có mã đã tồn tại
      if (this.existingCodes.size > 0) {
        // Chỉ gán vào invalidItemCodes, không gán vào invalidItems
        this.invalidItemCodes = this.existingCodes;
      }
      
      // Chuyển đến bước xem trước
      this.step = 2;
    } catch (error: any) {
      this.errorMessage = `Lỗi khi xử lý file: ${error.message}`;
      console.error('Excel import error:', error);
    } finally {
      this.isProcessing = false;
      this.spinner.hide(SpinnerType.Load);
    }
  }
  
  async importData(): Promise<void> {
    // Không cho phép import nếu có lỗi validation
    if (this.hasValidationErrors) {
      this.errorMessage = 'Không thể nhập dữ liệu có lỗi validation. Vui lòng sửa lại file Excel.';
      this.toastr.error('Không thể nhập dữ liệu có lỗi validation', 'Lỗi dữ liệu');
      return;
    }
    
    // Không xử lý nếu có trùng lặp
    if (this.hasDuplicates) {
      this.errorMessage = 'Không thể nhập dữ liệu có mã trùng lặp. Vui lòng sửa lại file Excel.';
      this.toastr.error('Không thể nhập dữ liệu chứa mã trùng lặp', 'Lỗi dữ liệu');
      return;
    }
    
    // Hỏi người dùng nếu có mã đã tồn tại
    if (this.existingCodes.size > 0) {
      const confirmImport = confirm(
        `Phát hiện ${this.existingCodes.size} mã hàng hóa đã tồn tại trong hệ thống. Bạn muốn tiếp tục nhập các mã chưa tồn tại?`
      );
      
      if (!confirmImport) {
        return;
      }
      
      // Lọc ra các mục chưa tồn tại
      this.parsedItems = this.parsedItems.filter(item => !this.existingCodes.has(item.maMatHang));
      
      if (this.parsedItems.length === 0) {
        this.toastr.info('Không có mục nào mới để nhập', 'Thông báo');
        return;
      }
    }
    
    this.isProcessing = true;
    this.spinner.show(SpinnerType.Save);
    this.errorMessage = '';
    this.invalidItems = [];
    this.invalidItemCodes = new Set();
    
    try {
      // Sử dụng API mới để import trực tiếp
      const result = await this.excelService.sendToServer(this.parsedItems);
      
      this.isProcessing = false;
      this.spinner.hide(SpinnerType.Save);
      
      if (result.statusCode === 201 || result.statusCode === 200) {
        // Thành công hoàn toàn
        this.step = 3;
        const itemCount = result.data?.length || this.parsedItems.length;
        this.toastr.success(`Đã nhập thành công ${itemCount} mặt hàng`, 'Nhập dữ liệu thành công');
      } else if (result.statusCode === 207) {
        // Thành công một phần
        this.step = 3;
        const itemCount = result.data?.length || 0;
        const errorCount = result.errors ? (Array.isArray(result.errors) ? result.errors.length : 1) : 0;
        
        this.toastr.warning(
          `Đã nhập ${itemCount} mặt hàng thành công, ${errorCount} mục lỗi.`, 
          'Nhập dữ liệu thành công một phần'
        );
        
        // Hiển thị lỗi nếu có
        if (result.errors) {
          const errors = Array.isArray(result.errors) ? result.errors : [result.errors];
          this.invalidItems = errors.map(e => String(e));
          
          errors.forEach(error => {
            const match = String(error).match(/\[([^\]]+)\]/);
            if (match && match[1]) {
              this.invalidItemCodes.add(match[1]);
            }
          });
        }
      }
    } catch (error: any) {
      this.isProcessing = false;
      this.spinner.hide(SpinnerType.Save);
      
      // Hiển thị lỗi chi tiết hơn
      if (error.error) {
        const apiError = error.error;
        
        if (apiError.errors) {
          // Xử lý lỗi chi tiết
          if (apiError.errors.errorMessages && Array.isArray(apiError.errors.errorMessages)) {
            this.invalidItems = apiError.errors.errorMessages.map((error: string) => {
              // Cố gắng trích xuất phần quan trọng của thông báo lỗi
              if (error.includes('Lỗi xử lý đơn vị tính')) {
                return `Lỗi khi thêm đơn vị tính: ${error.split(':')[0].split("'")[1]}`;
              } else if (error.includes('Không thể xác định đơn vị tính')) {
                return `Lỗi: ${error}`;
              } else {
                return error;
              }
            });
          } else if (Array.isArray(apiError.errors)) {
            this.invalidItems = apiError.errors.map((e: any) => String(e));
          } else if (typeof apiError.errors === 'object') {
            this.invalidItems = Object.values(apiError.errors).map(e => String(e));
          } else {
            this.invalidItems = [JSON.stringify(apiError.errors)];
          }
          
          // Xác định các mã đã tồn tại
          this.invalidItems.forEach(item => {
            const match = item.match(/Hàng hóa '([^']+)'/);
            if (match && match[1]) {
              this.invalidItemCodes.add(match[1]);
            }
          });
        }
        
        this.errorMessage = apiError.message || 'Có lỗi khi import dữ liệu';
        
        // Nếu là lỗi PostgreSQL DateTime
        if (apiError.message?.includes('Cannot write DateTime with Kind=Local to PostgreSQL') || 
            this.invalidItems.some(item => item.includes('DateTime') || item.includes('timestamp'))) {
          this.errorMessage = 'Lỗi định dạng thời gian: Hệ thống yêu cầu thời gian ở định dạng UTC. Vui lòng liên hệ kỹ thuật.';
        }
      } else {
        this.errorMessage = 'Lỗi khi nhập dữ liệu: ' + (error.message || 'Không xác định');
      }
      
      console.error('Import error:', error);
      this.toastr.error(this.errorMessage, 'Lỗi khi import dữ liệu');
    }
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
    return this.invalidItemCodes.has(itemCode) || this.existingCodes.has(itemCode);
  }
  
  backToUpload(): void {
    this.step = 1;
    this.resetState();
  }

  // Thêm phương thức này vào ImportExcelComponent
  continueWithNonExisting(): void {
    // Lọc ra các mục chưa tồn tại
    const originalCount = this.parsedItems.length;
    this.parsedItems = this.parsedItems.filter(item => !this.existingCodes.has(item.maMatHang));
    
    if (this.parsedItems.length === 0) {
      this.toastr.info('Không có mục nào mới để nhập', 'Thông báo');
      return;
    }
    
    // Thông báo số lượng mục sẽ được import
    this.toastr.info(
      `Sẽ import ${this.parsedItems.length} mặt hàng mới (bỏ qua ${originalCount - this.parsedItems.length} mã đã tồn tại)`,
      'Tiếp tục import'
    );
    
    // Clear các thông báo lỗi liên quan đến mã đã tồn tại
    this.invalidItems = this.invalidItems.filter(item => !item.includes('đã tồn tại trong hệ thống'));
    
    // Nếu không còn lỗi nào khác, xóa thông báo lỗi
    if (this.invalidItems.length === 0) {
      this.errorMessage = '';
    }
  }

  // Thêm phương thức để kiểm tra xem lỗi chỉ liên quan đến mã đã tồn tại hay không
  isOnlyExistingCodesError(): boolean {
    // Nếu không có lỗi nào thì return false
    if (this.invalidItems.length === 0) return false;
    
    // Kiểm tra xem tất cả các lỗi có phải đều là lỗi mã đã tồn tại không
    return this.invalidItems.every(item => item.includes('đã tồn tại trong hệ thống'));
  }

  // Thêm phương thức mới để kiểm tra lỗi của một dòng cụ thể
  // Update this method to check if a row has errors, accounting for Excel 1-based indexing
  hasRowErrors(rowIndex: number): boolean {
    return this.invalidRows.some(row => row.rowIndex === rowIndex);
  }

  // Lấy các lỗi của một dòng cụ thể
  getRowErrors(rowIndex: number): { field: string; message: string }[] {
    const rowWithErrors = this.invalidRows.find(row => row.rowIndex === rowIndex);
    return rowWithErrors ? rowWithErrors.errors : [];
  }

  // Lấy thông báo lỗi cho một trường cụ thể của một dòng
  // Update to get field errors for a specific Excel row
  getFieldErrorMessage(rowIndex: number, fieldName: string): string | null {
    const rowWithErrors = this.invalidRows.find(row => row.rowIndex === rowIndex);
    if (!rowWithErrors) return null;
    
    const fieldError = rowWithErrors.errors.find(err => err.field === fieldName);
    return fieldError ? fieldError.message : null;
  }

  getInvalidRowNumbers(): number[] {
  return this.invalidRows.map(row => row.rowIndex);
}
}
