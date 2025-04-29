export interface ApiError {
    statusCode: number;
    title: string;
    message: string;
    timestamp?: string;
    details?: string;
  }