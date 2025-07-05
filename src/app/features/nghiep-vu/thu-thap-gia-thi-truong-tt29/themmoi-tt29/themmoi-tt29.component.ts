import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { trigger, state, style, animate, transition } from '@angular/animations';
import { FormComponentBase } from '../../../../shared/components/forms/forms-base/forms-base.component';
import { DateInputComponent } from '../../../../shared/components/forms/date-input/date-input.component';
import { FormFooterComponent } from '../../../../shared/components/forms/form-footer/form-footer.component';
import { ThuThapGiaThiTruongTt29Service } from '../../services/api/thu-thap-gia-thi-truong-tt29.service';
import { HHThiTruongDto } from '../../../danhmuc/models/dm-hh-thitruong/HHThiTruongDto';
import { LoaiGiaDto } from '../../../danhmuc/models/dm-loai-gia/LoaiGiaDto';
import { NhomhhModalComponent } from '../../../danhmuc/dm-hang-hoa-thi-truongs/nhomhh-modal/nhomhh-modal.component';
import { finalize } from 'rxjs';
import { CreateThuThapGiaModel } from '../../models/thu-thap-gia-thi-truong-tt29/CreateThuThapGiaModel';
import { ThuThapGiaChiTietCreateDto } from '../../models/thu-thap-gia-chi-tiet/ThuThapGiaChiTietCreateDto';
import { Loai } from '../../../danhmuc/models/enum/loai';

interface ChiTietGiaRow {
  hangHoaThiTruongId: string;
  maHangHoa: string;
  tenHangHoa: string;
  dacTinh?: string;
  donViTinh: string;
  loaiMatHang: Loai;
  level: number;
  giaPhoBienKyBaoCao?: string | number | null;
  giaBinhQuanKyTruoc?: string | number | null;
  giaBinhQuanKyNay?: string | number | null;
  mucTangGiamGiaBinhQuan?: number | null;
  tyLeTangGiamGiaBinhQuan?: number | null;
  nguonThongTin?: string | null;
  ghiChu?: string | null;
}

