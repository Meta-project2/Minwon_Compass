import React, { useEffect, useState } from "react";
import axios from "axios";

export default function ApplicantComplaintListPage() {
  const [complaints, setComplaints] = useState([]); // 데이터를 저장할 상태

  useEffect(() => {
    // 페이지가 열리자마자 실행됨
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        const response = await axios.get('http://localhost:8080/api/complaints', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setComplaints(response.data); // 받아온 정보를 상태에 저장
      } catch (error) {
        console.error("데이터 로드 실패:", error);
      }
    };

    fetchData();
  }, []); // []는 페이지가 처음 나타날 때 딱 한 번만 실행하라는 의미

  return (
    <div>
      <h1>나의 민원 내역</h1>
      <ul>
        {complaints.map((item: any) => (
          <li key={item.id}>{item.title} - {item.status}</li>
        ))}
      </ul>
    </div>
  );
}