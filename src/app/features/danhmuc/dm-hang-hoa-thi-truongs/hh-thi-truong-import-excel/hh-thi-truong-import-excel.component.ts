import { Component, inject, OnInit } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { NgxSpinnerModule } from 'ngx-spinner';
import { ToastrService } from 'ngx-toastr';
import { SpinnerService, SpinnerType } from '../../../../shared/services/spinner.service';
import { SharedModule } from '../../../../shared/shared.module';
import { HHThiTruongImportDto, HHThiTruongBatchImportDto } from '../../models/dm-hh-thitruong/HHThiTruongImportDto';
import { NhomhhModalComponent } from '../nhomhh-modal/nhomhh-modal.component';
import { HHThiTruongExcelImportService } from '../../services/export/dm-hhthitruong-excel-import.service';

@Component({
  selector: 'app-hh-thi-truong-import-excel',
  standalone: true,
  imports: [
    SharedModule,
    NgxSpinnerModule,
    ReactiveFormsModule,
    NhomhhModalComponent
  ],
  templateUrl: './hh-thi-truong-import-excel.component.html',
  styleUrl: './hh-thi-truong-import-excel.component.css'
})
export class HhThiTruongImportExcelComponent implements OnInit {
  private activeModal = inject(NgbActiveModal);
  private toastr = inject(ToastrService);
  private excelService = inject(HHThiTruongExcelImportService);
  private spinner = inject(SpinnerService);
  private modalService = inject(NgbModal);

  title = 'Nhập mặt hàng từ Excel';
  isProcessing = false;
  selectedFile: File | null = null;
  parsedItems: HHThiTruongImportDto[] = [];
  errorMessage = '';
  step = 1;

  // Selected parent category
  selectedParentCategory: {id: string, ma: string, ten: string} | null = null;

  // Duplicate handling
  duplicateItems: { code: string; rows: number[] }[] = [];
  hasDuplicates = false;

  // Validation errors
  invalidRows: {
    rowIndex: number;
    errors: {
      field: string;
      message: string;
    }[];
  }[] = [];

  // Existing codes
  existingCodes: Set<string> = new Set<string>();
  hasValidationErrors = false;

  Array = Array;

  ngOnInit(): void {
    // Không cần pre-load các categories
  }

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

