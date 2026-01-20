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
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || !keywords || keywords.length === 0) return;

    d3.select(svgRef.current).selectAll('*').remove();

    const width = 800;
    const height = 250;

    // 1. 데이터의 최소/최대값 추출
    const minVal = d3.min(keywords, d => d.value) || 0;
    const maxVal = d3.max(keywords, d => d.value) || 1;

    // 2. 폰트 사이즈 스케일 생성 (20px에서 80px 사이로 자동 조절)
    const fontSizeScale = d3.scaleLinear()
      .domain([minVal, maxVal])
      .range([20, 70]); // 기존 [25, 85]에서 조정

    const layout = cloud()
      .size([width, height]) // 변경된 크기 적용
      .words(keywords.map(d => ({
        text: d.text,
        size: fontSizeScale(d.value)
      })))
      .padding(10)
      .rotate(() => 0)
      .font("Impact")
      .fontSize(d => d.size || 10)
      .on("end", draw);

    layout.start();

    function draw(words: any[]) {
      console.log("배치 성공한 단어 개수:", words.length);

      const svg = d3.select(svgRef.current)
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("width", "100%")
        .attr("height", "100%")
        .append("g")
        .attr("transform", `translate(${width / 2},${height / 2})`);

      svg.selectAll("text")
        .data(words)
        .enter()
        .append("text")
        .style("font-size", d => `${d.size}px`)
        .style("font-family", "Impact")
        .style("fill", () => d3.schemeCategory10[Math.floor(Math.random() * 10)])
        .attr("text-anchor", "middle")
        .attr("transform", d => `translate(${[d.x, d.y]})rotate(${d.rotate})`)
        .text(d => d.text);
    }
  }, [keywords]);

  return (
    // [수정 3] 컨테이너의 높이를 내용물에 맞게 유동적으로 변경 (h-full -> h-auto)
    <div ref={containerRef} className="w-full h-auto flex items-center justify-center overflow-hidden p-4">
      <svg
        ref={svgRef}
        // [수정 4] maxHeight 제한을 해제하여 레이아웃 설정대로 다 보이게 함
        style={{ width: '100%', height: 'auto' }}
        preserveAspectRatio="xMidYMid meet"
      ></svg>
    </div>
  );
}