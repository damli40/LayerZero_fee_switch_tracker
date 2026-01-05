'use client';

import { useState, useMemo, useEffect, memo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { TrendingDown, AlertCircle, Calendar, Flame, Loader2, Vote, TrendingUp } from 'lucide-react';

import { getMetricsSinceDate, MarketData, DailyMetrics } from '@/lib/mock-api';
import { AnimatedNumber } from '@/components/animated-number';
import { calculateTotalBurn, calculateTotalUSDValue, getDailyBurnBreakdown } from '@/lib/shadow-burn-calc';
import { predictFutureBurn, getRegressionTrendInfo } from '@/lib/prediction';
import { fetchMetricsFromAPI } from '@/lib/api-client';
import { VOTE_PERIODS, getVotePeriod, getLatestVotePeriod, getDaysSinceVote, type VotePeriod } from '@/lib/vote-config';
import { TradingViewPriceChart } from '@/components/tradingview-price-chart';

const DAYS_TO_FETCH = 60;

export default function DashboardPage() {
  const [selectedVote, setSelectedVote] = useState<VotePeriod>(getLatestVotePeriod());
  const [predictiveDays, setPredictiveDays] = useState<number>(30);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [marketData, setMarketData] = useState<MarketData>({ zroPrice: 3.50 });
  const [allMetrics, setAllMetrics] = useState<DailyMetrics[]>([]);
  const [isRealData, setIsRealData] = useState(false);

  const FEE_SWITCH_VOTE_DATE = useMemo(() => new Date(selectedVote.dataStartDate), [selectedVote]);

  // Fetch data from database API (only on initial mount)
  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoadingData(true);

        // Calculate date range - fetch from earliest vote date to cover all vote periods
        const toDate = new Date();
        // Get the earliest vote date from all vote periods
        const earliestVote = VOTE_PERIODS.reduce((earliest, vote) => {
          const voteDate = new Date(vote.dataStartDate);
          return voteDate < earliest ? voteDate : earliest;
        }, new Date());

        // Also ensure we have at least 60 days for predictions
        const minFromDate = new Date();
        minFromDate.setDate(minFromDate.getDate() - DAYS_TO_FETCH);

        // Use whichever is earlier: earliest vote or 60 days ago
        const fromDate = earliestVote < minFromDate ? earliestVote : minFromDate;

        const startDateStr = fromDate.toISOString().split('T')[0];
        const endDateStr = toDate.toISOString().split('T')[0];

        // Fetch metrics from database API
        const response = await fetchMetricsFromAPI(startDateStr, endDateStr);

        setMarketData({
          zroPrice: response.currentZROPrice,
          lastUpdated: new Date(response.lastUpdated),
        });
        setAllMetrics(response.metrics);
        setIsRealData(response.metrics.length > 0);

        console.log(`Loaded ${response.metrics.length} days of data from database`);
      } catch (error) {
        console.error('Error fetching data:', error);
        // Fallback: use mock data
        const { generateMockDailyMetrics } = await import('@/lib/mock-api');
        const metrics = generateMockDailyMetrics(DAYS_TO_FETCH);
        setAllMetrics(metrics);
        setIsRealData(false);
        setMarketData({ zroPrice: 3.50, lastUpdated: new Date() });
      } finally {
        setIsLoadingData(false);
      }
    }

    fetchData();
  }, []); // Only run once on mount

  // Add smooth transition effect when vote changes
  useEffect(() => {
    setIsTransitioning(true);
    const timer = setTimeout(() => setIsTransitioning(false), 300);
    return () => clearTimeout(timer);
  }, [selectedVote]);

  // Calculate retrospective data (since selected vote date)
  const retrospectiveMetrics = useMemo(
    () => getMetricsSinceDate(allMetrics, FEE_SWITCH_VOTE_DATE),
    [allMetrics, FEE_SWITCH_VOTE_DATE]
  );

  const retrospectiveBurn = useMemo(
    () => calculateTotalBurn(retrospectiveMetrics),
    [retrospectiveMetrics]
  );

  const retrospectiveUSDValue = useMemo(
    () => calculateTotalUSDValue(retrospectiveMetrics),
    [retrospectiveMetrics]
  );

  // Calculate predictive data
  const last30Days = useMemo(() => allMetrics.slice(-30), [allMetrics]);

  const prediction = useMemo(
    () => predictFutureBurn(last30Days, predictiveDays, marketData.zroPrice),
    [last30Days, predictiveDays, marketData.zroPrice]
  );

  const trendInfo = useMemo(() => getRegressionTrendInfo(last30Days), [last30Days]);

  // Prepare chart data for retrospective
  const retrospectiveChartData = useMemo(() => {
    const dailyData = getDailyBurnBreakdown(retrospectiveMetrics);
    let cumulativeBurn = 0;

    return dailyData.map(day => {
      cumulativeBurn += day.burnAmount;
      return {
        date: new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        dailyBurn: Math.round(day.burnAmount),
        cumulativeBurn: Math.round(cumulativeBurn),
        messages: day.messageCount,
        zroPrice: day.zroPrice,
      };
    });
  }, [retrospectiveMetrics]);

  const daysSinceVote = Math.floor(
    (new Date().getTime() - FEE_SWITCH_VOTE_DATE.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Memoized event handlers to prevent unnecessary re-renders
  const handleVoteChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const vote = getVotePeriod(parseInt(e.target.value));
    if (vote) setSelectedVote(vote);
  }, []);

  const handlePredictiveDaysChange = useCallback((value: number[]) => {
    setPredictiveDays(value[0]);
  }, []);

  // Show loading state
  if (isLoadingData) {
    return (
      <main className="min-h-screen bg-black p-4 md:p-8 flex items-center justify-center">
        <div className="w-96 p-12 rounded-xl border border-white/10 bg-white/5 shadow-lg shadow-white/5">
          <div className="flex flex-col items-center justify-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-white" />
            <div className="text-center space-y-2">
              <p className="text-lg font-medium text-white">Loading Dashboard Data</p>
              <p className="text-sm text-white/60">Fetching LayerZero messages and ZRO prices...</p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black p-3 sm:p-4 md:p-8">
      <div
        className={`max-w-7xl mx-auto space-y-4 sm:space-y-6 transition-opacity duration-300 ${
          isTransitioning ? 'opacity-90' : 'opacity-100'
        }`}
      >
        {/* Hero Section - Massive Revenue Impact */}
        <div className="relative overflow-hidden py-8 sm:py-12 md:py-20">
          <div className="relative z-10 text-center space-y-3 sm:space-y-6">
            <p className="text-white/40 text-[10px] sm:text-xs md:text-sm font-light tracking-[0.15em] sm:tracking-[0.2em] uppercase">
              MISSED PROTOCOL REVENUE
            </p>
            <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-extralight text-white leading-none tracking-wider px-2">
              <AnimatedNumber
                key={`hero-${selectedVote.voteNumber}`}
                value={retrospectiveUSDValue}
                duration={1500}
                decimals={2}
                prefix="$"
                separator={true}
                className=""
              />
            </h1>
            <div className="flex items-center justify-center gap-4 sm:gap-8 pt-2 text-xs sm:text-sm">
              <div className="text-white/50 font-light">
                <AnimatedNumber
                  key={`days-${selectedVote.voteNumber}`}
                  value={daysSinceVote}
                  duration={1500}
                  decimals={0}
                  suffix=" days"
                />
              </div>
              <div className="h-3 sm:h-4 w-px bg-white/20"></div>
              <div className="text-white/50 font-light">
                <AnimatedNumber
                  key={`burn-${selectedVote.voteNumber}`}
                  value={retrospectiveBurn}
                  duration={1500}
                  decimals={0}
                  suffix=" ZRO"
                  separator={true}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Vote Period Selector */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 p-4 sm:p-6 rounded-xl border border-white/10 bg-white/5 shadow-lg shadow-white/5">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <Vote className="h-4 w-4 sm:h-5 sm:w-5 text-white/60" />
            <Label htmlFor="vote-selector" className="text-sm sm:text-base font-medium text-white">
              Fee Switch Vote Period:
            </Label>
          </div>
          <select
            id="vote-selector"
            className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 border border-white/20 rounded-xl bg-white/10 text-white text-sm sm:text-base font-medium
                       hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white/40
                       transition-all cursor-pointer shadow-lg shadow-white/10"
            value={selectedVote.voteNumber}
            onChange={handleVoteChange}
          >
            {VOTE_PERIODS.map((vote) => (
              <option key={vote.voteNumber} value={vote.voteNumber} className="bg-black text-white">
                {vote.label} ({vote.status})
              </option>
            ))}
          </select>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-4 sm:p-6 rounded-xl border border-white/10 bg-white/5 shadow-lg shadow-white/5">
            <p className="text-xs sm:text-sm font-medium text-white/60 uppercase tracking-wide mb-1 sm:mb-2">
              Total Messages
            </p>
            <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-1">
              <AnimatedNumber
                key={`messages-${selectedVote.voteNumber}`}
                value={retrospectiveMetrics.reduce((sum, m) => sum + m.messageCount, 0)}
                duration={1500}
                decimals={0}
                separator={true}
              />
            </div>
            <p className="text-[10px] sm:text-xs text-white/40">
              Since {new Date(selectedVote.dataStartDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>

          <div className="p-4 sm:p-6 rounded-xl border border-white/10 bg-white/5 shadow-lg shadow-white/5">
            <p className="text-xs sm:text-sm font-medium text-white/60 uppercase tracking-wide mb-1 sm:mb-2">
              Total Cumulative Fees
            </p>
            <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-1">
              <AnimatedNumber
                key={`totalfee-${selectedVote.voteNumber}`}
                value={retrospectiveUSDValue}
                duration={1500}
                decimals={0}
                prefix="$"
                separator={true}
              />
            </div>
            <p className="text-[10px] sm:text-xs text-white/40">
              Total fees collected
            </p>
          </div>

          <div className="p-4 sm:p-6 rounded-xl border border-white/10 bg-white/5 shadow-lg shadow-white/5">
            <p className="text-xs sm:text-sm font-medium text-white/60 uppercase tracking-wide mb-1 sm:mb-2">
              Current ZRO Price
            </p>
            <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-1">
              <AnimatedNumber
                key={`price-${selectedVote.voteNumber}`}
                value={marketData.zroPrice}
                duration={1500}
                decimals={2}
                prefix="$"
              />
            </div>
            <p className="text-[10px] sm:text-xs text-white/40 flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white rounded-full animate-pulse"></span>
              Live from CoinGecko
            </p>
          </div>

          <div className="p-4 sm:p-6 rounded-xl border border-white/10 bg-white/5 shadow-lg shadow-white/5">
            <p className="text-xs sm:text-sm font-medium text-white/60 uppercase tracking-wide mb-1 sm:mb-2">
              Avg Cost per $ZRO
            </p>
            <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-1">
              <AnimatedNumber
                key={`avgcost-${selectedVote.voteNumber}`}
                value={retrospectiveBurn > 0 ? retrospectiveUSDValue / retrospectiveBurn : 0}
                duration={1500}
                decimals={2}
                prefix="$"
              />
            </div>
            <p className="text-[10px] sm:text-xs text-white/40">
              Revenue per ZRO burned
            </p>
          </div>
        </div>

        {/* Charts Section */}
        <div className="space-y-3 sm:space-y-4">
          {/* Cumulative Burn Chart */}
          <div className="p-4 sm:p-6 rounded-xl border border-white/10 bg-white/5 shadow-lg shadow-white/5">
            <div className="mb-4 sm:mb-6">
              <h3 className="text-lg sm:text-xl font-bold text-white mb-1 sm:mb-2">Cumulative Missed Burn Over Time</h3>
              <p className="text-xs sm:text-sm text-white/60">
                Daily accumulation of missed ZRO burns since {new Date(selectedVote.dataStartDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} (using historical ZRO prices)
              </p>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={retrospectiveChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="date" stroke="rgba(255,255,255,0.6)" style={{ fontSize: '12px' }} />
                <YAxis stroke="rgba(255,255,255,0.6)" style={{ fontSize: '12px' }} />
                <Tooltip
                  formatter={(value: number) => value.toLocaleString('en-US')}
                  labelFormatter={(label) => `Date: ${label}`}
                  contentStyle={{ backgroundColor: 'rgba(0,0,0,0.9)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px' }}
                  labelStyle={{ color: 'rgba(255,255,255,0.8)' }}
                />
                <Legend wrapperStyle={{ color: 'rgba(255,255,255,0.8)' }} />
                <Area
                  type="monotone"
                  dataKey="cumulativeBurn"
                  stroke="rgba(255,255,255,1)"
                  fill="rgba(255,255,255,0.3)"
                  fillOpacity={1}
                  strokeWidth={2}
                  name="Cumulative Burn (ZRO)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Daily Metrics Chart */}
          <div className="p-4 sm:p-6 rounded-xl border border-white/10 bg-white/5 shadow-lg shadow-white/5">
            <div className="mb-4 sm:mb-6">
              <h3 className="text-lg sm:text-xl font-bold text-white mb-1 sm:mb-2">Daily Message Volume & Burn</h3>
              <p className="text-xs sm:text-sm text-white/60">
                Historical message count and corresponding daily burn amounts (calculated with actual ZRO price per day)
              </p>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={retrospectiveChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="date" stroke="rgba(255,255,255,0.6)" style={{ fontSize: '12px' }} />
                <YAxis yAxisId="left" stroke="rgba(255,255,255,0.6)" style={{ fontSize: '12px' }} />
                <YAxis yAxisId="right" orientation="right" stroke="rgba(255,255,255,0.4)" style={{ fontSize: '12px' }} />
                <Tooltip
                  formatter={(value: number) => value.toLocaleString('en-US')}
                  contentStyle={{ backgroundColor: 'rgba(0,0,0,0.9)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px' }}
                  labelStyle={{ color: 'rgba(255,255,255,0.8)' }}
                />
                <Legend wrapperStyle={{ color: 'rgba(255,255,255,0.8)' }} />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="messages"
                  stroke="rgba(255,255,255,1)"
                  name="Messages"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="dailyBurn"
                  stroke="rgba(255,255,255,0.6)"
                  name="Daily Burn (ZRO)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* ZRO Price History Chart - TradingView */}
          <TradingViewPriceChart
            data={retrospectiveChartData.map(d => ({
              date: new Date(d.date).toISOString().split('T')[0],
              price: d.zroPrice
            }))}
            title="Historical ZRO Price"
            description="ZRO token price movement with interactive chart (hover for details)"
          />
        </div>

        {/* Predictive Section */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <TrendingUp className="h-6 w-6 text-white/60" />
            <h2 className="text-3xl font-bold text-white">Predictive Analysis</h2>
          </div>

          <div className="p-6 rounded-xl border border-white/10 bg-white/5 shadow-lg shadow-white/5">
            <div className="mb-6">
              <h3 className="text-xl font-bold text-white mb-2">Volume Trend Analysis</h3>
              <p className="text-sm text-white/60">
                Based on last 30 days of message volume data
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm font-medium text-white/60 uppercase tracking-wide mb-2">Trend Direction</p>
                <p className="text-2xl font-bold text-white capitalize flex items-center gap-2">
                  {trendInfo.trend}
                  {trendInfo.trend === 'increasing' && <TrendingUp className="h-5 w-5 text-white" />}
                  {trendInfo.trend === 'decreasing' && <TrendingDown className="h-5 w-5 text-white" />}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-white/60 uppercase tracking-wide mb-2">Daily Change Rate</p>
                <p className="text-2xl font-bold text-white">
                  <AnimatedNumber
                    value={trendInfo.percentChangePerDay}
                    duration={1500}
                    decimals={2}
                    prefix={trendInfo.percentChangePerDay > 0 ? '+' : ''}
                    suffix="%"
                  />
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-white/60 uppercase tracking-wide mb-2">Volume Slope</p>
                <p className="text-2xl font-bold text-white">
                  <AnimatedNumber
                    value={Math.round(trendInfo.slope)}
                    duration={1500}
                    decimals={0}
                    prefix={trendInfo.slope > 0 ? '+' : ''}
                    suffix=" msg/day"
                    separator={true}
                  />
                </p>
              </div>
            </div>
          </div>

          {/* Prediction Controls */}
          <div className="p-6 rounded-xl border border-white/10 bg-white/5 shadow-lg shadow-white/5">
            <div className="mb-6">
              <h3 className="text-xl font-bold text-white mb-2">Future Burn Projection</h3>
              <p className="text-sm text-white/60">
                Adjust the slider to project future burn based on current trends (using avg price: ${prediction.avgZROPrice.toFixed(2)})
              </p>
            </div>
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="prediction-slider" className="text-base font-medium text-white">
                    Projection Period: <AnimatedNumber value={predictiveDays} duration={500} decimals={0} /> days
                  </Label>
                  <span className="text-sm text-white/60">
                    (1-90 days ahead)
                  </span>
                </div>
                <Slider
                  id="prediction-slider"
                  min={1}
                  max={90}
                  step={1}
                  value={[predictiveDays]}
                  onValueChange={handlePredictiveDaysChange}
                  className="w-full"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                <div className="p-6 rounded-xl border border-white/20 bg-white/10 shadow-lg shadow-white/5">
                  <p className="text-sm font-medium text-white/60 uppercase tracking-wide mb-2">
                    Projected Future Burn
                  </p>
                  <div className="text-4xl font-bold text-white mb-1">
                    <AnimatedNumber
                      value={prediction.totalBurn}
                      duration={1500}
                      decimals={0}
                      suffix=" ZRO"
                      separator={true}
                    />
                  </div>
                  <p className="text-xs text-white/40">
                    Over next <AnimatedNumber value={predictiveDays} duration={500} decimals={0} /> days
                  </p>
                </div>

                <div className="p-6 rounded-xl border border-white/20 bg-white/10 shadow-lg shadow-white/5">
                  <p className="text-sm font-medium text-white/60 uppercase tracking-wide mb-2">
                    Projected USD Value
                  </p>
                  <div className="text-4xl font-bold text-white mb-1">
                    <AnimatedNumber
                      value={prediction.totalUSDValue}
                      duration={1500}
                      decimals={0}
                      prefix="$"
                      separator={true}
                    />
                  </div>
                  <p className="text-xs text-white/40">
                    In protocol fees
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Combined Total */}
          <div className="p-8 rounded-xl border border-white/20 bg-gradient-to-b from-white/10 to-white/5 shadow-xl shadow-white/10">
            <div className="text-center space-y-4">
              <h3 className="text-2xl font-bold text-white">
                Total Projected Burn (Retrospective + Predictive)
              </h3>
              <p className="text-sm text-white/60">
                Combined missed burn from {new Date(selectedVote.dataStartDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} through next <AnimatedNumber value={predictiveDays} duration={500} decimals={0} /> days
              </p>
              <div className="text-5xl md:text-6xl font-bold text-white pt-4">
                <AnimatedNumber
                  value={retrospectiveBurn + prediction.totalBurn}
                  duration={1500}
                  decimals={0}
                  suffix=" ZRO"
                  separator={true}
                />
              </div>
              <p className="text-xl text-white/80 font-light">
                <AnimatedNumber
                  value={retrospectiveUSDValue + prediction.totalUSDValue}
                  duration={1500}
                  decimals={0}
                  prefix="$"
                  separator={true}
                />{' '}
                in total missed fees
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 rounded-xl border border-white/10 bg-white/5 text-center text-sm text-white/60 space-y-2">
          <p>
            {isRealData
              ? 'This dashboard uses real LayerZero message data from Dune Analytics and live ZRO prices from CoinGecko.'
              : 'This dashboard is using mock data. Database needs to be initialized by an administrator.'}
          </p>
          {isRealData && marketData.lastUpdated && (
            <p>
              Data is cached in a local database and updated daily. Last updated: {marketData.lastUpdated?.toLocaleString()}
            </p>
          )}
          <p className="text-xs text-white/40">
            {selectedVote.label} Failed: {new Date(selectedVote.voteEndDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} | Current ZRO Price: ${marketData.zroPrice.toFixed(2)}
          </p>
        </div>
      </div>
    </main>
  );
}
