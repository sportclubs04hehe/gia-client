import { TableColumn } from "./table-column";

export interface SelectionModalOptions<T> {
    title: string;
    items: T[];
    columns: TableColumn<any>[];
    idField?: string;
    searchable?: boolean;
    searchPlaceholder?: string;
    noDataMessage?: string;
    loadingMessage?: string;
    selectedId?: string | null;
    searchFn?: (term: string) => void;
    clearSearchFn?: () => void;
  }