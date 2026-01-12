import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import cloud from 'd3-cloud';

interface KeywordCloudProps {
  keywords: {
    text: string;
    value: number;
  }[];
}

export function KeywordCloud({ keywords }: KeywordCloudProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !keywords.length) return;

    // 기존 렌더링된 내용 초기화
    d3.select(svgRef.current).selectAll('*').remove();

    const width = 500;
    const height = 250;

    const layout = cloud()
      .size([width, height])
      .words(keywords.map(d => ({ text: d.text, size: 10 + d.value * 5 }))) // value를 폰트 크기로 변환
      .padding(5)
      .rotate(() => (~~(Math.random() * 2) * 90)) // 0도 또는 90도 회전
      .font("Impact")
      .fontSize(d => d.size || 10)
      .on("end", draw);

    layout.start();

    function draw(words: any[]) {
      d3.select(svgRef.current)
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", `0 0 ${width} ${height}`)
        .append("g")
        .attr("transform", `translate(${width / 2},${height / 2})`)
        .selectAll("text")
        .data(words)
        .enter()
        .append("text")
        .style("font-size", d => `${d.size}px`)
        .style("font-family", "Impact")
        .style("fill", () => d3.schemeCategory10[Math.floor(Math.random() * 10)]) // 랜덤 색상
        .attr("text-anchor", "middle")
        .attr("transform", d => `translate(${[d.x, d.y]})rotate(${d.rotate})`)
        .text(d => d.text);
    }
  }, [keywords]);

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-lg font-semibold mb-4 text-gray-900">민원 키워드 분석</h2>
      <div className="flex justify-center items-center h-64 overflow-hidden">
        <svg ref={svgRef}></svg>
      </div>
      <p className="text-xs text-gray-500 text-center mt-4">
        * 최근 한 달간 가장 많이 언급된 키워드
      </p>
    </div>
  );
}