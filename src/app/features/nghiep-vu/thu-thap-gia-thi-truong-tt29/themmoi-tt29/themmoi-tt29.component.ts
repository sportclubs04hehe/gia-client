import { trigger, state, style, transition, animate } from "@angular/animations";
import { CommonModule } from "@angular/common";
import { Component, inject } from "@angular/core";
import { ReactiveFormsModule, FormsModule, Validators } from "@angular/forms";
import { NgbActiveModal, NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { finalize } from "rxjs";
import { DateInputComponent } from "../../../../shared/components/forms/date-input/date-input.component";
import { FormFooterComponent } from "../../../../shared/components/forms/form-footer/form-footer.component";
import { NhomhhModalComponent } from "../../../danhmuc/dm-hang-hoa-thi-truongs/nhomhh-modal/nhomhh-modal.component";
import { LoaiGiaDto } from "../../../danhmuc/models/dm-loai-gia/LoaiGiaDto";
import { Loai } from "../../../danhmuc/models/enum/loai";
import { ThuThapGiaChiTietCreateDto } from "../../models/thu-thap-gia-chi-tiet/ThuThapGiaChiTietCreateDto";
import { ChiTietGiaRow } from "../../models/thu-thap-gia-thi-truong-tt29/ChiTietGiaRow";
import { CreateThuThapGiaModel } from "../../models/thu-thap-gia-thi-truong-tt29/CreateThuThapGiaModel";
import { ThuThapGiaThiTruongTt29Service } from "../../services/api/thu-thap-gia-thi-truong-tt29.service";
import { ThemMoiGiaBaseComponent } from "../../../../shared/components/bases/them-moi-gia-base.component";
import { HHThiTruongTreeNodeDto } from "../../../danhmuc/models/dm-hh-thitruong/HHThiTruongTreeNodeDto";
import { TextHighlightPipe } from "../../../../shared/pipes/text-highlight.pipe";

@Component({
  selector: 'app-themmoi-tt29',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    DateInputComponent,
    FormFooterComponent,
    TextHighlightPipe,
  ],
  templateUrl: './themmoi-tt29.component.html',
  styleUrl: './themmoi-tt29.component.css',
  animations: [
    trigger('formVisibility', [
      state('expanded', style({
        height: '*',
        opacity: 1,
        visibility: 'visible',
        overflow: 'visible'
      })),
      state('collapsed', style({
        height: '0px',
        opacity: 0,
        visibility: 'hidden',
        overflow: 'hidden'
      })),
      transition('expanded <=> collapsed', [
        animate('300ms cubic-bezier(0.4, 0.0, 0.2, 1)')
      ])
    ])
  ]
})
export class ThemmoiTt29Component extends ThemMoiGiaBaseComponent {
  private activeModal = inject(NgbActiveModal);
  private thuThapGiaService = inject(ThuThapGiaThiTruongTt29Service);
  private modalService = inject(NgbModal);

  danhSachLoaiGia: LoaiGiaDto[] = [];
  selectedNhomHangHoa: { id: string, ten: string } | null = null;
  Loai = Loai;
  isFormExpanded = true;

  // Thêm các thuộc tính
  searchTerm = '';
  isSearching = false;
  searchTimeout: any;
  searchResults: HHThiTruongTreeNodeDto[] = [];
  originalChiTietGia: ChiTietGiaRow[] = []; // Để lưu danh sách gốc khi tìm kiếm

  override ngOnInit(): void {
    this.buildForm();
    this.loadLoaiGia();
    this.watchFormChanges();
  }

  protected buildForm(): void {
    const today = new Date();
    const currentDate = {
      year: today.getFullYear(),
      month: today.getMonth() + 1,
      day: today.getDate()
    };

    this.form = this.fb.group({
      loaiGiaId: ['', Validators.required],
      nhomHangHoaId: ['', Validators.required],
      ngayNhap: [currentDate, Validators.required],
      loaiNghiepVu: [0]
    });
  }

  private watchFormChanges(): void {
    this.form.get('ngayNhap')?.valueChanges.subscribe(() => {
      this.checkAndLoadData();
    });
  }

  private checkAndLoadData(): void {
    const nhomHangHoaId = this.form.get('nhomHangHoaId')?.value;
    const ngayNhap = this.form.get('ngayNhap')?.value;

    if (nhomHangHoaId && ngayNhap) {
      this.loadMatHangCon(nhomHangHoaId);
    }
  }

