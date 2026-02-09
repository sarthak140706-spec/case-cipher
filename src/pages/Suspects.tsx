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
import { z } from 'zod';

const suspectSchema = z.object({
  case_id: z.string().min(1, 'Case is required'),
  name: z.string().min(1, 'Name is required'),
  age: z.number().min(0).max(150).optional().nullable(),
  gender: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(['suspect', 'person_of_interest', 'cleared', 'arrested']),
});

type SuspectFormData = {
  case_id: string;
  name: string;
  age: string;
  gender: string;
  address: string;
  phone: string;
  description: string;
  status: 'suspect' | 'person_of_interest' | 'cleared' | 'arrested';
};

interface Suspect {
  id: string;
  case_id: string;
  name: string;
  age: number | null;
  gender: string | null;
  address: string | null;
  phone: string | null;
  description: string | null;
  status: string;
  created_at: string;
  cases?: { case_number: string; title: string };
}

interface Case {
  id: string;
  case_number: string;
  title: string;
}

const initialFormData: SuspectFormData = {
  case_id: '',
  name: '',
  age: '',
  gender: '',
  address: '',
  phone: '',
  description: '',
  status: 'suspect',
};

export default function Suspects() {
  const { user } = useAuth();
  const [suspects, setSuspects] = useState<Suspect[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchValue, setSearchValue] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedSuspect, setSelectedSuspect] = useState<Suspect | null>(null);
  const [formData, setFormData] = useState<SuspectFormData>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [suspectsRes, casesRes] = await Promise.all([
        supabase.from('suspects').select('*, cases(case_number, title)').order('created_at', { ascending: false }),
        supabase.from('cases').select('id, case_number, title').order('case_number'),
      ]);

      if (suspectsRes.error) throw suspectsRes.error;
      if (casesRes.error) throw casesRes.error;

      setSuspects(suspectsRes.data || []);
      setCases(casesRes.data || []);
    } catch (error) {
      toast.error('Failed to fetch suspects');
    } finally {
      setLoading(false);
    }
  };

  const filteredSuspects = useMemo(() => {
    if (!searchValue) return suspects;
    const search = searchValue.toLowerCase();
    return suspects.filter(s =>
      s.name.toLowerCase().includes(search) ||
      s.cases?.case_number.toLowerCase().includes(search) ||
      s.address?.toLowerCase().includes(search)
    );
  }, [suspects, searchValue]);

  const handleAdd = () => {
    setSelectedSuspect(null);
    setFormData(initialFormData);
    setErrors({});
    setIsModalOpen(true);
  };

  const handleEdit = (item: Suspect) => {
    setSelectedSuspect(item);
    setFormData({
      case_id: item.case_id,
      name: item.name,
      age: item.age?.toString() || '',
      gender: item.gender || '',
      address: item.address || '',
      phone: item.phone || '',
      description: item.description || '',
      status: item.status as SuspectFormData['status'],
    });
    setErrors({});
    setIsModalOpen(true);
  };

  const handleDelete = (item: Suspect) => {
    setSelectedSuspect(item);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedSuspect) return;
    try {
      const { error } = await supabase.from('suspects').delete().eq('id', selectedSuspect.id);
      if (error) throw error;
      toast.success('Suspect deleted successfully');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete suspect');
    } finally {
      setIsDeleteModalOpen(false);
      setSelectedSuspect(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const dataToValidate = {
      ...formData,
      age: formData.age ? parseInt(formData.age) : null,
    };

    const result = suspectSchema.safeParse(dataToValidate);
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
        case_id: formData.case_id,
        name: formData.name,
        age: formData.age ? parseInt(formData.age) : null,
        gender: formData.gender || null,
        address: formData.address || null,
        phone: formData.phone || null,
        description: formData.description || null,
        status: formData.status,
      };

      if (selectedSuspect) {
        const { error } = await supabase.from('suspects').update(payload).eq('id', selectedSuspect.id);
        if (error) throw error;
        toast.success('Suspect updated successfully');
      } else {
        const { error } = await supabase.from('suspects').insert([{ ...payload, user_id: user?.id }]);
        if (error) throw error;
        toast.success('Suspect added successfully');
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save suspect');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    { key: 'name', header: 'Name' },
    { key: 'age', header: 'Age', render: (item: Suspect) => item.age || '-' },
    { key: 'gender', header: 'Gender', render: (item: Suspect) => item.gender || '-' },
    { key: 'case', header: 'Case', render: (item: Suspect) => item.cases?.case_number || '-' },
    { key: 'status', header: 'Status', render: (item: Suspect) => (
      <Badge variant={getStatusVariant(item.status)}>{item.status.replace('_', ' ')}</Badge>
    )},
    { key: 'phone', header: 'Contact', render: (item: Suspect) => item.phone || '-' },
  ];

  return (
    <MainLayout>
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold text-foreground">Suspect Management</h1>
          <p className="text-muted-foreground">Manage suspects and persons of interest</p>
        </motion.div>

        <DataTable
          columns={columns}
          data={filteredSuspects}
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          searchPlaceholder="Search by name, case, or address..."
          onAdd={handleAdd}
          addButtonLabel="Add Suspect"
          onEdit={handleEdit}
          onDelete={handleDelete}
          loading={loading}
          emptyMessage="No suspects found."
        />

        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={selectedSuspect ? 'Edit Suspect' : 'Add Suspect'} size="lg">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputField
                label="Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                error={errors.name}
                required
                placeholder="Full name..."
              />
              <SelectField
                label="Case"
                value={formData.case_id}
                onChange={(e) => setFormData({ ...formData, case_id: e.target.value })}
                options={cases.map(c => ({ value: c.id, label: `${c.case_number} - ${c.title}` }))}
                error={errors.case_id}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <InputField
                label="Age"
                type="number"
                value={formData.age}
                onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                error={errors.age}
                placeholder="Age"
              />
              <SelectField
                label="Gender"
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                options={[
                  { value: 'male', label: 'Male' },
                  { value: 'female', label: 'Female' },
                  { value: 'other', label: 'Other' },
                ]}
              />
              <SelectField
                label="Status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as SuspectFormData['status'] })}
                options={[
                  { value: 'suspect', label: 'Suspect' },
                  { value: 'person_of_interest', label: 'Person of Interest' },
                  { value: 'cleared', label: 'Cleared' },
                  { value: 'arrested', label: 'Arrested' },
                ]}
                required
              />
            </div>

            <InputField
              label="Phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="Contact number..."
            />

            <InputField
              label="Address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Last known address..."
            />

            <TextareaField
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Physical description and notes..."
            />

            <div className="flex justify-end gap-3 pt-4">
              <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={submitting} className="btn-primary">
                {submitting ? 'Saving...' : selectedSuspect ? 'Update' : 'Add Suspect'}
              </button>
            </div>
          </form>
        </Modal>

        <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Delete Suspect" size="sm">
          <p className="text-muted-foreground mb-6">
            Are you sure you want to delete "{selectedSuspect?.name}"? This action cannot be undone.
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
