import { DanhMucBase } from '../helpers/dm-base';
import { Loai } from '../enum/loai';

export interface DmThuocTinhDto extends DanhMucBase {
  stt: string;
  ma: string;
  ten: string;
  loai: Loai;
  ghiChu?: string;
  dinhDang?: string;
  width?: string;
  congThuc?: string;
  canChinhCot?: string;
  ngayHieuLuc: string;
  ngayHetHieuLuc: string;
  thuocTinhChaId?: string;
  tenThuocTinhCha?: string;
  maThuocTinhCha?: string;
}