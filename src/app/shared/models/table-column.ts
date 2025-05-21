export interface TableColumn<T> {
  header: string;
  field: keyof T;
  width?: string;
  renderer?: (item: any) => string; 
  formatter?: (item: T) => string;
  paddingFunction?: (item: T) => string;
  isButton?: boolean;
  buttonClass?: (item: T) => string;
  buttonIcon?: (item: T) => string;
  buttonText?: (item: T) => string;
  buttonClick?: (item: T) => void;
  truncateLength?: number;
  template?: any; 
}