@Component({
  selector: 'app-themmoi-tt29',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    DateInputComponent,
    FormFooterComponent
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
export class ThemmoiTt29Component extends FormComponentBase implements OnInit {
  private activeModal = inject(NgbActiveModal);
  private thuThapGiaService = inject(ThuThapGiaThiTruongTt29Service);
  private modalService = inject(NgbModal);
  private toastr = inject(ToastrService);

  danhSachLoaiGia: LoaiGiaDto[] = [];
  danhSachHangHoaCon: HHThiTruongDto[] = [];
  selectedNhomHangHoa: { id: string, ten: string } | null = null;

  Loai = Loai;

  chiTietGia: ChiTietGiaRow[] = [];
  override isSaving = false;
  isLoadingMatHang = false;

  // Add this property to track form state
  isFormExpanded = true;

  constructor(protected override fb: FormBuilder) {
    super(fb);
    this.buildForm();
  }

  ngOnInit(): void {
    this.loadLoaiGia();

    // Theo dõi thay đổi của cả hai trường nhóm hàng hóa và ngày nhập
    this.form.get('ngayNhap')?.valueChanges.subscribe(() => {
      this.checkAndLoadData();
    });
  }

  /**
   * Khởi tạo form
   */
  protected buildForm(): void {

    const today = new Date();
    const currentDate = {
      year: today.getFullYear(),
      month: today.getMonth() + 1, // JavaScript month bắt đầu từ 0
      day: today.getDate()
    };

    this.form = this.fb.group({
      loaiGiaId: ['', Validators.required],
      nhomHangHoaId: ['', Validators.required],
      ngayNhap: [currentDate, Validators.required],
      loaiNghiepVu: [0]
    });
  }

  /**
   * Kiểm tra trạng thái lỗi của control
   */
  isControlInvalid(controlName: string): boolean {
    const control = this.form.get(controlName);
    return control ? control.invalid && (control.dirty || control.touched) : false;
  }

  /**
   * Mở modal chọn nhóm hàng hóa
   */
  openNhomHangHoaModal(): void {
    const modalRef = this.modalService.open(NhomhhModalComponent, {
      size: 'lg',
      backdrop: 'static'
    });

    modalRef.result.then((result: any) => {
      if (result) {
        this.selectedNhomHangHoa = {
          id: result.id,
          ten: result.ten
        };
        this.form.patchValue({ nhomHangHoaId: result.id });

        // Kiểm tra và tải dữ liệu nếu đủ điều kiện
        this.checkAndLoadData();
      }
    }).catch(() => {
      // Modal dismissed
    });
  }

  /**
   * Kiểm tra xem cả hai trường nhóm hàng hóa và ngày nhập đã được chọn chưa
   * Nếu đã chọn cả hai, gọi API để tải danh sách mặt hàng và giá kỳ trước
   */
  private checkAndLoadData(): void {
    const nhomHangHoaId = this.form.get('nhomHangHoaId')?.value;
    const ngayNhap = this.form.get('ngayNhap')?.value;

    // Chỉ tải dữ liệu khi cả hai đã được chọn
    if (nhomHangHoaId && ngayNhap) {
      this.loadMatHangCon(nhomHangHoaId);
    }
  }

  loadMatHangCon(nhomHangHoaId: string): void {
    this.isLoadingMatHang = true;
    this.chiTietGia = [];

    const ngayNhapStruct = this.form.get('ngayNhap')?.value;

    let ngayNhapDate: Date | undefined = undefined;
    if (ngayNhapStruct) {
      if (ngayNhapStruct.year && ngayNhapStruct.month && ngayNhapStruct.day) {
        ngayNhapDate = new Date(
          ngayNhapStruct.year,
          ngayNhapStruct.month - 1,
          ngayNhapStruct.day
        );
      } else if (ngayNhapStruct instanceof Date) {
        ngayNhapDate = ngayNhapStruct;
      }
    }

    this.thuThapGiaService.getAllChildrenRecursive(nhomHangHoaId, ngayNhapDate)
      .pipe(finalize(() => this.isLoadingMatHang = false))
      .subscribe({
        next: (matHangCon) => {
          const danhSachMatHang = this.flattenHangHoaTree(matHangCon);

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

          if (this.chiTietGia.length === 0) {
            this.toastr.info('Nhóm hàng hóa này không có mặt hàng con nào', 'Thông báo');
          }
        },
        error: (error) => {
          console.error('Lỗi khi tải danh sách mặt hàng con:', error);
          this.toastr.error('Không thể tải danh sách mặt hàng con', 'Lỗi');
        }
      });
  }

  /**
 * Flatten cấu trúc cây thành danh sách phẳng với thông tin cấp độ
 */
  private flattenHangHoaTree(nodes: any[]): any[] {
    const result: any[] = [];

    const flatten = (items: any[], level: number = 0) => {
      for (const item of items) {
        // Thêm thuộc tính level vào item
        const itemWithLevel = { ...item, level };
        result.push(itemWithLevel);

        if (item.matHangCon && item.matHangCon.length > 0) {
          flatten(item.matHangCon, level + 1);
        }
      }
    };

    flatten(nodes);
    return result;
  }

  /**
   * Hàm xử lý input cho các ô nhập giá số (có format dấu phẩy)
   */
  onNumberInput(event: Event, item: ChiTietGiaRow, field: keyof ChiTietGiaRow): void {
    const input = event.target as HTMLInputElement;
    let rawValue = input.value;

    // Chỉ cho phép số và dấu chấm thập phân
    rawValue = rawValue.replace(/[^\d.]/g, '');

    // Chỉ cho phép một dấu chấm thập phân
    const parts = rawValue.split('.');
    if (parts.length > 2) {
      rawValue = parts[0] + '.' + parts[1];
    }

    // Format với dấu phẩy phân cách hàng nghìn
    const formattedValue = this.formatNumberWithComma(rawValue);

    // Cập nhật giá trị hiển thị
    input.value = formattedValue;
    (item as any)[field] = formattedValue;

    // Tính toán lại nếu là các trường giá
    if (field === 'giaBinhQuanKyTruoc' || field === 'giaBinhQuanKyNay') {
      this.tinhMucTangGiamTyLe(item);
    }
  }

  /**
   * Format số với dấu phẩy phân cách hàng nghìn
   */
  formatNumberWithComma(value: string): string {
    if (!value) return '';

    // Tách phần nguyên và phần thập phân
    const parts = value.split('.');
    const integerPart = parts[0];
    const decimalPart = parts[1];

    // Format phần nguyên với dấu phẩy
    const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

    // Ghép lại với phần thập phân nếu có
    return decimalPart !== undefined ? `${formattedInteger}.${decimalPart}` : formattedInteger;
  }

  /**
   * Loại bỏ dấu phẩy và chuyển về số
   */
  parseFormattedNumber(value: string | number | null | undefined): number | undefined {
    if (value === null || value === undefined || value === '') {
      return undefined;
    }

    const stringValue = value.toString().replace(/,/g, '');
    const numericValue = parseFloat(stringValue);

    return isNaN(numericValue) ? undefined : numericValue;
  }

  onPriceRangeInput(event: Event, item: ChiTietGiaRow): void {
    const input = event.target as HTMLInputElement;
    const rawValue = input.value;

    // Tách các phần bởi dấu "-"
    const parts = rawValue.split('-').map(part =>
      part.replace(/[^\d]/g, '') // loại bỏ ký tự không phải số
    );

    // Định dạng từng phần
    const formattedParts = parts.map(part =>
      part ? this.formatNumberWithComma(part) : ''
    );

    // Gộp lại chuỗi đã định dạng
    const formattedValue = formattedParts.join('-');

    // Cập nhật lại ô input
    input.value = formattedValue;
    item.giaPhoBienKyBaoCao = formattedValue;
  }

  /**
   * Tính mức tăng giảm và tỷ lệ tăng giảm khi người dùng nhập giá
   */
  tinhMucTangGiamTyLe(item: ChiTietGiaRow): void {
    // Sử dụng hàm parseFormattedNumber để chuyển đổi giá trị có format
    const giaKyTruoc = this.parseFormattedNumber(item.giaBinhQuanKyTruoc) || 0;
    const giaKyNay = this.parseFormattedNumber(item.giaBinhQuanKyNay) || 0;

    if (giaKyTruoc !== 0 || giaKyNay !== 0) {
      // Tính mức tăng giảm = giá kỳ này - giá kỳ trước
      item.mucTangGiamGiaBinhQuan = giaKyNay - giaKyTruoc;

      // Tính tỷ lệ tăng giảm = (mức tăng giảm / giá kỳ trước) * 100
      if (giaKyTruoc !== 0) {
        item.tyLeTangGiamGiaBinhQuan = (item.mucTangGiamGiaBinhQuan / giaKyTruoc) * 100;
      } else {
        item.tyLeTangGiamGiaBinhQuan = 0;
      }
    }
  }

  /**
   * Load danh sách loại giá
   */
  private loadLoaiGia(): void {
    this.thuThapGiaService.getLoaiGia().subscribe({
      next: (data) => {
        this.danhSachLoaiGia = data;
      },
      error: (error) => {
        console.error('Lỗi khi tải danh sách loại giá:', error);
        this.toastr.error('Không thể tải danh sách loại giá', 'Lỗi');
      }
    });
  }

  private prepareData(): CreateThuThapGiaModel | null {
    if (this.form.invalid) {
      this.markFormTouched();
      return null;
    }

    // Lọc chỉ lấy những mặt hàng loại Con có nhập ít nhất một giá 
    const validItems = this.chiTietGia.filter(item =>
      item.loaiMatHang === Loai.Con && // Chỉ lấy loại Con
      ((item.giaPhoBienKyBaoCao !== null && item.giaPhoBienKyBaoCao !== undefined && item.giaPhoBienKyBaoCao !== '') ||
        (item.giaBinhQuanKyNay !== null && item.giaBinhQuanKyNay !== undefined && item.giaBinhQuanKyNay !== ''))
    );

    if (validItems.length === 0) {
      this.toastr.warning('Vui lòng nhập giá cho ít nhất một mặt hàng', 'Thông báo');
      return null;
    }

    // Chuẩn bị dữ liệu thu thập giá
    const dateFields = ['ngayNhap'];
    const thuThapGiaData = this.prepareFormData(dateFields);

    // Thêm trường năm
    const currentYear = new Date().getFullYear();
    thuThapGiaData.nam = currentYear;

    // Chuẩn bị dữ liệu chi tiết giá
    const chiTietGiaData: ThuThapGiaChiTietCreateDto[] = validItems.map(item => ({
      hangHoaThiTruongId: item.hangHoaThiTruongId,
      giaPhoBienKyBaoCao: item.giaPhoBienKyBaoCao ? item.giaPhoBienKyBaoCao.toString() : undefined, // Giữ dấu phẩy
      giaBinhQuanKyTruoc: this.parseFormattedNumber(item.giaBinhQuanKyTruoc), // Bỏ dấu phẩy
      giaBinhQuanKyNay: this.parseFormattedNumber(item.giaBinhQuanKyNay), // Bỏ dấu phẩy
      mucTangGiamGiaBinhQuan: this.nullToUndefined(item.mucTangGiamGiaBinhQuan),
      tyLeTangGiamGiaBinhQuan: this.nullToUndefined(item.tyLeTangGiamGiaBinhQuan),
      nguonThongTin: this.nullToUndefined(item.nguonThongTin),
      ghiChu: this.nullToUndefined(item.ghiChu)
    }));

    return {
      thuThapGia: thuThapGiaData,
      chiTietGia: chiTietGiaData
    };
  }

  private nullToUndefined<T>(value: T | null): T | undefined {
    return value === null ? undefined : value;
  }

  /**
   * Lưu phiếu thu thập giá
   */
  luu(): void {
    const data = this.prepareData();
    if (!data) return;

    this.isSaving = true;
    this.thuThapGiaService.create(data)
      .pipe(finalize(() => this.isSaving = false))
      .subscribe({
        next: (response) => {
          if (response && response.data) {
            this.toastr.success('Thêm mới thành công', 'Thông báo');
            this.activeModal.close('saved');
          } else {
            console.error('Dữ liệu trả về không hợp lệ:', response);
          }
        },
        error: (error) => {
          console.error('Lỗi khi tạo phiếu thu thập giá:', error);
        }
      });
  }

  /**
   * Hủy thêm mới và đóng modal
   */
  huy(): void {
    this.activeModal.dismiss();
  }

  /**
   * Toggle form visibility
   */
  toggleForm(): void {
    this.isFormExpanded = !this.isFormExpanded;
  }

  /**
   * Calculate indentation padding based on level
   */
  calculateIndent(level: number): string {
    const basePadding = 0.5;  // Base padding in rem
    const indentStep = 1;     // Increment per level in rem
    return `${basePadding + (level * indentStep)}rem`;
  }

}