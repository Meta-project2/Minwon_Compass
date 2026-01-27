import { springApi } from "../lib/springApi";

export type ComplaintStatus = 'RECEIVED' | 'NORMALIZED' | 'RECOMMENDED' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' | 'CANCELED';
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
  managerName?: string;
  coreRequest?: string;
}

export interface ComplaintHistoryDto {
  id: string; // "P-1" or "C-5"
  originalId: number;
  parent: boolean;
  receivedAt: string;
  title: string;
  body: string;
  answer?: string;
  answeredBy?: number;
  status: ComplaintStatus;
  neutralSummary?: string;
  coreRequest?: string;
  coreCause?: string;
  targetObject?: string;
  keywords: string[];
  locationHint?: string;
}

export interface ComplaintDetailDto {
  // 기본 정보
  id: string;
  originalId: number;
  title: string;
  address: string;
  receivedAt: string;
  status: ComplaintStatus;
  urgency: UrgencyLevel;
  departmentName?: string;
  category?: string;
  managerName?: string;
  history: ComplaintHistoryDto[];
  incidentId?: string;
  incidentTitle?: string;
  incidentStatus?: string;
  incidentComplaintCount?: number;
  answeredBy?: number;
}


const parseId = (id: string | number): number => {
  const idStr = String(id);
  if (idStr.includes('-')) {
    return Number(idStr.split('-').pop());
  }
  return Number(idStr);
};

export interface PageResponse<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}

export interface ComplaintRerouteResponse {
  rerouteId: number;
  requestedAt: string;
  complaintId: string;
  complaintTitle: string;
  address: string;
  currentDeptName: string;
  targetDeptName: string;
  requesterName: string;
  requestReason: string;
  status: string;
  aiRoutingRank: any;
  category: string;
}

export interface DepartmentDto {
  id: number;
  name: string;
  category: string;
  parentId?: number | null;
}

export const AgentComplaintApi = {

  getMe: async () => {
    const response = await springApi.get<{ id: number, displayName: string }>("/api/agent/me");
    return response.data;
  },

  getAll: async (params?: any) => {
    const response = await springApi.get<ComplaintDto[]>("/api/agent/complaints", { params });
    return response.data;
  },

  getDetail: async (id: string | number) => {
    const realId = parseId(id);
    const response = await springApi.get<ComplaintDetailDto>(`/api/agent/complaints/${realId}`);
    return response.data;
  },

  assign: async (id: string | number) => {
    const realId = parseId(id);
    await springApi.post(`/api/agent/complaints/${realId}/assign`);
  },

  release: async (id: string | number) => {
    const realId = parseId(id);
    await springApi.post(`/api/agent/complaints/${realId}/release`);
  },

  answer: async (id: string | number, content: string, isTemporary: boolean) => {
    const realId = parseId(id); // ★ 여기서 변환!
    await springApi.post(`/api/agent/complaints/${realId}/answer`, {
      answer: content,
      isTemporary,
    });
  },

  reroute: async (id: string | number, targetDeptId: number, reason: string) => {
    const realId = parseId(id); // ★ 여기서 변환!
    await springApi.post(`/api/agent/complaints/${realId}/reroute`, {
      targetDeptId,
      reason,
    });
  },

  getReroutes: async (params?: any) => {
    const response = await springApi.get<PageResponse<ComplaintRerouteResponse>>("/api/admin/complaints/reroutes", { params });
    return response.data;
  },

  logout: async () => {
    await springApi.post("/api/agent/logout");
  },


  generateAiDraft: async (id: number, content: string) => {
    // 1. springApi 대신 fetch 사용 (주소 주의: 8000 포트)
    const response = await fetch(`/api/v2/complaints/${id}/generate-draft`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: content, // 민원 본문
        action: "draft",
      }),
    });

    // 2. 응답 JSON 변환
    if (!response.ok) {
      throw new Error(`AI Server Error: ${response.statusText}`);
    }

    return await response.json(); // { status: "success", data: "..." } 반환
  },

  // 10. 채팅 기록 가져오기
  getChatHistory: async (id: number) => {
    const response = await fetch(`/api/v2/complaints/${id}/chat-history`);
    if (!response.ok) throw new Error("Failed to fetch chat history");
    return await response.json();
  },

  // 11. 모든 부서 가져오기
  getDepartments: async () => {
    const response = await springApi.get<DepartmentDto[]>("/api/agent/departments");
    return response.data;
  },
};