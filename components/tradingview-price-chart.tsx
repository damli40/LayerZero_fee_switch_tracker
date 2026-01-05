'use client';

import { useEffect, useRef, useState } from 'react';
import { createChart, IChartApi, ISeriesApi, LineData, Time, LineSeries } from 'lightweight-charts';

interface PriceData {
  date: string;
  price: number;
}

interface TradingViewPriceChartProps {
  data: PriceData[];
  title?: string;
  description?: string;
}

type TimePeriod = '7D' | '1M' | '3M' | 'ALL';

export function TradingViewPriceChart({ data, title, description }: TradingViewPriceChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<any>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('ALL');

  // Filter data based on selected time period
  const getFilteredData = (): PriceData[] => {
    if (selectedPeriod === 'ALL' || data.length === 0) return data;

    const now = new Date();
    const daysMap: Record<TimePeriod, number> = {
      '7D': 7,
      '1M': 30,
      '3M': 90,
      'ALL': Infinity,
    };

    const days = daysMap[selectedPeriod];
    const cutoffDate = new Date(now);
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return data.filter(d => new Date(d.date) >= cutoffDate);
  };

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Create chart
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: 'rgba(0, 0, 0, 0)' },
        textColor: 'rgba(255, 255, 255, 0.8)',
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.1)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.1)' },
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: 'rgba(255, 255, 255, 0.4)',
          width: 1,
          style: 2,
          labelBackgroundColor: 'rgba(255, 255, 255, 0.1)',
        },
        horzLine: {
          color: 'rgba(255, 255, 255, 0.4)',
          width: 1,
          style: 2,
          labelBackgroundColor: 'rgba(255, 255, 255, 0.1)',
        },
      },
      rightPriceScale: {
        borderColor: 'rgba(255, 255, 255, 0.2)',
      },
      timeScale: {
        borderColor: 'rgba(255, 255, 255, 0.2)',
        timeVisible: true,
        secondsVisible: false,
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true,
      },
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: true,
        pinch: true,
      },
    });

    chartRef.current = chart;

    // Create line series
    const lineSeries = chart.addSeries(LineSeries, {
      color: 'rgba(255, 255, 255, 0.9)',
      lineWidth: 2,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 4,
      crosshairMarkerBorderColor: 'rgba(255, 255, 255, 1)',
      crosshairMarkerBackgroundColor: 'rgba(255, 255, 255, 0.9)',
      lastValueVisible: true,
      priceLineVisible: true,
    });

    seriesRef.current = lineSeries;

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        const { width, height } = chartContainerRef.current.getBoundingClientRect();
        chartRef.current.applyOptions({
          width: width > 0 ? width : 400,
          height: height > 0 ? height : 300,
        });
        chartRef.current.timeScale().fitContent();
      }
    };

    // Initial size
    handleResize();

    // Listen for resize
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(chartContainerRef.current);

    // Cleanup
    return () => {
      resizeObserver.disconnect();
      chart.remove();
    };
  }, []);

  // Update data when filtered data changes
  useEffect(() => {
    if (!seriesRef.current || data.length === 0) return;

    const filteredData = getFilteredData();

    // Convert to TradingView format
    const chartData: LineData[] = filteredData.map(d => ({
      time: (new Date(d.date).getTime() / 1000) as Time,
      value: d.price,
    }));

    // Sort by time
    chartData.sort((a, b) => Number(a.time) - Number(b.time));

    seriesRef.current.setData(chartData);

    // Fit content
    if (chartRef.current) {
      chartRef.current.timeScale().fitContent();
    }
  }, [data, selectedPeriod]);

  const periods: TimePeriod[] = ['7D', '1M', '3M', 'ALL'];

  return (
    <div className="p-4 sm:p-6 rounded-xl border border-white/10 bg-white/5 shadow-lg shadow-white/5">
      <div className="mb-4 sm:mb-6 space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h3 className="text-lg sm:text-xl font-bold text-white">{title || 'Historical ZRO Price'}</h3>
          {description && (
            <p className="text-xs sm:text-sm text-white/60">
              {description}
            </p>
          )}
        </div>

        {/* Time Period Selector */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0">
          {periods.map(period => (
            <button
              key={period}
              onClick={() => setSelectedPeriod(period)}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                selectedPeriod === period
                  ? 'bg-white/20 text-white shadow-lg shadow-white/10 border border-white/20'
                  : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white border border-white/10'
              }`}
            >
              {period}
            </button>
          ))}
        </div>
      </div>

      <div
        ref={chartContainerRef}
        className="w-full"
        style={{ height: '300px', minHeight: '200px' }}
      />
    </div>
  );
}
