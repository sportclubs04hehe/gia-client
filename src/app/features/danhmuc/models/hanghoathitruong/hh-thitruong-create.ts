import { DanhMucBase } from "../dm-base";

export interface HangHoaCreateDto extends DanhMucBase {
    maMatHang: string;        
    tenMatHang: string;       
    ghiChu?: string;          
    ngayHieuLuc: string;      
    ngayHetHieuLuc: string;   
    nhomHangHoaId?: string;   
}