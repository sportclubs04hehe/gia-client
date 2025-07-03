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
import { DmHangHoaThiTruongService } from '../../../danhmuc/services/api/dm-hang-hoa-thi-truong.service';
import { Loai } from '../../../danhmuc/models/enum/loai';

interface ChiTietGiaRow {
  hangHoaThiTruongId: string;
  maHangHoa: string;
  tenHangHoa: string;
  dacTinh?: string;
  donViTinh: string;
   loaiMatHang: Loai;
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
  private dmHangHoaThiTruongService = inject(DmHangHoaThiTruongService);

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
  }

  /**
   * Khởi tạo form
   */
  protected buildForm(): void {
    this.form = this.fb.group({
      loaiGiaId: ['', Validators.required],
      nhomHangHoaId: [''],
      ngayNhap: [null],
      loaiNghiepVu: [0] // Mặc định là 0 = HH29
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

        // Tải danh sách mặt hàng con khi chọn nhóm hàng hóa
        this.loadMatHangCon(result.id);
      }
    }).catch(() => {
      // Modal dismissed
    });
  }

  /**
   * Tải danh sách mặt hàng con theo ID nhóm hàng hóa đã chọn
   */
  loadMatHangCon(nhomHangHoaId: string): void {
  this.isLoadingMatHang = true;
  this.chiTietGia = []; // Xóa dữ liệu cũ

  this.dmHangHoaThiTruongService.getAllChildrenRecursive(nhomHangHoaId)
    .pipe(finalize(() => this.isLoadingMatHang = false))
    .subscribe({
      next: (matHangCon) => {
        // Flatten cấu trúc cây để lấy tất cả mặt hàng con ở mọi cấp độ
        const danhSachMatHang = this.flattenHangHoaTree(matHangCon);

        this.chiTietGia = danhSachMatHang.map(item => ({
          hangHoaThiTruongId: item.id,
          maHangHoa: item.ma,
          tenHangHoa: item.ten,
          dacTinh: item.dacTinh,
          donViTinh: item.tenDonViTinh || '',
          loaiMatHang: item.loaiMatHang, 
          giaPhoBienKyBaoCao: null,
          giaBinhQuanKyTruoc: null,
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
      }
    });
}

  /**
   * Flatten cấu trúc cây thành danh sách phẳng
   */
  private flattenHangHoaTree(nodes: any[]): any[] {
    const result: any[] = [];
    
    const flatten = (items: any[]) => {
      for (const item of items) {
        result.push(item);
        
        if (item.matHangCon && item.matHangCon.length > 0) {
          flatten(item.matHangCon);
        }
      }
    };
    
    flatten(nodes);
    return result;
  }

  /**
   * Hàm kiểm tra chỉ cho phép nhập số và dấu chấm
   */
  onlyNumberKey(event: KeyboardEvent): boolean {
    // Cho phép các phím số (0-9) và dấu chấm (.)
    const charCode = event.which ? event.which : event.keyCode;
    if (charCode === 46) { // dấu chấm (.)
      // Kiểm tra xem đã có dấu chấm trong giá trị chưa
      const input = event.target as HTMLInputElement;
      if (input.value.includes('.')) {
        return false;
      }
      return true;
    }

    // Chỉ cho phép các ký tự số
    if (charCode > 31 && (charCode < 48 || charCode > 57)) {
      return false;
    }
    return true;
  }

  /**
   * Tính mức tăng giảm và tỷ lệ tăng giảm khi người dùng nhập giá
   */
  tinhMucTangGiamTyLe(item: ChiTietGiaRow): void {
    // Chuyển đổi giá trị string sang number trước khi tính toán
    const giaKyTruoc = item.giaBinhQuanKyTruoc ? parseFloat(item.giaBinhQuanKyTruoc.toString()) : 0;
    const giaKyNay = item.giaBinhQuanKyNay ? parseFloat(item.giaBinhQuanKyNay.toString()) : 0;

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

  // Chuẩn bị dữ liệu chi tiết giá - chỉ với các mặt hàng có nhập giá
  const chiTietGiaData: ThuThapGiaChiTietCreateDto[] = validItems.map(item => ({
    hangHoaThiTruongId: item.hangHoaThiTruongId,
    giaPhoBienKyBaoCao: item.giaPhoBienKyBaoCao ? parseFloat(item.giaPhoBienKyBaoCao.toString()) : undefined,
    giaBinhQuanKyTruoc: item.giaBinhQuanKyTruoc ? parseFloat(item.giaBinhQuanKyTruoc.toString()) : undefined,
    giaBinhQuanKyNay: item.giaBinhQuanKyNay ? parseFloat(item.giaBinhQuanKyNay.toString()) : undefined,
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
}
