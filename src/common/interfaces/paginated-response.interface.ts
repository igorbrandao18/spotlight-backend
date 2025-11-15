/**
 * Standardized paginated response interface
 * Following rules.mdc Pattern 2: Professional Response Structure
 */
export interface PaginatedResponse<T> {
  content: T[];
  page: {
    size: number;
    number: number;
    totalElements: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

