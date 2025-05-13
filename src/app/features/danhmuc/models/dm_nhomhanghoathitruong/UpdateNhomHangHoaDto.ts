import { DanhMucBase } from "../dm-base";

export interface UpdateNhomHangHoaDto extends DanhMucBase {
  maNhom: string;
  tenNhom: string;
  ngayHieuLuc: Date;
  ngayHetHieuLuc: Date;
  ghiChu?: string;
  nhomChaId?: string;
}