  loadMatHangCon(nhomHangHoaId: string): void {
  this.isLoadingMatHang = true;
  this.chiTietGia = [];
  this.originalChiTietGia = []; // Reset danh sách gốc
  this.searchTerm = ''; // Reset từ khóa tìm kiếm

  const ngayNhapValue = this.form.get('ngayNhap')?.value;
  let ngayNhapDate: Date | undefined;
  
  // Đảm bảo luôn có ngayNhap hợp lệ
  if (ngayNhapValue) {
    if (ngayNhapValue.year && ngayNhapValue.month && ngayNhapValue.day) {
      ngayNhapDate = new Date(
        ngayNhapValue.year,
        ngayNhapValue.month - 1,
        ngayNhapValue.day
      );
    } else if (ngayNhapValue instanceof Date) {
      ngayNhapDate = ngayNhapValue;
    }
  }

  // Chỉ gọi API nếu có ngayNhap hợp lệ
  if (ngayNhapDate) {
    this.thuThapGiaService.getAllChildrenRecursive(nhomHangHoaId, ngayNhapDate)
      .pipe(finalize(() => this.isLoadingMatHang = false))
      .subscribe({
        next: (matHangCon) => this.processMatHangConResponse(matHangCon),
        error: (error) => this.handleLoadError(error)
      });
  } else {
    this.isLoadingMatHang = false;
  }
}

  private convertNgbDateToJsDate(ngayNhapStruct: any): Date | undefined {
    if (!ngayNhapStruct) return undefined;

    if (ngayNhapStruct.year && ngayNhapStruct.month && ngayNhapStruct.day) {
      return new Date(
        ngayNhapStruct.year,
        ngayNhapStruct.month - 1,
        ngayNhapStruct.day
      );
    } else if (ngayNhapStruct instanceof Date) {
      return ngayNhapStruct;
    }

    return undefined;
  }

  private processMatHangConResponse(matHangCon: any[]): void {
    const danhSachMatHang = this.flattenHangHoaTree(matHangCon);
    this.mapToChiTietGia(danhSachMatHang);

    if (this.chiTietGia.length === 0) {
      this.toastr.info('Nhóm hàng hóa này không có mặt hàng con nào', 'Thông báo');
    }

    this.filteredChiTietGia = [...this.chiTietGia];
    this.applyFilter();
  }

  private mapToChiTietGia(danhSachMatHang: any[]): void {
    this.chiTietGia = danhSachMatHang.map(item => ({
      hangHoaThiTruongId: item.id,
      maHangHoa: item.ma,
      tenHangHoa: item.ten,
      dacTinh: item.dacTinh,
      donViTinh: item.tenDonViTinh || '',
      loaiMatHang: item.loaiMatHang,
      level: item.level || 0,
      giaPhoBienKyBaoCao: null,
      giaBinhQuanKyTruoc: item.giaBinhQuanKyTruoc || null,
      giaBinhQuanKyNay: null,
      mucTangGiamGiaBinhQuan: null,
      tyLeTangGiamGiaBinhQuan: null,
      nguonThongTin: null,
      ghiChu: null
    }));
  }

  private handleLoadError(error: any): void {
    console.error('Lỗi khi tải danh sách mặt hàng con:', error);
    this.toastr.error('Không thể tải danh sách mặt hàng con', 'Lỗi');
  }

  private flattenHangHoaTree(nodes: any[]): any[] {
    const result: any[] = [];

    const flatten = (items: any[], level: number = 0) => {
      for (const item of items) {
        result.push({ ...item, level });
        if (item.matHangCon?.length > 0) {
          flatten(item.matHangCon, level + 1);
        }
      }
    };

    flatten(nodes);
    return result;
  }

  openNhomHangHoaModal(): void {
    const modalRef = this.modalService.open(NhomhhModalComponent, {
      size: 'lg',
      backdrop: 'static'
    });

    modalRef.result.then((result: any) => {
      if (result) {
        this.selectedNhomHangHoa = { id: result.id, ten: result.ten };
        this.form.patchValue({ nhomHangHoaId: result.id });
        this.checkAndLoadData();
      }
    }).catch(() => { });
  }

  private loadLoaiGia(): void {
    this.thuThapGiaService.getLoaiGia().subscribe({
      next: (data) => this.danhSachLoaiGia = data,
      error: (error) => {
        console.error('Lỗi khi tải danh sách loại giá:', error);
        this.toastr.error('Không thể tải danh sách loại giá', 'Lỗi');
      }
    });
  }

