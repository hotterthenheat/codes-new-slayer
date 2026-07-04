import { useEffect, useMemo, useRef, useState } from 'react';
import { useEffect, useRef } from 'react';

/**
 * EChart — a thin, dark, self-disposing React wrapper around Apache ECharts.
 *
 * echarts (and echarts-gl when `gl` is set) are dynamically imported so they
 * code-split off the main bundle — the ~1MB GL runtime only loads on the pages
 * that actually use it. A Slayer dark theme is registered once so every chart
 * reads as part of the terminal (mono type, muted grid, transparent surface).
 *
 * `option` may be a plain ECharts option object or a factory `(echarts) => option`
 * — use the factory form when the option needs `echarts.graphic.LinearGradient`,
 * `echarts.time`, `echarts.format`, etc.
 */

type EChartsModule = typeof import('echarts');
type OptionOrFactory = any | ((echarts: EChartsModule) => any);

interface EChartProps {
  option: OptionOrFactory;
  /** Load echarts-gl for 3D / GL series (scatter3D, surface, flowGL, …). */
  gl?: boolean;
  className?: string;
  style?: React.CSSProperties;
  /** Replace the whole option on update instead of merging (default false). */
  notMerge?: boolean;
  onInit?: (chart: any, echarts: EChartsModule) => void;
}

let themeRegistered = false;
function registerSlayerTheme(echarts: EChartsModule) {
  if (themeRegistered) return;
  themeRegistered = true;
  const axis = {
    axisLine: { lineStyle: { color: 'rgba(255,255,255,0.14)' } },
    axisTick: { lineStyle: { color: 'rgba(255,255,255,0.14)' } },
    axisLabel: { color: '#8A8A92', fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 10 },
    splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } },
    splitArea: { areaStyle: { color: ['rgba(255,255,255,0.012)', 'transparent'] } },
  };
  echarts.registerTheme('slayer-dark', {
    color: ['#4ADE80', '#60A5FA', '#F87171', '#FBBF24', '#B06FE6', '#29B6F6', '#34D399', '#F472B6'],
    backgroundColor: 'transparent',
    textStyle: { fontFamily: 'JetBrains Mono, ui-monospace, monospace', color: '#A3A3A3' },
    title: { textStyle: { color: '#E5E5E5', fontWeight: 700 }, subtextStyle: { color: '#71717A' } },
    legend: { textStyle: { color: '#A3A3A3', fontFamily: 'JetBrains Mono, monospace' }, inactiveColor: '#3f3f46' },
    tooltip: {
      backgroundColor: 'rgba(10,10,11,0.96)',
      borderColor: 'rgba(255,255,255,0.10)',
      borderWidth: 1,
      textStyle: { color: '#E5E5E5', fontFamily: 'JetBrains Mono, monospace', fontSize: 11 },
      extraCssText: 'backdrop-filter: blur(8px); border-radius: 8px;',
    },
    axisPointer: { lineStyle: { color: '#3f3f46' }, crossStyle: { color: '#3f3f46' }, label: { backgroundColor: '#1c1c1e' } },
    categoryAxis: axis,
    valueAxis: axis,
    timeAxis: axis,
    logAxis: axis,
    grid: { borderColor: 'rgba(255,255,255,0.06)' },
    toolbox: { iconStyle: { borderColor: '#71717A' }, emphasis: { iconStyle: { borderColor: '#E5E5E5' } } },
    dataZoom: {
      borderColor: 'rgba(255,255,255,0.08)',
      fillerColor: 'rgba(74,222,128,0.10)',
      handleStyle: { color: '#4ADE80' },
      moveHandleStyle: { color: '#4ADE80' },
      dataBackground: { lineStyle: { color: '#3f3f46' }, areaStyle: { color: 'rgba(255,255,255,0.04)' } },
      textStyle: { color: '#71717A' },
    },
  });
}

