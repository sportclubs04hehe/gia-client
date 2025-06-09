import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';
import { DmHangHoaThiTruongService } from '../api/dm-hang-hoa-thi-truong.service';
import { HHThiTruongImportDto, HHThiTruongBatchImportDto } from '../../models/dm-hh-thitruong/HHThiTruongImportDto';
import { lastValueFrom } from 'rxjs';
import { Loai } from '../../models/enum/loai';
import { MultipleCodeValidationRequestDto } from '../../models/helpers/MultipleCodeValidationRequestDto';

export interface HHThiTruongExcelImportResult {
  items: HHThiTruongImportDto[];
  duplicates: { code: string; rows: number[] }[];
  invalidRows: {
    rowIndex: number;
    errors: {
      field: string;
      message: string;
    }[];
  }[];
}

@Injectable({
  providedIn: 'root'
})
export class HHThiTruongExcelImportService {
  constructor(
    private hhThiTruongService: DmHangHoaThiTruongService
  ) {}

  async importFromExcel(file: File): Promise<HHThiTruongExcelImportResult> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = async (e: any) => {
        try {
          const data = e.target.result;
          const wb: XLSX.WorkBook = XLSX.read(data, { type: 'array' });
          const wsname: string = wb.SheetNames[0];
          const ws: XLSX.WorkSheet = wb.Sheets[wsname];
          const jsonData = XLSX.utils.sheet_to_json(ws, { header: 1 });
          const headers = jsonData[0] as string[];

          this.validateHeaders(headers);
          
          // Map Excel rows to import DTOs
          const { importItems, duplicates, invalidRows } = this.processRows(jsonData, headers);
          
          resolve({
            items: importItems,
            duplicates,
            invalidRows
          });
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = (error) => {
        reject(error);
      };

      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Gửi dữ liệu đã xử lý lên server để import
   */
  async sendToServer(importDto: HHThiTruongBatchImportDto) {
    return lastValueFrom(this.hhThiTruongService.importFromExcel(importDto));
  }

/**
 * Kiểm tra mã đã tồn tại
 */
async checkExistingCodes(matHangChaId: string, items: HHThiTruongImportDto[]): Promise<Set<string>> {
  try {
    const codes = items
      .map(item => item.ma)
      .filter(code => code && code.trim().length > 0);
      
    if (codes.length === 0) {
      return new Set<string>();
    }
    
    const request: MultipleCodeValidationRequestDto = {
      codes: codes,
      parentId: matHangChaId
    };
    
    const existingCodesResponse = await lastValueFrom(
      this.hhThiTruongService.validateMultipleCodes(request)
    );
    
    const existingCodes = new Set<string>();
    
    if (existingCodesResponse?.data) {
      const invalidCodes = existingCodesResponse.data.filter(result => !result.isValid);
      invalidCodes.forEach(result => existingCodes.add(result.code));
    }
    
    return existingCodes;
  } catch (error) {
    console.error('Error checking existing codes:', error);
    return new Set<string>();
  }
}

  generateTemplate(): void {
    const ws: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet([
      ['ma', 'ten', 'donViTinhTen', 'dacTinh', 'ghiChu', 'ngayHieuLuc', 'ngayHetHieuLuc'],
      ['MH001', 'Áo thun nam', 'Cái', 'Đặc điểm kinh tế, kỹ thuật', 'Hàng nhập khẩu', '01/01/2025', '31/12/2025']
    ]);

    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');

    XLSX.writeFile(wb, 'mau-hang-hoa-import.xlsx');
  }

  private validateHeaders(headers: string[]): void {
    const requiredHeaders = ['ma', 'ten', 'donViTinhTen', 'ngayHieuLuc'];
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));

    if (missingHeaders.length > 0) {
      throw new Error(`Thiếu các cột bắt buộc: ${missingHeaders.join(', ')}`);
    }
  }

