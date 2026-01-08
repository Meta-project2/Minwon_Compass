import axios from "axios";

console.log("VITE_API_BASE_URL =", import.meta.env.VITE_API_BASE_URL);

export const springApi = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true, // ★ 세션(JSESSIONID) 쿠키 주고받기
  headers: {
    "Content-Type": "application/json",
  },
});
