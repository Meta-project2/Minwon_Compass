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
    const { width: containerWidth, height: containerHeight } = containerRef.current.getBoundingClientRect();

    d3.select(svgRef.current).selectAll('*').remove();

    const width = containerWidth || 600;
    const height = containerHeight || 300;
    const minVal = d3.min(keywords, d => d.value) || 0;
    const maxVal = d3.max(keywords, d => d.value) || 1;

    const fontSizeScale = d3.scaleLinear()
      .domain([minVal, maxVal])
      .range([Math.min(height / 10, 16), Math.min(height / 3, 60)]);

    const layout = cloud()
      .size([width - 40, height - 40])
      .words(keywords.map(d => ({
        text: d.text,
        size: fontSizeScale(d.value)
      })))
      .padding(5)
      .rotate(() => 0)
      .font("Pretendard, sans-serif")
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
    <div ref={containerRef} className="w-full h-full flex items-center justify-center overflow-hidden">
      <svg
        ref={svgRef}
        style={{ width: '100%', height: 'auto' }}
        preserveAspectRatio="xMidYMid meet"
      ></svg>
    </div>
  );
}