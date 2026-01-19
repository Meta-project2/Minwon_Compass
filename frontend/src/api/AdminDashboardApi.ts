import { springApi } from "../lib/springApi";

// DTO Interfaces (기존과 동일하므로 생략하거나 유지)
export interface DailyCountDto { date: string; count: number; }
export interface CategoryStatDto { categoryName: string; count: number; }
export interface DeptStatusDto { deptName: string; received: number; pending: number; }
export interface TimeRangeDto { range: string; count: number; }
export interface RecurringIncidentDto { incidentId: string; title: string; count: number; trend: number; }

export interface GeneralStatsResponse {
  aiAccuracy: number;
  categoryStats: CategoryStatDto[];
  recurringIncidents: RecurringIncidentDto[];
}

export interface DepartmentFilterDto {
  id: number;
  name: string;
}

export const AdminDashboardApi = {
  // 1. 접수 추이
  getTrend: async (startDate: string, endDate: string, deptId?: string) => {
    const params = { startDate, endDate, deptId: deptId === 'all' ? null : deptId };
    return (await springApi.get<DailyCountDto[]>("/api/admin/dashboard/trend", { params })).data;
  },

  // 2. 처리 시간
  getProcessingTime: async (startDate: string, endDate: string, deptId?: string) => {
    const params = { startDate, endDate, deptId: deptId === 'all' ? null : deptId };
    return (await springApi.get<TimeRangeDto[]>("/api/admin/dashboard/processing-time", { params })).data;
  },

  // 3. 부서 현황
  getDeptStatus: async (startDate: string, endDate: string, deptId?: string) => {
    const params = { startDate, endDate, deptId: deptId === 'all' ? null : deptId };
    return (await springApi.get<DeptStatusDto[]>("/api/admin/dashboard/dept-status", { params })).data;
  },

  // 4. 일반 지표
  getGeneral: async (startDate: string, endDate: string) => {
    const params = { startDate, endDate };
    return (await springApi.get<GeneralStatsResponse>("/api/admin/dashboard/general", { params })).data;
  },
  
  // 5. 부서 목록(국) 가져오기
  getDepartments: async () => {
    return (await springApi.get<DepartmentFilterDto[]>("/api/admin/dashboard/departments")).data;
  },
};