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

const evidenceSchema = z.object({
  evidence_number: z.string().min(1, 'Evidence number is required'),
  case_id: z.string().min(1, 'Case is required'),
  description: z.string().min(1, 'Description is required'),
  type: z.enum(['physical', 'digital', 'documentary', 'testimonial', 'biological', 'trace']),
  location_found: z.string().optional(),
  date_collected: z.string().min(1, 'Date collected is required'),
  collected_by: z.string().optional(),
  storage_location: z.string().optional(),
  status: z.enum(['in_storage', 'in_lab', 'released', 'disposed']),
});

type EvidenceFormData = z.infer<typeof evidenceSchema>;

interface Evidence {
  id: string;
  evidence_number: string;
  case_id: string;
  description: string;
  type: string;
  location_found: string | null;
  date_collected: string;
  collected_by: string | null;
  storage_location: string | null;
  status: string;
  created_at: string;
  cases?: { case_number: string; title: string };
}

interface Case {
  id: string;
  case_number: string;
  title: string;
}

const initialFormData: EvidenceFormData = {
  evidence_number: '',
  case_id: '',
  description: '',
  type: 'physical',
  location_found: '',
  date_collected: new Date().toISOString().split('T')[0],
  collected_by: '',
  storage_location: '',
  status: 'in_storage',
};

