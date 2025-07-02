import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})

export class CacheService {
  private cache = new Map<string, {data: any, timestamp: number}>();
  private readonly defaultExpirationTime = 5 * 60 * 1000; // 5 phút

  /**
   * Lưu dữ liệu vào cache
   */
  set(key: string, data: any, expirationTime: number = this.defaultExpirationTime): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now() + expirationTime
    });
  }

  /**
   * Lấy dữ liệu từ cache
   */
  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    // Kiểm tra dữ liệu tồn tại và chưa hết hạn
    if (item && item.timestamp > Date.now()) {
      return item.data as T;
    }
    
    // Xóa dữ liệu hết hạn nếu có
    if (item) {
      this.cache.delete(key);
    }
    
    return null;
  }

  /**
   * Xóa một key cụ thể khỏi cache
   */
  remove(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Xóa tất cả cache bắt đầu bằng prefix
   */
  removeByPrefix(prefix: string): void {
    this.cache.forEach((_, key) => {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    });
  }

  /**
   * Xóa toàn bộ cache
   */
  clear(): void {
    this.cache.clear();
  }
}