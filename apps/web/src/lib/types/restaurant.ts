export type CategoryCount = {
  category: string;
  label: string;
  count: number;
};

export type RestaurantSummary = {
  id: string;
  name: string;
  city: string;
  district: string | null;
  addressHint: string | null;
  cuisine: string | null;
  createdAt: string;
  reportCount: number;
  helpfulVotes: number;
  evilScore: number;
  scoreLabel: string;
  topCategories: CategoryCount[];
};

export type RestaurantListResponse = {
  items: RestaurantSummary[];
  total: number;
  cities: string[];
  locations: { city: string; districts: string[] }[];
};

export type ReportView = {
  id: string;
  category: string;
  categoryLabel: string;
  severity: number;
  title: string;
  body: string;
  nickname: string;
  createdAt: string;
  helpfulCount: number;
  photoUrls: string[];
  receiptUrl: string;
  evidenceVerified: boolean;
};

export type RestaurantDetail = RestaurantSummary & {
  reports: ReportView[];
};

export type ApiErrorBody = {
  statusCode?: number;
  message?: string;
  details?: string[];
};
