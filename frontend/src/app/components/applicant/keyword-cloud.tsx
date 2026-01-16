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
    if (!svgRef.current || !containerRef.current || !keywords.length) return;

    d3.select(svgRef.current).selectAll('*').remove();

    const width = 600;
    const height = 350;

    const layout = cloud()
      .size([width, height])
      .words(keywords.map(d => ({ 
        text: d.text, 
        // 가로 배치는 공간을 더 많이 차지하므로 사이즈 배율을 살짝 조정합니다.
        size: 20 + d.value * 7 
      })))
      .padding(10) // 가로 배치 시 단어 간 겹침 방지를 위해 패딩 최적화
      .rotate(() => 0) // [수정] 모든 키워드를 0도(가로)로 고정
      .font("Impact")
      .fontSize(d => d.size || 10)
      .on("end", draw);

    layout.start();

    function draw(words: any[]) {
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
        // 가독성을 위해 D3 기본 색상 세트를 사용합니다.
        .style("fill", () => d3.schemeCategory10[Math.floor(Math.random() * 10)])
        .attr("text-anchor", "middle")
        .attr("transform", d => `translate(${[d.x, d.y]})rotate(${d.rotate})`)
        .text(d => d.text);
    }
  }, [keywords]);

  return (
    <div ref={containerRef} className="w-full h-full flex items-center justify-center overflow-hidden">
      <svg 
        ref={svgRef} 
        style={{ maxWidth: '95%', maxHeight: '95%' }} // 가장자리 잘림 방지를 위해 소폭 축소
        preserveAspectRatio="xMidYMid meet"
      ></svg>
    </div>
  );
}