export default function EvidencePage() {
  const { user } = useAuth();
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchValue, setSearchValue] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedEvidence, setSelectedEvidence] = useState<Evidence | null>(null);
  const [formData, setFormData] = useState<EvidenceFormData>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [evidenceRes, casesRes] = await Promise.all([
        supabase.from('evidence').select('*, cases(case_number, title)').order('created_at', { ascending: false }),
        supabase.from('cases').select('id, case_number, title').order('case_number'),
      ]);

      if (evidenceRes.error) throw evidenceRes.error;
      if (casesRes.error) throw casesRes.error;

      setEvidence(evidenceRes.data || []);
      setCases(casesRes.data || []);
    } catch (error) {
      toast.error('Failed to fetch evidence');
    } finally {
      setLoading(false);
    }
  };

  const filteredEvidence = useMemo(() => {
    if (!searchValue) return evidence;
    const search = searchValue.toLowerCase();
    return evidence.filter(e =>
      e.evidence_number.toLowerCase().includes(search) ||
      e.description.toLowerCase().includes(search) ||
      e.cases?.case_number.toLowerCase().includes(search)
    );
  }, [evidence, searchValue]);

  const handleAdd = () => {
    setSelectedEvidence(null);
    setFormData(initialFormData);
    setErrors({});
    setIsModalOpen(true);
  };

  const handleEdit = (item: Evidence) => {
    setSelectedEvidence(item);
    setFormData({
      evidence_number: item.evidence_number,
      case_id: item.case_id,
      description: item.description,
      type: item.type as EvidenceFormData['type'],
      location_found: item.location_found || '',
      date_collected: item.date_collected,
      collected_by: item.collected_by || '',
      storage_location: item.storage_location || '',
      status: item.status as EvidenceFormData['status'],
    });
    setErrors({});
    setIsModalOpen(true);
  };

  const handleDelete = (item: Evidence) => {
    setSelectedEvidence(item);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedEvidence) return;
    try {
      const { error } = await supabase.from('evidence').delete().eq('id', selectedEvidence.id);
      if (error) throw error;
      toast.success('Evidence deleted successfully');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete evidence');
    } finally {
      setIsDeleteModalOpen(false);
      setSelectedEvidence(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = evidenceSchema.safeParse(formData);
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
      if (selectedEvidence) {
        const { error } = await supabase.from('evidence').update(formData).eq('id', selectedEvidence.id);
        if (error) throw error;
        toast.success('Evidence updated successfully');
      } else {
        const insertData = {
          evidence_number: formData.evidence_number,
          case_id: formData.case_id,
          description: formData.description,
          type: formData.type,
          location_found: formData.location_found || null,
          date_collected: formData.date_collected,
          collected_by: formData.collected_by || null,
          storage_location: formData.storage_location || null,
          status: formData.status,
          user_id: user?.id as string,
        };
        const { error } = await supabase.from('evidence').insert([insertData]);
        if (error) throw error;
        toast.success('Evidence created successfully');
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save evidence');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    { key: 'evidence_number', header: 'Evidence #' },
    { key: 'description', header: 'Description', render: (item: Evidence) => (
      <span className="truncate max-w-[200px] block">{item.description}</span>
    )},
    { key: 'type', header: 'Type', render: (item: Evidence) => (
      <Badge variant="default">{item.type}</Badge>
    )},
    { key: 'case', header: 'Case', render: (item: Evidence) => item.cases?.case_number || '-' },
    { key: 'status', header: 'Status', render: (item: Evidence) => (
      <Badge variant={getStatusVariant(item.status)}>{item.status.replace('_', ' ')}</Badge>
    )},
    { key: 'date_collected', header: 'Date Collected', render: (item: Evidence) => 
      format(new Date(item.date_collected), 'MMM d, yyyy')
    },
  ];

  return (
    <MainLayout>
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold text-foreground">Evidence Management</h1>
          <p className="text-muted-foreground">Track and manage case evidence</p>
        </motion.div>

        <DataTable
          columns={columns}
          data={filteredEvidence}
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          searchPlaceholder="Search by evidence number, description, or case..."
          onAdd={handleAdd}
          addButtonLabel="Add Evidence"
          onEdit={handleEdit}
          onDelete={handleDelete}
          loading={loading}
          emptyMessage="No evidence found."
        />

        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={selectedEvidence ? 'Edit Evidence' : 'Add Evidence'} size="lg">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputField
                label="Evidence Number"
                value={formData.evidence_number}
                onChange={(e) => setFormData({ ...formData, evidence_number: e.target.value })}
                error={errors.evidence_number}
                required
                placeholder="EV-2024-001"
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

            <TextareaField
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              error={errors.description}
              required
              placeholder="Detailed description of the evidence..."
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SelectField
                label="Type"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as EvidenceFormData['type'] })}
                options={[
                  { value: 'physical', label: 'Physical' },
                  { value: 'digital', label: 'Digital' },
                  { value: 'documentary', label: 'Documentary' },
                  { value: 'testimonial', label: 'Testimonial' },
                  { value: 'biological', label: 'Biological' },
                  { value: 'trace', label: 'Trace' },
                ]}
                required
              />
              <SelectField
                label="Status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as EvidenceFormData['status'] })}
                options={[
                  { value: 'in_storage', label: 'In Storage' },
                  { value: 'in_lab', label: 'In Lab' },
                  { value: 'released', label: 'Released' },
                  { value: 'disposed', label: 'Disposed' },
                ]}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputField
                label="Location Found"
                value={formData.location_found}
                onChange={(e) => setFormData({ ...formData, location_found: e.target.value })}
                placeholder="Where evidence was found..."
              />
              <InputField
                label="Date Collected"
                type="date"
                value={formData.date_collected}
                onChange={(e) => setFormData({ ...formData, date_collected: e.target.value })}
                error={errors.date_collected}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputField
                label="Collected By"
                value={formData.collected_by}
                onChange={(e) => setFormData({ ...formData, collected_by: e.target.value })}
                placeholder="Officer name..."
              />
              <InputField
                label="Storage Location"
                value={formData.storage_location}
                onChange={(e) => setFormData({ ...formData, storage_location: e.target.value })}
                placeholder="Evidence locker location..."
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={submitting} className="btn-primary">
                {submitting ? 'Saving...' : selectedEvidence ? 'Update' : 'Add Evidence'}
              </button>
            </div>
          </form>
        </Modal>

        <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Delete Evidence" size="sm">
          <p className="text-muted-foreground mb-6">
            Are you sure you want to delete this evidence? This action cannot be undone.
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