  luu(): void {
    const data = this.prepareData();
    if (!data) return;

    this.isSaving = true;
    this.thuThapGiaService.create(data)
      .pipe(finalize(() => this.isSaving = false))
      .subscribe({
        next: (response) => this.handleSaveSuccess(response),
        error: (error) => console.error('Lỗi khi tạo phiếu thu thập giá:', error)
      });
  }

  private handleSaveSuccess(response: any): void {
    if (response?.data) {
      this.toastr.success('Thêm mới thành công', 'Thông báo');
      this.activeModal.close('saved');
    } else {
      console.error('Dữ liệu trả về không hợp lệ:', response);
    }
  }

  private prepareData(): CreateThuThapGiaModel | null {
    if (this.form.invalid) {
      this.markFormTouched();
      return null;
    }

    const validItems = this.getValidItems();
    if (validItems.length === 0) {
      this.toastr.warning('Vui lòng nhập giá cho ít nhất một mặt hàng', 'Thông báo');
      return null;
    }

    const thuThapGiaData = this.prepareFormData(['ngayNhap']);
    thuThapGiaData.nam = new Date().getFullYear();

    const chiTietGiaData = this.prepareChiTietData(validItems);

    return {
      thuThapGia: thuThapGiaData,
      chiTietGia: chiTietGiaData
    };
  }

  private getValidItems(): ChiTietGiaRow[] {
    return this.chiTietGia.filter(item =>
      item.loaiMatHang === Loai.Con && (
        (item.giaPhoBienKyBaoCao !== null && item.giaPhoBienKyBaoCao !== undefined && item.giaPhoBienKyBaoCao !== '') ||
        (item.giaBinhQuanKyNay !== null && item.giaBinhQuanKyNay !== undefined && item.giaBinhQuanKyNay !== '')
      )
    );
  }

  private prepareChiTietData(validItems: ChiTietGiaRow[]): ThuThapGiaChiTietCreateDto[] {
    return validItems.map(item => ({
      hangHoaThiTruongId: item.hangHoaThiTruongId,
      giaPhoBienKyBaoCao: item.giaPhoBienKyBaoCao ? item.giaPhoBienKyBaoCao.toString() : undefined,
      giaBinhQuanKyTruoc: this.numberFormatter.parseFormattedNumber(item.giaBinhQuanKyTruoc),
      giaBinhQuanKyNay: this.numberFormatter.parseFormattedNumber(item.giaBinhQuanKyNay),
      mucTangGiamGiaBinhQuan: this.nullToUndefined(item.mucTangGiamGiaBinhQuan),
      tyLeTangGiamGiaBinhQuan: this.nullToUndefined(item.tyLeTangGiamGiaBinhQuan),
      nguonThongTin: this.nullToUndefined(item.nguonThongTin),
      ghiChu: this.nullToUndefined(item.ghiChu)
    }));
  }

  huy(): void {
    this.activeModal.dismiss();
  }

  toggleForm(): void {
    this.isFormExpanded = !this.isFormExpanded;
  }

  // Phương thức tìm kiếm với debounce
  searchMatHang(searchTerm: string): void {
    this.searchTerm = searchTerm;

    // Clear timeout trước đó nếu có
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }

    // Không tìm kiếm nếu từ khóa quá ngắn
    if (!searchTerm || searchTerm.length < 2) {
      // Nếu xóa từ khóa, hiển thị lại tất cả mặt hàng
      if (this.originalChiTietGia.length > 0) {
        this.chiTietGia = [...this.originalChiTietGia];
        this.filteredChiTietGia = [...this.chiTietGia];
        this.applyFilter();
      }
      return;
    }

