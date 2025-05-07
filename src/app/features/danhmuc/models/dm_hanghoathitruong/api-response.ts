export interface ApiResponse<T> {
  data: T;
  errors: {
    invalidItems: string[];
    inserted: any[];
  } | null;
  statusCode: number;
  title: string;
  message: string;
  timestamp: string;
}
