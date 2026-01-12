import { springApi } from "../lib/springApi";

export type ComplaintStatus = 'RECEIVED' | 'NORMALIZED' | 'RECOMMENDED' | 'IN_PROGRESS' | 'CLOSED';
export type UrgencyLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type IncidentStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

// 목록 조회용 DTO
export interface ComplaintDto {
  id: number;
  title: string;
  body: string;
  addressText?: string;
  status: ComplaintStatus;
  urgency: UrgencyLevel;
  receivedAt: string;
  createdAt: string;
  updatedAt?: string;
  districtId?: number;
  incidentId?: string | null;
  category?: string;
  tags?: string[];
  neutralSummary?: string;
}

// 상세 조회용 DTO (백엔드 ComplaintDetailResponse와 매핑)
export interface ComplaintDetailDto {
  // 1. 기본 정보
  id: string;          // 화면 표시용 ID (예: C2026-0004)
  originalId: number;  // 실제 DB ID
  title: string;
  body: string;        // 원문 내용
  address: string;
  receivedAt: string;
  status: ComplaintStatus;
  urgency: UrgencyLevel;
  departmentName?: string; // 담당 부서
  category?: string;       // 업무군

  // 2. 정규화 정보
  neutralSummary?: string;
  coreRequest?: string;
  coreCause?: string;
  targetObject?: string;
  keywords?: string[];
  locationHint?: string;

  // 3. 사건 정보
  incidentId?: string;       // 화면 표시용 ID (예: I-2026-001)
  incidentTitle?: string;
  incidentStatus?: IncidentStatus;
  incidentComplaintCount?: number;
}

export const AgentComplaintApi = {
  // 1. [목록] 모든 민원 가져오기
  getAll: async (params?: any) => {
    const response = await springApi.get<ComplaintDto[]>("/api/agent/complaints", { params });
    return response.data;
  },

// 2. [상세] 특정 민원 1개 가져오기
  getDetail: async (id: string | number) => {
    // 하이픈(-) 기준으로 뒤에 있는 숫자만 가져오기
    // 예: "C2026-0004" -> split('-') -> ["C2026", "0004"] -> pop() -> "0004" -> Number() -> 4
    const idStr = String(id);
    const realId = idStr.includes('-') ? idStr.split('-').pop() : idStr;
    
    // 숫자로 변환해서 요청
    const response = await springApi.get<ComplaintDetailDto>(`/api/agent/complaints/${Number(realId)}`);
    return response.data;
  }
};