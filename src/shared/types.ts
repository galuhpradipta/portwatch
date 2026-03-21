export type Company = {
  id: string;
  name: string;
  industry: string;
  website: string;
  logoUrl: string;
  country: string;
  employeeRange: string;
  createdAt: Date | null;
};

export type PortfolioCompany = {
  id: string;
  name: string;
  industry: string;
  employeeRange: string;
  logoUrl: string;
  website: string;
  country: string;
  latestHeadcount: number | null;
  previousHeadcount: number | null;
  headcountChangePercent: number | null;
  avgSentimentScore: number | null;
  hasHeadcountAlert: boolean;
  hasSentimentAlert: boolean;
  addedAt: Date | null;
};

export type HeadcountSnapshot = {
  id: string;
  companyId: string;
  headcount: number;
  recordedAt: string;
  createdAt: Date | null;
};

export type NewsArticle = {
  id: string;
  companyId: string;
  title: string;
  description: string;
  url: string;
  sourceName: string;
  publishedAt: string;
  sentimentScore: number;
  createdAt: Date | null;
};

export type CompanyNote = {
  id: string;
  content: string;
  updatedAt: string | null;
};
