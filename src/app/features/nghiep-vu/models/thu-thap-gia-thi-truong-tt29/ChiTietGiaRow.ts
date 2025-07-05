import { Loai } from "../../../danhmuc/models/enum/loai";

export interface ChiTietGiaRow {
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