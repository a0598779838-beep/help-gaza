export type AidStatus =
  | 'pending_review'
  | 'open'
  | 'closing_soon'
  | 'closed'
  | 'expired'
  | 'suspicious'
  | 'rejected';

export type VerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected';

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  is_active?: boolean;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  official_website?: string | null;
  official_contact_url?: string | null;
  support_url?: string | null;
  registration_url?: string | null;
  verification_status: VerificationStatus;
  verified_at?: string | null;
}

export interface Aid {
  id: string;
  title: string;
  slug: string;
  description: string;
  organization_id?: string | null;
  category_id?: string | null;
  organization?: Organization | null;
  category?: Category | null;
  eligibility?: string | null;
  required_documents?: string | null;
  target_areas: string[];
  registration_url?: string | null;
  source_url?: string | null;
  source_published_at?: string | null;
  registration_start_at?: string | null;
  registration_end_at?: string | null;
  status: AidStatus;
  verification_status: VerificationStatus;
  last_verified_at?: string | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  published_at?: string | null;
}

export interface AidFilters {
  search: string;
  category: string;
  area: string;
  status: string;
  organization: string;
  sort: 'newest' | 'updated';
  page: number;
  pageSize: number;
}

export interface AidPage {
  items: Aid[];
  total: number;
}

export interface ReportInput {
  aid_post_id?: string;
  report_type: string;
  reported_url: string;
  description: string;
  contact_email?: string;
}
