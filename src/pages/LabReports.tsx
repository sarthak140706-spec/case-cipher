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

const labReportSchema = z.object({
  evidence_id: z.string().min(1, 'Evidence is required'),
  report_number: z.string().min(1, 'Report number is required'),
  analysis_type: z.string().min(1, 'Analysis type is required'),
  analysis_result: z.string().min(1, 'Analysis result is required'),
  lab_tech_name: z.string().min(1, 'Lab technician name is required'),
  lab_name: z.string().optional(),
  date_submitted: z.string().min(1, 'Date submitted is required'),
  date_completed: z.string().optional(),
  status: z.enum(['pending', 'in_progress', 'completed', 'inconclusive']),
  notes: z.string().optional(),
});

type LabReportFormData = z.infer<typeof labReportSchema>;

interface LabReport {
  id: string;
  evidence_id: string;
  report_number: string;
  analysis_type: string;
  analysis_result: string;
  lab_tech_name: string;
  lab_name: string | null;
  date_submitted: string;
  date_completed: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  evidence?: { evidence_number: string; description: string };
}

interface Evidence {
  id: string;
  evidence_number: string;
  description: string;
}

const initialFormData: LabReportFormData = {
  evidence_id: '',
  report_number: '',
  analysis_type: '',
  analysis_result: '',
  lab_tech_name: '',
  lab_name: '',
  date_submitted: new Date().toISOString().split('T')[0],
  date_completed: '',
  status: 'pending',
  notes: '',
};

const analysisTypes = [
  { value: 'DNA Analysis', label: 'DNA Analysis' },
  { value: 'Fingerprint Analysis', label: 'Fingerprint Analysis' },
  { value: 'Toxicology', label: 'Toxicology' },
  { value: 'Ballistics', label: 'Ballistics' },
  { value: 'Digital Forensics', label: 'Digital Forensics' },
  { value: 'Document Analysis', label: 'Document Analysis' },
  { value: 'Blood Spatter Analysis', label: 'Blood Spatter Analysis' },
  { value: 'Trace Evidence', label: 'Trace Evidence' },
  { value: 'Other', label: 'Other' },
];