      // Clear error states
      this.selectedFile = file;
      this.errorMessage = '';
      this.duplicateItems = [];
      this.hasDuplicates = false;
    }
  }

  resetState(): void {
    this.parsedItems = [];
    this.errorMessage = '';
    this.duplicateItems = [];
    this.hasDuplicates = false;
    this.invalidRows = [];
    this.existingCodes = new Set();
  }

  async processFile(): Promise<void> {
    if (!this.selectedFile) {
      this.errorMessage = 'Vui lòng chọn file trước khi tải lên';
      return;
    }

    this.isProcessing = true;
    this.spinner.show(SpinnerType.Load);

    this.resetState();

    try {
      // Parse Excel file
      const result = await this.excelService.importFromExcel(this.selectedFile);
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

      // Move to step 2 - choose parent category
      this.step = 2;
    } catch (error: any) {
      this.errorMessage = `Lỗi khi xử lý file: ${error.message}`;
      console.error('Excel import error:', error);
    } finally {
      this.isProcessing = false;
      this.spinner.hide(SpinnerType.Load);
    }
  }

  openCategorySelectModal(): void {
    const modalRef = this.modalService.open(NhomhhModalComponent, {
      size: 'lg',
      backdrop: 'static'
    });

    // Pass any pre-selected ID if needed
    if (this.selectedParentCategory) {
      modalRef.componentInstance.preSelectedId = this.selectedParentCategory.id;
    }

    modalRef.result.then(
      (result) => {
        if (result) {
          this.selectedParentCategory = {
            id: result.id,
            ma: result.ma,
            ten: result.ten
          };
        }
      },
      () => {} // dismissed
    );
  }

  async validateItems(): Promise<void> {
    // Validate parent category
    if (!this.selectedParentCategory || !this.selectedParentCategory.id) {
      this.toastr.warning('Vui lòng chọn nhóm mặt hàng cha', 'Thiếu thông tin');
      return;
    }

    this.isProcessing = true;
    this.spinner.show(SpinnerType.Load);

    try {
      // Check for existing codes in the selected parent
      this.existingCodes = await this.excelService.checkExistingCodes(
        this.selectedParentCategory.id,
        this.parsedItems
      );

      // Move to preview step
      this.step = 3;
    } catch (error: any) {
      this.errorMessage = `Lỗi khi kiểm tra mã mặt hàng: ${error.message}`;
      console.error('Validation error:', error);
    } finally {
      this.isProcessing = false;
      this.spinner.hide(SpinnerType.Load);
    }
  }

  async importData(): Promise<void> {
    // Check for validation errors
    if (this.hasValidationErrors) {
      this.errorMessage = 'Không thể nhập dữ liệu có lỗi validation. Vui lòng sửa lại file Excel.';
      this.toastr.error('Không thể nhập dữ liệu có lỗi validation', 'Lỗi dữ liệu');
      return;
    }

    // Check for duplicates
    if (this.hasDuplicates) {
      this.errorMessage = 'Không thể nhập dữ liệu có mã trùng lặp. Vui lòng sửa lại file Excel.';
      this.toastr.error('Không thể nhập dữ liệu chứa mã trùng lặp', 'Lỗi dữ liệu');
      return;
    }

    // Ensure parent category is selected
    if (!this.selectedParentCategory || !this.selectedParentCategory.id) {
      this.toastr.warning('Vui lòng chọn nhóm mặt hàng cha', 'Thiếu thông tin');
      return;
    }

    // Filter out existing codes if needed
    if (this.existingCodes.size > 0) {
      const confirmImport = confirm(
        `Phát hiện ${this.existingCodes.size} mã hàng hóa đã tồn tại trong nhóm này. Bạn muốn tiếp tục nhập các mã chưa tồn tại?`
      );

      if (!confirmImport) {
        return;
      }

      // Filter out existing codes
      this.parsedItems = this.parsedItems.filter(item => !this.existingCodes.has(item.ma));

      if (this.parsedItems.length === 0) {
        this.toastr.info('Không có mục nào mới để nhập', 'Thông báo');
        return;
      }
    }

    this.isProcessing = true;
    this.spinner.show(SpinnerType.Save);

    try {
      // Create the import DTO
      const importDto: HHThiTruongBatchImportDto = {
        matHangChaId: this.selectedParentCategory.id,
        items: this.parsedItems
      };

      // Send to server
      const result = await this.excelService.sendToServer(importDto);

      this.isProcessing = false;
      this.spinner.hide(SpinnerType.Save);

      // Sửa phần này - kiểm tra statusCode thay vì success
      if (result && (result.statusCode === 200 || result.statusCode === 201)) {
        // Success
        this.step = 4;
        const itemCount = result.data?.length || this.parsedItems.length;
        this.toastr.success(`Đã nhập thành công ${itemCount} mặt hàng`, 'Nhập dữ liệu thành công');
      } else {
        // Error
        this.errorMessage = result?.message || 'Có lỗi khi import dữ liệu';
        this.toastr.error(this.errorMessage, 'Lỗi khi import dữ liệu');
      }
    } catch (error: any) {
      this.isProcessing = false;
      this.spinner.hide(SpinnerType.Save);

      this.errorMessage = 'Lỗi khi nhập dữ liệu: ' + (error.message || 'Không xác định');
      console.error('Import error:', error);
      this.toastr.error(this.errorMessage, 'Lỗi khi import dữ liệu');
    }
  }

  downloadTemplate(): void {
    try {
      this.excelService.generateTemplate();
    } catch (error) {
      console.error('Error generating template:', error);
      this.toastr.error('Không thể tạo file mẫu', 'Lỗi');
    }
  }

  close(): void {
    this.activeModal.close(this.step === 4);
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
    return this.existingCodes.has(itemCode);
  }

  hasRowErrors(rowIndex: number): boolean {
    return this.invalidRows.some(row => row.rowIndex === rowIndex);
  }

  getFieldErrorMessage(rowIndex: number, fieldName: string): string | null {
    const rowWithErrors = this.invalidRows.find(row => row.rowIndex === rowIndex);
    if (!rowWithErrors) return null;

    const fieldError = rowWithErrors.errors.find(err => err.field === fieldName);
    return fieldError ? fieldError.message : null;
  }

  getInvalidRowNumbers(): number[] {
    return this.invalidRows.map(row => row.rowIndex);
  }

  continueWithNonExisting(): void {
    // Filter out existing codes
    const originalCount = this.parsedItems.length;
    this.parsedItems = this.parsedItems.filter(item => !this.existingCodes.has(item.ma));

    if (this.parsedItems.length === 0) {
      this.toastr.info('Không có mục nào mới để nhập', 'Thông báo');
      return;
    }

    this.toastr.info(
      `Sẽ import ${this.parsedItems.length} mặt hàng mới (bỏ qua ${originalCount - this.parsedItems.length} mã đã tồn tại)`,
      'Tiếp tục import'
    );
  }

  goToStep(step: number): void {
    this.step = step;
  }

  clearParentCategory(): void {
    this.selectedParentCategory = null;
  }
}