import { DanhMucBase } from "../helpers/dm-base";

export interface DonViTinhCreateDto extends DanhMucBase{
    ma: string;
    ten: string;
    ghiChu?: string;
    ngayHieuLuc: string;
    ngayHetHieuLuc: string;
}