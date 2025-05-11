import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';
import { lastValueFrom } from 'rxjs';
import { HangHoaImportDto } from '../../models/dm_hanghoathitruong/hanghoa-import.dto';
import { DmThitruongService } from '../api/dm-thitruong.service';
import { ExcelImportResult } from '../../models/dm_hanghoathitruong/excel-import-result';


@Injectable({
  providedIn: 'root'
})
export class HHThiTruongExcelImportService {
  constructor(
    private thitruongService: DmThitruongService
  ) {}

  async importHangHoaFromExcel(file: File): Promise<ExcelImportResult> {
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

          // Extract unique đơn vị tính names
          const donViTinhNames = this.extractUniqueUnitNames(jsonData, headers);
          
          // Map Excel rows to HangHoa import DTOs
          const { importItems, duplicates, invalidRows } = this.processHangHoaRows(jsonData, headers);
          
          resolve({
            items: importItems,
            duplicates,
            uniqueDonViTinhNames: Array.from(donViTinhNames),
            invalidRows // Add this line to include invalidRows in the result
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
  async sendToServer(importDtos: HangHoaImportDto[]) {
    return lastValueFrom(this.thitruongService.importFromExcel(importDtos));
  }

  /**
   * Extract all unique đơn vị tính names from Excel data
   */
  private extractUniqueUnitNames(jsonData: any[], headers: string[]): Set<string> {
    const donViTinhNames = new Set<string>();
    const donViTinhIndex = headers.indexOf('donViTinh');
    
    if (donViTinhIndex === -1) return donViTinhNames;
    
    // Skip header row (index 0)
    for (let i = 1; i < jsonData.length; i++) {
      const row = jsonData[i] as any[];
      
      // Skip empty rows
      if (row.length === 0 || row.every(cell => cell === null || cell === undefined)) {
        continue;
      }
      
      // Add non-empty unit names to the set
      if (row[donViTinhIndex]) {
        donViTinhNames.add(String(row[donViTinhIndex]).trim());
      }
    }
    
    return donViTinhNames;
  }

  /**
   * Process Excel rows to create HangHoa import DTOs and detect duplicates
   */
  private processHangHoaRows(
    jsonData: any[], 
    headers: string[]
  ): {
    importItems: HangHoaImportDto[],
    duplicates: { code: string; rows: number[] }[],
    invalidRows: {
      rowIndex: number;
      errors: {
        field: string;
        message: string;
      }[];
    }[]
  } {
    const importItems: HangHoaImportDto[] = [];
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
      if (row.length === 0 || row.every(cell => cell === null || cell === undefined)) {
        continue;
      }
      
      const rowErrors: { field: string; message: string }[] = [];
      const importItem = this.mapRowToImportDto(row, headers);
      
      // Validate trường bắt buộc
      if (!importItem.maMatHang || importItem.maMatHang.trim() === '') {
        rowErrors.push({ field: 'maMatHang', message: 'Mã mặt hàng là bắt buộc' });
      }
      
      if (!importItem.tenMatHang || importItem.tenMatHang.trim() === '') {
        rowErrors.push({ field: 'tenMatHang', message: 'Tên mặt hàng là bắt buộc' });
      }
      
      if (!importItem.donViTinhTen || importItem.donViTinhTen.trim() === '') {
        rowErrors.push({ field: 'donViTinh', message: 'Đơn vị tính là bắt buộc' });
      }
      
      // Có lỗi validation
      if (rowErrors.length > 0) {
        invalidRows.push({
          rowIndex: i + 1, // +1 vì Excel bắt đầu từ 1, không phải 0
          errors: rowErrors
        });
      }
      
      // Duplicate checking logic
      if (importItem.maMatHang) {
        const code = importItem.maMatHang;
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
      
      // Vẫn thêm vào danh sách items để hiển thị trong bảng preview
      importItems.push(importItem);
    }
    
    return { importItems, duplicates, invalidRows };
  }

  generateTemplate(): void {
    const ws: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet([
      ['maMatHang', 'tenMatHang', 'donViTinh', 'ghiChu','dacTinh', 'ngayHieuLuc', 'ngayHetHieuLuc'],
      ['MH001', 'Áo thun nam', 'Cái', 'Hàng nhập khẩu','Đặc điểm kinh tế, kỹ thuật, quy cách', '01/01/2025', '31/12/2025']
    ]);

    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');

    XLSX.writeFile(wb, 'mau-hang-hoa-tt29.xlsx');
  }

  private validateHeaders(headers: string[]): void {
    const requiredHeaders = ['maMatHang', 'tenMatHang', 'ngayHieuLuc', 'donViTinh'];
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));

    if (missingHeaders.length > 0) {
      throw new Error(`Thiếu các cột bắt buộc: ${missingHeaders.join(', ')}`);
    }
  }
  //ghiChu
  private mapRowToImportDto(row: any[], headers: string[]): HangHoaImportDto {
    const dto: HangHoaImportDto = {
      maMatHang: '',
      tenMatHang: '',
      donViTinhTen: '',
      ngayHieuLuc: new Date(),
      ngayHetHieuLuc: new Date()
    };

    for (let j = 0; j < headers.length; j++) {
      const header = headers[j];
      const value = row[j];

      if (value !== undefined && value !== null) {
        switch (header) {
          case 'maMatHang':
            dto.maMatHang = String(value).trim();
            break;
          case 'tenMatHang':
            dto.tenMatHang = String(value).trim();
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
          case 'donViTinh':
            dto.donViTinhTen = String(value).trim();
            break;
          case 'nhomHangHoaMa':
            if (value) dto.nhomHangHoaMa = String(value).trim();
            break;
        }
      }
    }

    return dto;
  }

  private parseExcelDate(value: any): Date {
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

  // Thêm phương thức mới để kiểm tra mã đã tồn tại
  async checkExistingCodes(importItems: HangHoaImportDto[]): Promise<Set<string>> {
    try {
      // Lấy tất cả mã mặt hàng không rỗng từ danh sách
      const maCodes = importItems
        .map(item => item.maMatHang)
        .filter(code => code && code.trim().length > 0);
        
      if (maCodes.length === 0) {
        return new Set<string>();
      }
      
      // Gọi API để kiểm tra mã đã tồn tại
      const existingCodesMap = await lastValueFrom(this.thitruongService.checkExistingCodes(maCodes));
      
      // Tạo Set chứa các mã đã tồn tại
      const existingCodes = new Set<string>();
      
      Object.entries(existingCodesMap).forEach(([code, exists]) => {
        if (exists) {
          existingCodes.add(code);
        }
      });
      
      return existingCodes;
    } catch (error) {
      console.error('Error checking existing codes:', error);
      return new Set<string>();
    }
  }
}
