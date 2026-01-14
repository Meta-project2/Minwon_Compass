import { springApi } from "../lib/springApi";

export type ComplaintStatus = 'RECEIVED' | 'NORMALIZED' | 'RECOMMENDED' | 'IN_PROGRESS' | 'CLOSED';
export type UrgencyLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface ComplaintDto {
  id: number;
  title: string;
  body: string;
  status: ComplaintStatus;
  urgency: UrgencyLevel;
  receivedAt: string;
  neutralSummary?: string; 
  addressText?: string;
  tags?: string[];
  incidentId?: string | null;
}

export interface ComplaintDetailDto extends ComplaintDto {
  originalId: number;
  address: string;
  departmentName?: string;
  category?: string;
  coreRequest?: string;
  coreCause?: string;
  targetObject?: string;
  keywords: string[];
  locationHint?: string;
  incidentTitle?: string;
  incidentStatus?: string;
  incidentComplaintCount?: number;
}

export const AgentComplaintApi = {
  getAll: async (params?: any) => {
    const response = await springApi.get<ComplaintDto[]>("/api/agent/complaints", { params });
    return response.data;
  },
  getDetail: async (id: string | number) => {
    const idStr = String(id);
    const realId = idStr.match(/\d+$/)?.[0] || idStr;
    const response = await springApi.get<ComplaintDetailDto>(`/api/agent/complaints/${realId}`);
    return response.data;
  }
};