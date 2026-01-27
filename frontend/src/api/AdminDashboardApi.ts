import { springApi } from "../lib/springApi";

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
  getTrend: async (startDate: string, endDate: string, deptId?: string) => {
    const params = { startDate, endDate, deptId: deptId === 'all' ? null : deptId };
    return (await springApi.get<DailyCountDto[]>("/api/admin/dashboard/trend", { params })).data;
  },
  getProcessingTime: async (startDate: string, endDate: string, deptId?: string) => {
    const params = { startDate, endDate, deptId: deptId === 'all' ? null : deptId };
    return (await springApi.get<TimeRangeDto[]>("/api/admin/dashboard/processing-time", { params })).data;
  },
  getDeptStatus: async (startDate: string, endDate: string, deptId?: string) => {
    const params = { startDate, endDate, deptId: deptId === 'all' ? null : deptId };
    return (await springApi.get<DeptStatusDto[]>("/api/admin/dashboard/dept-status", { params })).data;
  },
  getGeneral: async (startDate: string, endDate: string) => {
    const params = { startDate, endDate };
    return (await springApi.get<GeneralStatsResponse>("/api/admin/dashboard/general", { params })).data;
  },
  getDepartments: async () => {
    return (await springApi.get<DepartmentFilterDto[]>("/api/admin/dashboard/departments")).data;
  },
};