import { Component, OnInit, inject } from "@angular/core";
import { FormBuilder } from "@angular/forms";
import { ToastrService } from "ngx-toastr";
import { Loai } from "../../../features/danhmuc/models/enum/loai";
import { ChiTietGiaRow } from "../../../features/nghiep-vu/models/thu-thap-gia-thi-truong-tt29/ChiTietGiaRow";
import { NumberFormatterService } from "../../../features/nghiep-vu/services/utils/number-formatter.service";
import { FormComponentBase } from "../forms/forms-base/forms-base.component";

@Component({ template: '' })
export abstract class ThemMoiGiaBaseComponent extends FormComponentBase implements OnInit {
    // Các trường dùng chung
    chiTietGia: ChiTietGiaRow[] = [];
    filteredChiTietGia: ChiTietGiaRow[] = [];
    isLoadingMatHang = false;
    isFilterEnabled = false;

    // Services
    protected numberFormatter = inject(NumberFormatterService);
    protected toastr = inject(ToastrService);

    constructor(protected override fb: FormBuilder) {
        super(fb);
    }
    
    ngOnInit(): void {
    }

    // Các phương thức xử lý input form
    onNumberInput(event: Event, item: ChiTietGiaRow, field: keyof ChiTietGiaRow): void {
        const input = event.target as HTMLInputElement;
        let rawValue = input.value;

        rawValue = rawValue.replace(/[^\d.]/g, '');
        const parts = rawValue.split('.');
        if (parts.length > 2) rawValue = parts[0] + '.' + parts[1];

        const formattedValue = this.numberFormatter.formatWithComma(rawValue);

        input.value = formattedValue;
        (item as any)[field] = formattedValue;

        if (field === 'giaBinhQuanKyNay') {
            this.tinhMucTangGiamTyLe(item);
        }
    }

    onPriceRangeInput(event: Event, item: ChiTietGiaRow): void {
        const input = event.target as HTMLInputElement;
        const formattedValue = this.numberFormatter.formatPriceRange(input.value);
        input.value = formattedValue;
        item.giaPhoBienKyBaoCao = formattedValue;
    }

    // Các phương thức tính toán để kế thừa
    protected tinhMucTangGiamTyLe(item: ChiTietGiaRow): void {
        const giaKyTruoc = this.numberFormatter.parseFormattedNumber(item.giaBinhQuanKyTruoc);
        const giaKyNay = this.numberFormatter.parseFormattedNumber(item.giaBinhQuanKyNay);

        if (!giaKyTruoc || giaKyTruoc === 0) {
            item.mucTangGiamGiaBinhQuan = null;
            item.tyLeTangGiamGiaBinhQuan = null;
            return;
        }

        if (giaKyNay !== undefined) {
            item.mucTangGiamGiaBinhQuan = giaKyNay - giaKyTruoc;
            item.tyLeTangGiamGiaBinhQuan = (item.mucTangGiamGiaBinhQuan / giaKyTruoc) * 100;
        } else {
            item.mucTangGiamGiaBinhQuan = null;
            item.tyLeTangGiamGiaBinhQuan = null;
        }

        if (this.isFilterEnabled) this.applyFilter();
    }

    // Các phương thức xử lý hiển thị để kế thừa
    protected applyFilter(): void {
        if (!this.isFilterEnabled) {
            this.filteredChiTietGia = [...this.chiTietGia];
            return;
        }

        const parentToKeep = new Set<string>();
        const itemsWithChange = this.findItemsWithChange(parentToKeep);
        const parentsToInclude = this.findParentsToInclude(parentToKeep);

        this.filteredChiTietGia = [...parentsToInclude, ...itemsWithChange]
            .sort((a, b) => a.maHangHoa.localeCompare(b.maHangHoa));
    }

    protected findItemsWithChange(parentToKeep: Set<string>): ChiTietGiaRow[] {
        return this.chiTietGia.filter(item => {
            if (item.loaiMatHang === Loai.Con &&
                item.mucTangGiamGiaBinhQuan !== null &&
                item.mucTangGiamGiaBinhQuan !== undefined) {
                this.markParentsToKeep(item, parentToKeep);
                return true;
            }
            return false;
        });
    }

    protected findParentsToInclude(parentToKeep: Set<string>): ChiTietGiaRow[] {
        return this.chiTietGia.filter(item =>
            item.loaiMatHang === Loai.Cha && parentToKeep.has(item.hangHoaThiTruongId)
        );
    }

    protected markParentsToKeep(item: ChiTietGiaRow, parentToKeep: Set<string>): void {
        let currentLevel = item.level;
        while (currentLevel > 0) {
            const parent = this.chiTietGia.find(p =>
                p.loaiMatHang === Loai.Cha &&
                p.level === currentLevel - 1 &&
                p.maHangHoa === item.maHangHoa.split('.').slice(0, currentLevel).join('.')
            );

            if (parent) parentToKeep.add(parent.hangHoaThiTruongId);
            currentLevel--;
        }
    }

    // Helper methods
    toggleFilter(): void {
        this.isFilterEnabled = !this.isFilterEnabled;
        this.applyFilter();
    }

    calculateIndent(level: number): string {
        const basePadding = 0.5;
        const indentStep = 1;
        return `${basePadding + (level * indentStep)}rem`;
    }

    protected nullToUndefined<T>(value: T | null): T | undefined {
        return value === null ? undefined : value;
    }
}