  private processRows(
    jsonData: any[], 
    headers: string[]
  ): {
    importItems: HHThiTruongImportDto[],
    duplicates: { code: string; rows: number[] }[],
    invalidRows: {
      rowIndex: number;
      errors: {
        field: string;
        message: string;
      }[];
    }[]
  } {
    const importItems: HHThiTruongImportDto[] = [];
    const codeMap = new Map<string, number[]>();
    const duplicates: { code: string; rows: number[] }[] = [];
    const invalidRows: {
      rowIndex: number;
      errors: {
        field: string;
        message: string;
      }[];
    }[] = [];
    
    // Skip header row (index 0)
    for (let i = 1; i < jsonData.length; i++) {
      const row = jsonData[i] as any[];
      
      // Skip empty rows
      if (!row || row.length === 0 || row.every(cell => cell === null || cell === undefined)) {
        continue;
      }
      
      const rowErrors: { field: string; message: string }[] = [];
      const importItem = this.mapRowToImportDto(row, headers);
      
      // Validate trường bắt buộc
      if (!importItem.ma || importItem.ma.trim() === '') {
        rowErrors.push({ field: 'ma', message: 'Mã mặt hàng là bắt buộc' });
      }
      
      if (!importItem.ten || importItem.ten.trim() === '') {
        rowErrors.push({ field: 'ten', message: 'Tên mặt hàng là bắt buộc' });
      }
      
      if (!importItem.donViTinhTen || importItem.donViTinhTen.trim() === '') {
        rowErrors.push({ field: 'donViTinhTen', message: 'Đơn vị tính là bắt buộc' });
      }
      
      // Có lỗi validation
      if (rowErrors.length > 0) {
        invalidRows.push({
          rowIndex: i + 1, // +1 vì Excel bắt đầu từ 1, không phải 0
          errors: rowErrors
        });
      }
      
      // Duplicate checking logic
      if (importItem.ma) {
        const code = importItem.ma;
        const rowNum = i + 1; 
        
        if (!codeMap.has(code)) {
          codeMap.set(code, [rowNum]);
        } else {
          const rows = codeMap.get(code)!;
          rows.push(rowNum);
          
          if (rows.length === 2) {
            duplicates.push({ code, rows: [...rows] });
          } else {
            const existingDup = duplicates.find(d => d.code === code);
            if (existingDup) {
              existingDup.rows = [...rows];
            }
          }
        }
      }
      
      // Thêm vào danh sách items
      importItems.push(importItem);
    }
    
    return { importItems, duplicates, invalidRows };
  }

  private mapRowToImportDto(row: any[], headers: string[]): HHThiTruongImportDto {
    const dto: HHThiTruongImportDto = {
      ma: '',
      ten: '',
      loaiMatHang: Loai.Con, // Mặc định là hàng hóa, không phải nhóm
      ngayHieuLuc: new Date(),
      ngayHetHieuLuc: new Date()
    };

    for (let j = 0; j < headers.length; j++) {
      const header = headers[j];
      const value = row[j];

      if (value !== undefined && value !== null) {
        switch (header) {
          case 'ma':
            dto.ma = String(value).trim();
            break;
          case 'ten':
            dto.ten = String(value).trim();
            break;
          case 'ghiChu':
            dto.ghiChu = String(value).trim();
            break;
          case 'dacTinh':
            dto.dacTinh = String(value).trim();
            break;
          case 'ngayHieuLuc':
            dto.ngayHieuLuc = this.parseExcelDate(value);
            break;
          case 'ngayHetHieuLuc':
            dto.ngayHetHieuLuc = this.parseExcelDate(value);
            break;
          case 'donViTinhTen':
            dto.donViTinhTen = String(value).trim();
            break;
        }
      }
    }

    return dto;
  }

  private parseExcelDate(value: any): Date | string {
    if (!value) return new Date();

    let date: Date;

    if (typeof value === 'number') {
      date = new Date(Math.round((value - 25569) * 86400 * 1000));
    }
    else if (typeof value === 'string') {
      const parts = value.split('/');
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = parseInt(parts[2], 10);
        date = new Date(year, month, day);
      } else {
        try {
          date = new Date(value);
        } catch (error) {
          return new Date();
        }
      }
    } else {
      try {
        date = new Date(value);
      } catch (error) {
        return new Date();
      }
    }

    if (isNaN(date.getTime())) {
      return new Date();
    }

    return date;
  }
}