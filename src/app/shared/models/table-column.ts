export interface TableColumn<T> {
  header: string;
  field: string;  
  width?: string;
  template?: string;
  formatter?: (item: T) => string;
  truncateLength?: number;
}