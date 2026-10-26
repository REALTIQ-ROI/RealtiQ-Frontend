import api from '../lib/axios';

export type CompanyManualSource = 'original_document' | 'official_registry' | 'approved_provider';

export interface ApprovedCompanyVerificationPolicy {
  key: 'company_verification';
  state: string;
  revision: number;
  value: { manualSources?: unknown };
  approvedAt?: string;
}

const allowedManualSources = new Set<CompanyManualSource>([
  'original_document',
  'official_registry',
  'approved_provider',
]);

export const adminPolicyService = {
  async getCompanyVerificationManualSources(): Promise<{ revision: number; sources: CompanyManualSource[] }> {
    const { data } = await api.get<{ policy: ApprovedCompanyVerificationPolicy }>('/admin/policies/company_verification');
    const policy = data.policy;
    if (policy.state !== 'approved' || !Number.isInteger(policy.revision) || policy.revision < 0) {
      throw new Error('The company verification policy is not currently approved.');
    }
    const configured = policy.value?.manualSources;
    if (!Array.isArray(configured)) throw new Error('The approved company verification policy does not expose manualSources.');
    const sources = configured.filter((value): value is CompanyManualSource => typeof value === 'string' && allowedManualSources.has(value as CompanyManualSource));
    if (sources.length !== configured.length || !sources.length) throw new Error('The approved company verification policy contains no usable manual review sources.');
    return { revision: policy.revision, sources };
  },
};