    // Thiết lập timeout để tránh gửi quá nhiều request
    this.searchTimeout = setTimeout(() => {
      const nhomHangHoaId = this.form.get('nhomHangHoaId')?.value;
      if (!nhomHangHoaId) {
        this.toastr.warning('Vui lòng chọn nhóm hàng hóa trước khi tìm kiếm', 'Thông báo');
        return;
      }

      // Lấy ngày nhập từ form
      const ngayNhapValue = this.form.get('ngayNhap')?.value;
      
      // Tạo đối tượng Date với giờ là 12:00:00 để tránh vấn đề múi giờ
      let ngayNhap: Date | undefined;
      if (ngayNhapValue && ngayNhapValue.year && ngayNhapValue.month && ngayNhapValue.day) {
        ngayNhap = new Date(
          ngayNhapValue.year, 
          ngayNhapValue.month - 1, 
          ngayNhapValue.day, 
          12, 0, 0
        ); 
      }

      this.isSearching = true;

      // Gọi service để tìm kiếm với ngayNhap
      this.thuThapGiaService.searchMatHang(nhomHangHoaId, searchTerm, ngayNhap)
        .pipe(finalize(() => this.isSearching = false))
        .subscribe({
          next: (results) => {
            this.handleSearchResults(results);
          },
          error: (error) => {
            console.error('Lỗi khi tìm kiếm mặt hàng:', error);
            this.toastr.error('Không thể tìm kiếm mặt hàng', 'Lỗi');
          }
        });
    }, 300); // 300ms debounce
  }

  // Xử lý kết quả tìm kiếm
  private handleSearchResults(results: HHThiTruongTreeNodeDto[]): void {
    this.searchResults = results;

    // Lưu danh sách gốc nếu chưa lưu
    if (this.originalChiTietGia.length === 0) {
      this.originalChiTietGia = [...this.chiTietGia];
    }

    if (results.length === 0) {
      // Không tìm thấy kết quả - hiển thị mảng rỗng
      this.filteredChiTietGia = [];
    } else {
      // Tìm thấy kết quả - cập nhật danh sách hiển thị nhưng giữ lại giá đã nhập
      const flattenedResults = this.flattenHangHoaTree(results);
      
      // Thay vì gọi mapToChiTietGia trực tiếp, gọi phương thức mới để giữ lại giá trị đã nhập
      this.mapToChiTietGiaWithPreservedValues(flattenedResults);
      
      this.filteredChiTietGia = [...this.chiTietGia];
      this.applyFilter();
    }
  }

  // Thêm phương thức mới để giữ lại giá trị đã nhập
  private mapToChiTietGiaWithPreservedValues(danhSachMatHang: any[]): void {
    // Tạo map để tra cứu nhanh giá trị đã nhập theo ID
    const existingValuesMap = new Map();
    
    // Lưu các giá trị đã nhập từ danh sách gốc
    if (this.originalChiTietGia.length > 0) {
      this.originalChiTietGia.forEach(item => {
        existingValuesMap.set(item.hangHoaThiTruongId, {
          giaPhoBienKyBaoCao: item.giaPhoBienKyBaoCao,
          giaBinhQuanKyNay: item.giaBinhQuanKyNay,
          mucTangGiamGiaBinhQuan: item.mucTangGiamGiaBinhQuan,
          tyLeTangGiamGiaBinhQuan: item.tyLeTangGiamGiaBinhQuan,
          nguonThongTin: item.nguonThongTin,
          ghiChu: item.ghiChu
        });
      });
    }

    // Tạo danh sách mới với giá trị được khôi phục từ danh sách gốc
    this.chiTietGia = danhSachMatHang.map(item => {
      const existingValues = existingValuesMap.get(item.id);
      
      return {
        hangHoaThiTruongId: item.id,
        maHangHoa: item.ma,
        tenHangHoa: item.ten,
        dacTinh: item.dacTinh,
        donViTinh: item.tenDonViTinh || '',
        loaiMatHang: item.loaiMatHang,
        level: item.level || 0,
        // Khôi phục giá trị đã nhập nếu có
        giaPhoBienKyBaoCao: existingValues?.giaPhoBienKyBaoCao ?? null,
        giaBinhQuanKyTruoc: item.giaBinhQuanKyTruoc || null,
        giaBinhQuanKyNay: existingValues?.giaBinhQuanKyNay ?? null,
        mucTangGiamGiaBinhQuan: existingValues?.mucTangGiamGiaBinhQuan ?? null,
        tyLeTangGiamGiaBinhQuan: existingValues?.tyLeTangGiamGiaBinhQuan ?? null,
        nguonThongTin: existingValues?.nguonThongTin ?? null,
        ghiChu: existingValues?.ghiChu ?? null
      };
    });
  }

  // Xóa tìm kiếm
  clearSearch(inputElement?: HTMLInputElement): void {
    // Xóa nội dung input nếu có
    if (inputElement) {
      inputElement.value = '';
    }

    this.searchTerm = '';
    this.searchResults = [];

    // Khôi phục danh sách gốc
    if (this.originalChiTietGia.length > 0) {
      this.chiTietGia = [...this.originalChiTietGia];
      this.filteredChiTietGia = [...this.chiTietGia];
      this.applyFilter();

      // Chỉ xóa danh sách gốc khi đã khôi phục xong
      this.originalChiTietGia = [];
    }
  }

  
}