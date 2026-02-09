import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Search, Plus, Trash2, Edit, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (item: T) => ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  onAdd?: () => void;
  addButtonLabel?: string;
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  onView?: (item: T) => void;
  loading?: boolean;
  emptyMessage?: string;
}

export function DataTable<T extends { id: string }>({
  columns,
  data,
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search...",
  onAdd,
  addButtonLabel = "Add New",
  onEdit,
  onDelete,
  onView,
  loading = false,
  emptyMessage = "No records found",
}: DataTableProps<T>) {
  const hasActions = onEdit || onDelete || onView;

  return (
    <div className="card-forensic">
      {/* Header */}
      <div className="p-4 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="input-forensic w-full pl-10"
          />
        </div>
        {onAdd && (
          <button onClick={onAdd} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            {addButtonLabel}
          </button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        {loading ? (
          <div className="p-8 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : data.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            {emptyMessage}
          </div>
        ) : (
          <table className="table-forensic">
            <thead>
              <tr>
                {columns.map((col) => (
                  <th key={String(col.key)} className={col.className}>
                    {col.header}
                  </th>
                ))}
                {hasActions && <th className="text-right">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {data.map((item, index) => (
                <motion.tr
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  {columns.map((col) => (
                    <td key={String(col.key)} className={col.className}>
                      {col.render
                        ? col.render(item)
                        : String((item as any)[col.key] ?? '')}
                    </td>
                  ))}
                  {hasActions && (
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {onView && (
                          <button
                            onClick={() => onView(item)}
                            className="p-2 hover:bg-muted rounded-md transition-colors text-muted-foreground hover:text-foreground"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        )}
                        {onEdit && (
                          <button
                            onClick={() => onEdit(item)}
                            className="p-2 hover:bg-muted rounded-md transition-colors text-muted-foreground hover:text-primary"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        )}
                        {onDelete && (
                          <button
                            onClick={() => onDelete(item)}
                            className="p-2 hover:bg-destructive/10 rounded-md transition-colors text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </motion.tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
