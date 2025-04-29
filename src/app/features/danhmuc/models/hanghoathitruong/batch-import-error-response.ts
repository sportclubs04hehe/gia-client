export interface BatchImportErrorResponse {
    data: null;
    errors: {
      invalidItems: string[];
      inserted: any[];
    };
    statusCode: number;
    title: string;
    message: string;
    timestamp: string;
  }