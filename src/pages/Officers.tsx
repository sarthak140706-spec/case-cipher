import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { MainLayout } from '@/components/layout/MainLayout';
import { DataTable } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import { InputField, SelectField } from '@/components/ui/FormField';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { z } from 'zod';

const officerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  rank: z.string().min(1, 'Rank is required'),
  badge_number: z.string().optional(),
  contact: z.string().optional(),
});

type OfficerFormData = z.infer<typeof officerSchema>;

interface Officer {
  id: string;
  name: string;
  rank: string;
  badge_number: string | null;
  contact: string | null;
  created_at: string;
}

const initialFormData: OfficerFormData = {
  name: '',
  rank: '',
  badge_number: '',
  contact: '',
};

const rankOptions = [
  { value: 'Officer', label: 'Officer' },
  { value: 'Detective', label: 'Detective' },
  { value: 'Sergeant', label: 'Sergeant' },
  { value: 'Lieutenant', label: 'Lieutenant' },
  { value: 'Captain', label: 'Captain' },
  { value: 'Chief', label: 'Chief' },
  { value: 'Forensic Analyst', label: 'Forensic Analyst' },
  { value: 'Lab Technician', label: 'Lab Technician' },
];

export default function Officers() {
  const { user } = useAuth();
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchValue, setSearchValue] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedOfficer, setSelectedOfficer] = useState<Officer | null>(null);
  const [formData, setFormData] = useState<OfficerFormData>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchOfficers();
  }, []);

  const fetchOfficers = async () => {
    try {
      const { data, error } = await supabase
        .from('officers')
        .select('*')
        .order('name');

      if (error) throw error;
      setOfficers(data || []);
    } catch (error) {
      toast.error('Failed to fetch officers');
    } finally {
      setLoading(false);
    }
  };

  const filteredOfficers = useMemo(() => {
    if (!searchValue) return officers;
    const search = searchValue.toLowerCase();
    return officers.filter(o =>
      o.name.toLowerCase().includes(search) ||
      o.rank.toLowerCase().includes(search) ||
      o.badge_number?.toLowerCase().includes(search)
    );
  }, [officers, searchValue]);

  const handleAdd = () => {
    setSelectedOfficer(null);
    setFormData(initialFormData);
    setErrors({});
    setIsModalOpen(true);
  };

  const handleEdit = (item: Officer) => {
    setSelectedOfficer(item);
    setFormData({
      name: item.name,
      rank: item.rank,
      badge_number: item.badge_number || '',
      contact: item.contact || '',
    });
    setErrors({});
    setIsModalOpen(true);
  };

  const handleDelete = (item: Officer) => {
    setSelectedOfficer(item);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedOfficer) return;
    try {
      const { error } = await supabase.from('officers').delete().eq('id', selectedOfficer.id);
      if (error) throw error;
      toast.success('Officer deleted successfully');
      fetchOfficers();
    } catch (error) {
      toast.error('Failed to delete officer');
    } finally {
      setIsDeleteModalOpen(false);
      setSelectedOfficer(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = officerSchema.safeParse(formData);
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
      const payload = {
        name: formData.name,
        rank: formData.rank,
        badge_number: formData.badge_number || null,
        contact: formData.contact || null,
      };

      if (selectedOfficer) {
        const { error } = await supabase.from('officers').update(payload).eq('id', selectedOfficer.id);
        if (error) throw error;
        toast.success('Officer updated successfully');
      } else {
        const { error } = await supabase.from('officers').insert([{ ...payload, user_id: user?.id }]);
        if (error) throw error;
        toast.success('Officer added successfully');
      }
      setIsModalOpen(false);
      fetchOfficers();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save officer');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    { key: 'name', header: 'Name' },
    { key: 'rank', header: 'Rank' },
    { key: 'badge_number', header: 'Badge #', render: (item: Officer) => item.badge_number || '-' },
    { key: 'contact', header: 'Contact', render: (item: Officer) => item.contact || '-' },
  ];

  return (
    <MainLayout>
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold text-foreground">Officer Records</h1>
          <p className="text-muted-foreground">Manage law enforcement personnel</p>
        </motion.div>

        <DataTable
          columns={columns}
          data={filteredOfficers}
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          searchPlaceholder="Search by name, rank, or badge number..."
          onAdd={handleAdd}
          addButtonLabel="Add Officer"
          onEdit={handleEdit}
          onDelete={handleDelete}
          loading={loading}
          emptyMessage="No officers found."
        />

        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={selectedOfficer ? 'Edit Officer' : 'Add Officer'} size="md">
          <form onSubmit={handleSubmit} className="space-y-4">
            <InputField
              label="Full Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              error={errors.name}
              required
              placeholder="Officer full name..."
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SelectField
                label="Rank"
                value={formData.rank}
                onChange={(e) => setFormData({ ...formData, rank: e.target.value })}
                options={rankOptions}
                error={errors.rank}
                required
              />
              <InputField
                label="Badge Number"
                value={formData.badge_number}
                onChange={(e) => setFormData({ ...formData, badge_number: e.target.value })}
                placeholder="Badge #..."
              />
            </div>

            <InputField
              label="Contact"
              value={formData.contact}
              onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
              placeholder="Phone or email..."
            />

            <div className="flex justify-end gap-3 pt-4">
              <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={submitting} className="btn-primary">
                {submitting ? 'Saving...' : selectedOfficer ? 'Update' : 'Add Officer'}
              </button>
            </div>
          </form>
        </Modal>

        <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Delete Officer" size="sm">
          <p className="text-muted-foreground mb-6">
            Are you sure you want to delete "{selectedOfficer?.name}"? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <button onClick={() => setIsDeleteModalOpen(false)} className="btn-secondary">Cancel</button>
            <button onClick={confirmDelete} className="btn-danger">Delete</button>
          </div>
        </Modal>
      </div>
    </MainLayout>
  );
}
