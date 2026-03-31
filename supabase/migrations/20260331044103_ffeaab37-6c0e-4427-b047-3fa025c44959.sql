
-- Drop existing foreign keys and re-add with CASCADE
ALTER TABLE public.suspects DROP CONSTRAINT IF EXISTS suspects_case_id_fkey;
ALTER TABLE public.suspects ADD CONSTRAINT suspects_case_id_fkey FOREIGN KEY (case_id) REFERENCES public.cases(id) ON DELETE CASCADE;

ALTER TABLE public.evidence DROP CONSTRAINT IF EXISTS evidence_case_id_fkey;
ALTER TABLE public.evidence ADD CONSTRAINT evidence_case_id_fkey FOREIGN KEY (case_id) REFERENCES public.cases(id) ON DELETE CASCADE;

ALTER TABLE public.lab_reports DROP CONSTRAINT IF EXISTS lab_reports_evidence_id_fkey;
ALTER TABLE public.lab_reports ADD CONSTRAINT lab_reports_evidence_id_fkey FOREIGN KEY (evidence_id) REFERENCES public.evidence(id) ON DELETE CASCADE;

ALTER TABLE public.cases DROP CONSTRAINT IF EXISTS cases_lead_officer_id_fkey;
ALTER TABLE public.cases ADD CONSTRAINT cases_lead_officer_id_fkey FOREIGN KEY (lead_officer_id) REFERENCES public.officers(id) ON DELETE SET NULL;