export default function LabReports() {
  const { user } = useAuth();
  const [labReports, setLabReports] = useState<LabReport[]>([]);
  const [evidenceList, setEvidenceList] = useState<Evidence[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchValue, setSearchValue] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<LabReport | null>(null);
  const [formData, setFormData] = useState<LabReportFormData>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [reportsRes, evidenceRes] = await Promise.all([
        supabase.from('lab_reports').select('*, evidence(evidence_number, description)').order('created_at', { ascending: false }),
        supabase.from('evidence').select('id, evidence_number, description').order('evidence_number'),
      ]);

      if (reportsRes.error) throw reportsRes.error;
      if (evidenceRes.error) throw evidenceRes.error;

      setLabReports(reportsRes.data || []);
      setEvidenceList(evidenceRes.data || []);
    } catch (error) {
      toast.error('Failed to fetch lab reports');
    } finally {
      setLoading(false);
    }
  };

  const filteredReports = useMemo(() => {
    if (!searchValue) return labReports;
    const search = searchValue.toLowerCase();
    return labReports.filter(r =>
      r.report_number.toLowerCase().includes(search) ||
      r.analysis_type.toLowerCase().includes(search) ||
      r.lab_tech_name.toLowerCase().includes(search) ||
      r.evidence?.evidence_number.toLowerCase().includes(search)
    );
  }, [labReports, searchValue]);

  const handleAdd = () => {
    setSelectedReport(null);
    setFormData(initialFormData);
    setErrors({});
    setIsModalOpen(true);
  };

  const handleEdit = (item: LabReport) => {
    setSelectedReport(item);
    setFormData({
      evidence_id: item.evidence_id,
      report_number: item.report_number,
      analysis_type: item.analysis_type,
      analysis_result: item.analysis_result,
      lab_tech_name: item.lab_tech_name,
      lab_name: item.lab_name || '',
      date_submitted: item.date_submitted,
      date_completed: item.date_completed || '',
      status: item.status as LabReportFormData['status'],
      notes: item.notes || '',
    });
    setErrors({});
    setIsModalOpen(true);
  };

  const handleDelete = (item: LabReport) => {
    setSelectedReport(item);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedReport) return;
    try {
      const { error } = await supabase.from('lab_reports').delete().eq('id', selectedReport.id);
      if (error) throw error;
      toast.success('Lab report deleted successfully');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete lab report');
    } finally {
      setIsDeleteModalOpen(false);
      setSelectedReport(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = labReportSchema.safeParse(formData);
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
        evidence_id: formData.evidence_id,
        report_number: formData.report_number,
        analysis_type: formData.analysis_type,
        analysis_result: formData.analysis_result,
        lab_tech_name: formData.lab_tech_name,
        lab_name: formData.lab_name || null,
        date_submitted: formData.date_submitted,
        date_completed: formData.date_completed || null,
        status: formData.status,
        notes: formData.notes || null,
      };

      if (selectedReport) {
        const { error } = await supabase.from('lab_reports').update(payload).eq('id', selectedReport.id);
        if (error) throw error;
        toast.success('Lab report updated successfully');
      } else {
        const { error } = await supabase.from('lab_reports').insert([{ ...payload, user_id: user?.id }]);
        if (error) throw error;
        toast.success('Lab report created successfully');
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save lab report');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    { key: 'report_number', header: 'Report #' },
    { key: 'evidence', header: 'Evidence', render: (item: LabReport) => item.evidence?.evidence_number || '-' },
    { key: 'analysis_type', header: 'Analysis Type' },
    { key: 'lab_tech_name', header: 'Lab Tech' },
    { key: 'status', header: 'Status', render: (item: LabReport) => (
      <Badge variant={getStatusVariant(item.status)}>{item.status.replace('_', ' ')}</Badge>
    )},
    { key: 'date_submitted', header: 'Submitted', render: (item: LabReport) => 
      format(new Date(item.date_submitted), 'MMM d, yyyy')
    },
  ];

  return (
    <MainLayout>
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold text-foreground">Lab Reports</h1>
          <p className="text-muted-foreground">Manage forensic analysis reports</p>
        </motion.div>

        <DataTable
          columns={columns}
          data={filteredReports}
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          searchPlaceholder="Search by report number, analysis type, or technician..."
          onAdd={handleAdd}
          addButtonLabel="New Report"
          onEdit={handleEdit}
          onDelete={handleDelete}
          loading={loading}
          emptyMessage="No lab reports found."
        />

        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={selectedReport ? 'Edit Lab Report' : 'New Lab Report'} size="lg">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputField
                label="Report Number"
                value={formData.report_number}
                onChange={(e) => setFormData({ ...formData, report_number: e.target.value })}
                error={errors.report_number}
                required
                placeholder="LAB-2024-001"
              />
              <SelectField
                label="Evidence"
                value={formData.evidence_id}
                onChange={(e) => setFormData({ ...formData, evidence_id: e.target.value })}
                options={evidenceList.map(e => ({ value: e.id, label: `${e.evidence_number} - ${e.description.substring(0, 30)}...` }))}
                error={errors.evidence_id}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SelectField
                label="Analysis Type"
                value={formData.analysis_type}
                onChange={(e) => setFormData({ ...formData, analysis_type: e.target.value })}
                options={analysisTypes}
                error={errors.analysis_type}
                required
              />
              <SelectField
                label="Status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as LabReportFormData['status'] })}
                options={[
                  { value: 'pending', label: 'Pending' },
                  { value: 'in_progress', label: 'In Progress' },
                  { value: 'completed', label: 'Completed' },
                  { value: 'inconclusive', label: 'Inconclusive' },
                ]}
                required
              />
            </div>

            <TextareaField
              label="Analysis Result"
              value={formData.analysis_result}
              onChange={(e) => setFormData({ ...formData, analysis_result: e.target.value })}
              error={errors.analysis_result}
              required
              placeholder="Detailed analysis results..."
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputField
                label="Lab Technician"
                value={formData.lab_tech_name}
                onChange={(e) => setFormData({ ...formData, lab_tech_name: e.target.value })}
                error={errors.lab_tech_name}
                required
                placeholder="Technician name..."
              />
              <InputField
                label="Lab Name"
                value={formData.lab_name}
                onChange={(e) => setFormData({ ...formData, lab_name: e.target.value })}
                placeholder="Laboratory name..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputField
                label="Date Submitted"
                type="date"
                value={formData.date_submitted}
                onChange={(e) => setFormData({ ...formData, date_submitted: e.target.value })}
                error={errors.date_submitted}
                required
              />
              <InputField
                label="Date Completed"
                type="date"
                value={formData.date_completed}
                onChange={(e) => setFormData({ ...formData, date_completed: e.target.value })}
              />
            </div>

            <TextareaField
              label="Notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes..."
            />

            <div className="flex justify-end gap-3 pt-4">
              <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={submitting} className="btn-primary">
                {submitting ? 'Saving...' : selectedReport ? 'Update' : 'Create Report'}
              </button>
            </div>
          </form>
        </Modal>

        <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Delete Lab Report" size="sm">
          <p className="text-muted-foreground mb-6">
            Are you sure you want to delete this lab report? This action cannot be undone.
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
