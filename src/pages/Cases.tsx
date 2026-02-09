import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { MainLayout } from '@/components/layout/MainLayout';
import { DataTable } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import { InputField, SelectField, TextareaField } from '@/components/ui/FormField';
import { Badge, getStatusVariant } from '@/components/ui/StatusBadge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { z } from 'zod';

const caseSchema = z.object({
  case_number: z.string().min(1, 'Case number is required'),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  date_opened: z.string().min(1, 'Date opened is required'),
  status: z.enum(['open', 'closed', 'pending', 'under_investigation']),
  location: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
});

type CaseFormData = z.infer<typeof caseSchema>;

interface Case {
  id: string;
  case_number: string;
  title: string;
  description: string | null;
  date_opened: string;
  date_closed: string | null;
  status: string;
  location: string | null;
  priority: string;
  created_at: string;
}

const initialFormData: CaseFormData = {
  case_number: '',
  title: '',
  description: '',
  date_opened: new Date().toISOString().split('T')[0],
  status: 'open',
  location: '',
  priority: 'medium',
};

export default function Cases() {
  const { user } = useAuth();
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchValue, setSearchValue] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [formData, setFormData] = useState<CaseFormData>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchCases();
  }, []);

  const fetchCases = async () => {
    try {
      const { data, error } = await supabase
        .from('cases')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCases(data || []);
    } catch (error) {
      toast.error('Failed to fetch cases');
    } finally {
      setLoading(false);
    }
  };

  const filteredCases = useMemo(() => {
    if (!searchValue) return cases;
    const search = searchValue.toLowerCase();
    return cases.filter(c => 
      c.case_number.toLowerCase().includes(search) ||
      c.title.toLowerCase().includes(search) ||
      c.location?.toLowerCase().includes(search)
    );
  }, [cases, searchValue]);

  const handleAdd = () => {
    setSelectedCase(null);
    setFormData(initialFormData);
    setErrors({});
    setIsModalOpen(true);
  };

  const handleEdit = (caseItem: Case) => {
    setSelectedCase(caseItem);
    setFormData({
      case_number: caseItem.case_number,
      title: caseItem.title,
      description: caseItem.description || '',
      date_opened: caseItem.date_opened,
      status: caseItem.status as CaseFormData['status'],
      location: caseItem.location || '',
      priority: caseItem.priority as CaseFormData['priority'],
    });
    setErrors({});
    setIsModalOpen(true);
  };

  const handleDelete = (caseItem: Case) => {
    setSelectedCase(caseItem);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedCase) return;
    try {
      const { error } = await supabase.from('cases').delete().eq('id', selectedCase.id);
      if (error) throw error;
      toast.success('Case deleted successfully');
      fetchCases();
    } catch (error) {
      toast.error('Failed to delete case');
    } finally {
      setIsDeleteModalOpen(false);
      setSelectedCase(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = caseSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);
    try {
      if (selectedCase) {
        const { error } = await supabase
          .from('cases')
          .update(formData)
          .eq('id', selectedCase.id);
        if (error) throw error;
        toast.success('Case updated successfully');
      } else {
        const insertData = {
          case_number: formData.case_number,
          title: formData.title,
          description: formData.description || null,
          date_opened: formData.date_opened,
          status: formData.status,
          location: formData.location || null,
          priority: formData.priority,
          user_id: user?.id as string,
        };
        const { error } = await supabase.from('cases').insert([insertData]);
        if (error) throw error;
        toast.success('Case created successfully');
      }
      setIsModalOpen(false);
      fetchCases();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save case');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    { key: 'case_number', header: 'Case #' },
    { key: 'title', header: 'Title' },
    {
      key: 'status',
      header: 'Status',
      render: (item: Case) => (
        <Badge variant={getStatusVariant(item.status)}>
          {item.status.replace('_', ' ')}
        </Badge>
      ),
    },
    {
      key: 'priority',
      header: 'Priority',
      render: (item: Case) => (
        <Badge variant={getStatusVariant(item.priority)}>
          {item.priority}
        </Badge>
      ),
    },
    { key: 'location', header: 'Location' },
    {
      key: 'date_opened',
      header: 'Date Opened',
      render: (item: Case) => format(new Date(item.date_opened), 'MMM d, yyyy'),
    },
  ];

  return (
    <MainLayout>
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold text-foreground">Case Management</h1>
          <p className="text-muted-foreground">Manage and track criminal cases</p>
        </motion.div>

        <DataTable
          columns={columns}
          data={filteredCases}
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          searchPlaceholder="Search by case number, title, or location..."
          onAdd={handleAdd}
          addButtonLabel="New Case"
          onEdit={handleEdit}
          onDelete={handleDelete}
          loading={loading}
          emptyMessage="No cases found. Create your first case to get started."
        />

        {/* Add/Edit Modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={selectedCase ? 'Edit Case' : 'New Case'}
          size="lg"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputField
                label="Case Number"
                value={formData.case_number}
                onChange={(e) => setFormData({ ...formData, case_number: e.target.value })}
                error={errors.case_number}
                required
                placeholder="CASE-2024-001"
              />
              <InputField
                label="Date Opened"
                type="date"
                value={formData.date_opened}
                onChange={(e) => setFormData({ ...formData, date_opened: e.target.value })}
                error={errors.date_opened}
                required
              />
            </div>
            
            <InputField
              label="Title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              error={errors.title}
              required
              placeholder="Case title..."
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SelectField
                label="Status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as CaseFormData['status'] })}
                options={[
                  { value: 'open', label: 'Open' },
                  { value: 'closed', label: 'Closed' },
                  { value: 'pending', label: 'Pending' },
                  { value: 'under_investigation', label: 'Under Investigation' },
                ]}
                required
              />
              <SelectField
                label="Priority"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as CaseFormData['priority'] })}
                options={[
                  { value: 'low', label: 'Low' },
                  { value: 'medium', label: 'Medium' },
                  { value: 'high', label: 'High' },
                  { value: 'critical', label: 'Critical' },
                ]}
                required
              />
            </div>

            <InputField
              label="Location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="Crime scene location..."
            />

            <TextareaField
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Case description and details..."
            />

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="btn-primary"
              >
                {submitting ? 'Saving...' : selectedCase ? 'Update Case' : 'Create Case'}
              </button>
            </div>
          </form>
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          title="Delete Case"
          size="sm"
        >
          <p className="text-muted-foreground mb-6">
            Are you sure you want to delete case "{selectedCase?.title}"? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setIsDeleteModalOpen(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button onClick={confirmDelete} className="btn-danger">
              Delete
            </button>
          </div>
        </Modal>
      </div>
    </MainLayout>
  );
}