export default function EChart({ option, gl, className, style, notMerge, onInit }: EChartProps) {
  const elRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<any>(null);
  const echartsRef = useRef<EChartsModule | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'empty' | 'error'>('loading');
  const [message, setMessage] = useState<string>('');
  const optionRef = useRef<OptionOrFactory>(option);
  optionRef.current = option;

  const hasRenderableSeries = (resolved: any) => {
    const series = Array.isArray(resolved?.series) ? resolved.series : resolved?.series ? [resolved.series] : [];
    if (!series.length) return false;
    return series.some((s: any) => s?.equation || s?.type === 'flowGL' || (Array.isArray(s?.data) && s.data.length > 0));
  };

  const terminalOption = useMemo(() => ({
    backgroundColor: '#050507',
    textStyle: { color: '#d4d4d8', fontFamily: 'JetBrains Mono, ui-monospace, monospace' },
    grid3D: {
      environment: '#050507',
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.32)' } },
      axisLabel: { textStyle: { color: '#a1a1aa' } },
      axisPointer: { lineStyle: { color: '#4ade80' } },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.08)' } },
    },
  }), []);

  const optionRef = useRef<OptionOrFactory>(option);
  optionRef.current = option;

  // Init once (async so echarts code-splits). Re-init if `gl` toggles.
  useEffect(() => {
    let disposed = false;
    let ro: ResizeObserver | null = null;
    (async () => {
      const echarts = (await import('echarts')) as unknown as EChartsModule;
      if (gl) await import('echarts-gl');
      if (disposed || !elRef.current) return;
      registerSlayerTheme(echarts);
      const chart = echarts.init(elRef.current, 'slayer-dark', { renderer: 'canvas', useDirtyRect: true });
      echartsRef.current = echarts;
      chartRef.current = chart;
      try {
        const resolved = typeof optionRef.current === 'function' ? optionRef.current(echarts) : optionRef.current;
        if (!hasRenderableSeries(resolved)) {
          setStatus('empty');
          setMessage('No chart series/data were provided to the renderer.');
        } else {
          chart.setOption({ ...terminalOption, ...resolved }, { notMerge: true });
          setStatus('ready');
        }
        onInit?.(chart, echarts);
      } catch (err) {
        setStatus('error');
        setMessage(err instanceof Error ? err.message : 'Unknown chart renderer error');
      }
      ro = new ResizeObserver((entries) => {
        const rect = entries[0]?.contentRect;
        if (!rect || rect.width <= 0 || rect.height <= 0 || !Number.isFinite(rect.width) || !Number.isFinite(rect.height)) return;
        chart.resize();
      });
      const chart = echarts.init(elRef.current, 'slayer-dark', { renderer: 'canvas' });
      echartsRef.current = echarts;
      chartRef.current = chart;
      const resolved = typeof optionRef.current === 'function' ? optionRef.current(echarts) : optionRef.current;
      chart.setOption(resolved, { notMerge: true });
      onInit?.(chart, echarts);
      ro = new ResizeObserver(() => chart.resize());
      ro.observe(elRef.current);
    })();
    return () => {
      disposed = true;
      ro?.disconnect();
      chartRef.current?.dispose();
      chartRef.current = null;
      echartsRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gl, terminalOption]);
  }, [gl]);

  // Apply option updates once the chart exists.
  useEffect(() => {
    const chart = chartRef.current;
    const echarts = echartsRef.current;
    if (!chart || !echarts) return;
    try {
      const resolved = typeof option === 'function' ? option(echarts) : option;
      if (!hasRenderableSeries(resolved)) {
        setStatus('empty');
        setMessage('Waiting for valid chart data.');
        chart.clear();
        return;
      }
      chart.setOption({ ...terminalOption, ...resolved }, { notMerge: notMerge ?? false });
      setStatus('ready');
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Unknown chart renderer error');
      chart.clear();
    }
  }, [option, notMerge, terminalOption]);

  return (
    <div className={`relative h-full w-full overflow-hidden bg-zinc-950 ${className ?? ''}`} style={style}>
      <div ref={elRef} style={{ width: '100%', height: '100%', background: '#050507' }} />
      {status === 'loading' && (
        <div className="absolute inset-0 rounded-xl border border-white/10 bg-zinc-950 p-4">
          <div className="mb-3 h-4 w-48 animate-pulse rounded bg-white/10" />
          <div className="h-[calc(100%-2rem)] animate-pulse rounded-xl bg-white/[0.04]" />
        </div>
      )}
      {(status === 'empty' || status === 'error') && (
        <div className={`absolute inset-0 flex flex-col justify-center rounded-xl border p-4 ${status === 'error' ? 'border-red-500/20 bg-red-950/10' : 'border-white/10 bg-zinc-950'}`}>
          <p className={`text-sm font-medium ${status === 'error' ? 'text-red-300' : 'text-zinc-300'}`}>
            {status === 'error' ? 'Quant model failed to render' : 'No surface data available'}
          </p>
          <p className={`mt-1 text-xs ${status === 'error' ? 'text-red-200/60' : 'text-zinc-600'}`}>
            {message || (status === 'error' ? 'Check data source, surface dimensions, and renderer lifecycle.' : 'Waiting for valid moneyness, tenor, and volatility inputs.')}
          </p>
        </div>
      )}
    </div>
  );
    const resolved = typeof option === 'function' ? option(echarts) : option;
    chart.setOption(resolved, { notMerge: notMerge ?? false });
  }, [option, notMerge]);

  return <div ref={elRef} className={className} style={{ width: '100%', height: '100%', ...style }} />;
}
