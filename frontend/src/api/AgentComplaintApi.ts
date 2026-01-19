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
}

// 민원 이력 아이템 (부모/자식 공통)
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

  // 정규화 정보 (부모만 있음)
  neutralSummary?: string;
  coreRequest?: string;
  coreCause?: string;
  targetObject?: string;
  keywords: string[];
  locationHint?: string;
}

// 상세 조회용 DTO (백엔드 구조 변경 반영)
export interface ComplaintDetailDto {
  // 기본 정보
  id: string;          // 화면 표시용 ID (예: C2026-0004)
  originalId: number;  // 실제 DB ID
  title: string;       // 대표 제목
  address: string;
  receivedAt: string;  // 최초 접수일
  status: ComplaintStatus; // 대표 상태
  urgency: UrgencyLevel;
  departmentName?: string; // 담당 부서
  category?: string;       // 업무군
  managerName?: string;    // 담당자 이름

  // 이력 리스트로 통합
  history: ComplaintHistoryDto[];

  // 사건 정보
  incidentId?: string;       
  incidentTitle?: string;
  incidentStatus?: string;
  incidentComplaintCount?: number;

  // 기존 최상위 필드 호환성 (필요시 사용, 현재는 history에서 가져옴)
  answeredBy?: number; // 대표 담당자 ID
}

// ID 파싱
const parseId = (id: string | number): number => {
  const idStr = String(id);
  // "C2026-0008" 형태라면 "-" 뒤의 숫자만 추출
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
  number: number; // 현재 페이지 (0-based)
  first: boolean;
  last: boolean;
}

// 재이관 목록 응답 타입
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
  aiRoutingRank: any; // JSON Object
  category: string;
}

export const AgentComplaintApi = {

  // 0. 내 정보 가져오기
  getMe: async () => {
    const response = await springApi.get<{id: number, displayName: string}>("/api/agent/me");
    return response.data;
  },

  // 1. [목록] 모든 민원 가져오기
  getAll: async (params?: any) => {
    const response = await springApi.get<ComplaintDto[]>("/api/agent/complaints", { params });
    return response.data;
  },

  // 2. [상세] 특정 민원 1개 가져오기
  getDetail: async (id: string | number) => {
    const realId = parseId(id);
    const response = await springApi.get<ComplaintDetailDto>(`/api/agent/complaints/${realId}`);
    return response.data;
  },

  // 3. 담당 배정 (Assign)
  assign: async (id: string | number) => {
    const realId = parseId(id); // ★ 여기서 변환!
    await springApi.post(`/api/agent/complaints/${realId}/assign`);
  },

  // 4. 담당 취소 (Release)
  release: async (id: string | number) => {
    const realId = parseId(id); // ★ 여기서 변환!
    await springApi.post(`/api/agent/complaints/${realId}/release`);
  },

  // 5. 답변 전송/저장 (Answer)
  answer: async (id: string | number, content: string, isTemporary: boolean) => {
    const realId = parseId(id); // ★ 여기서 변환!
    await springApi.post(`/api/agent/complaints/${realId}/answer`, {
      answer: content,
      isTemporary,
    });
  },

  // 6. 재이관 요청 (Reroute)
  reroute: async (id: string | number, targetDeptId: number, reason: string) => {
    const realId = parseId(id); // ★ 여기서 변환!
    await springApi.post(`/api/agent/complaints/${realId}/reroute`, {
      targetDeptId,
      reason,
    });
  },
  
  // 7. [목록] 모든 재이관 요청 가져오기
getReroutes: async (params?: any) => {
    // params 구조: { page, size, status, keyword, originDeptId, targetDeptId }
    const response = await springApi.get<PageResponse<ComplaintRerouteResponse>>("/api/admin/complaints/reroutes", { params });
    return response.data;
  },

  // 8. 로그아웃 요청 (Logout)
  logout: async () => {
    await springApi.post("/api/agent/logout");
  },

};