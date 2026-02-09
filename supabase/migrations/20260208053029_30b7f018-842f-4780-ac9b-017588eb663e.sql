-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  role TEXT DEFAULT 'investigator',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create officers table
CREATE TABLE public.officers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  rank TEXT NOT NULL,
  badge_number TEXT,
  contact TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.officers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view all officers" ON public.officers FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can insert officers" ON public.officers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their officers" ON public.officers FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their officers" ON public.officers FOR DELETE USING (auth.uid() = user_id);

-- Create cases table
CREATE TABLE public.cases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  case_number TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  date_opened DATE NOT NULL DEFAULT CURRENT_DATE,
  date_closed DATE,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'pending', 'under_investigation')),
  location TEXT,
  lead_officer_id UUID REFERENCES public.officers(id) ON DELETE SET NULL,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view all cases" ON public.cases FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can insert cases" ON public.cases FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their cases" ON public.cases FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their cases" ON public.cases FOR DELETE USING (auth.uid() = user_id);

-- Create suspects table
CREATE TABLE public.suspects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  age INTEGER,
  gender TEXT,
  address TEXT,
  phone TEXT,
  description TEXT,
  status TEXT DEFAULT 'suspect' CHECK (status IN ('suspect', 'person_of_interest', 'cleared', 'arrested')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.suspects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view all suspects" ON public.suspects FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can insert suspects" ON public.suspects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their suspects" ON public.suspects FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their suspects" ON public.suspects FOR DELETE USING (auth.uid() = user_id);

-- Create evidence table
CREATE TABLE public.evidence (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  evidence_number TEXT NOT NULL,
  description TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('physical', 'digital', 'documentary', 'testimonial', 'biological', 'trace')),
  location_found TEXT,
  date_collected DATE NOT NULL DEFAULT CURRENT_DATE,
  collected_by TEXT,
  chain_of_custody TEXT,
  storage_location TEXT,
  status TEXT DEFAULT 'in_storage' CHECK (status IN ('in_storage', 'in_lab', 'released', 'disposed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.evidence ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view all evidence" ON public.evidence FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can insert evidence" ON public.evidence FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their evidence" ON public.evidence FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their evidence" ON public.evidence FOR DELETE USING (auth.uid() = user_id);

-- Create lab_reports table
CREATE TABLE public.lab_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  evidence_id UUID NOT NULL REFERENCES public.evidence(id) ON DELETE CASCADE,
  report_number TEXT NOT NULL,
  analysis_type TEXT NOT NULL,
  analysis_result TEXT NOT NULL,
  lab_tech_name TEXT NOT NULL,
  lab_name TEXT,
  date_submitted DATE NOT NULL DEFAULT CURRENT_DATE,
  date_completed DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'inconclusive')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.lab_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view all lab_reports" ON public.lab_reports FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can insert lab_reports" ON public.lab_reports FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their lab_reports" ON public.lab_reports FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their lab_reports" ON public.lab_reports FOR DELETE USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_officers_updated_at BEFORE UPDATE ON public.officers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_cases_updated_at BEFORE UPDATE ON public.cases FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_suspects_updated_at BEFORE UPDATE ON public.suspects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_evidence_updated_at BEFORE UPDATE ON public.evidence FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_lab_reports_updated_at BEFORE UPDATE ON public.lab_reports FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for auto profile creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();