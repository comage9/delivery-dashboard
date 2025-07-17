/**
 * 스트리밍 차트 업데이터
 * 실시간 데이터 스트림을 받아 차트를 자동으로 업데이트
 */

import { EventEmitter } from '../core/utils/EventEmitter.js';

export class StreamingChartUpdater extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      maxDataPoints: config.maxDataPoints || 100,
      updateInterval: config.updateInterval || 1000,
      smoothTransition: config.smoothTransition !== false,
      aggregationWindow: config.aggregationWindow || 5000,
      batchSize: config.batchSize || 10,
      enableFiltering: config.enableFiltering !== false,
      enableAggregation: config.enableAggregation !== false,
      ...config
    };

    this.charts = new Map();
    this.updateQueues = new Map();
    this.updateTimers = new Map();
    this.dataFilters = new Map();
    this.aggregators = new Map();
    this.lastUpdateTimes = new Map();
    
    // 성능 메트릭
    this.metrics = {
      totalUpdates: 0,
      successfulUpdates: 0,
      failedUpdates: 0,
      averageUpdateTime: 0,
      queueSize: 0,
      droppedUpdates: 0
    };

    this.init();
  }

  /**
   * 초기화
   */
  async init() {
    try {
      console.log('StreamingChartUpdater 초기화 중...');
      
      // 기본 데이터 필터 설정
      this.setupDefaultFilters();
      
      // 기본 집계기 설정
      this.setupDefaultAggregators();
      
      // 메트릭 업데이트 타이머
      this.setupMetricsTimer();
      
      console.log('StreamingChartUpdater 초기화 완료');
      
    } catch (error) {
      console.error('StreamingChartUpdater 초기화 실패:', error);
      throw error;
    }
  }

  /**
   * 차트 등록
   */
  registerChart(chartId, chartInstance, options = {}) {
    if (this.charts.has(chartId)) {
      console.warn(`차트가 이미 등록되어 있습니다: ${chartId}`);
      return false;
    }

    const chartConfig = {
      instance: chartInstance,
      options: {
        maxDataPoints: options.maxDataPoints || this.config.maxDataPoints,
        updateInterval: options.updateInterval || this.config.updateInterval,
        smoothTransition: options.smoothTransition !== false,
        datasetMapping: options.datasetMapping || {},
        filters: options.filters || [],
        aggregator: options.aggregator || null,
        ...options
      },
      lastUpdate: 0,
      dataBuffer: [],
      updateCount: 0
    };

    this.charts.set(chartId, chartConfig);
    this.updateQueues.set(chartId, []);
    this.lastUpdateTimes.set(chartId, Date.now());
    
    // 업데이트 타이머 시작
    this.startUpdateTimer(chartId);
    
    console.log(`차트 등록: ${chartId}`);
    this.emit('chartRegistered', { chartId });
    
    return true;
  }

  /**
   * 차트 등록 해제
   */
  unregisterChart(chartId) {
    if (!this.charts.has(chartId)) {
      return false;
    }

    // 타이머 정리
    this.stopUpdateTimer(chartId);
    
    // 데이터 정리
    this.charts.delete(chartId);
    this.updateQueues.delete(chartId);
    this.lastUpdateTimes.delete(chartId);
    
    console.log(`차트 등록 해제: ${chartId}`);
    this.emit('chartUnregistered', { chartId });
    
    return true;
  }

  /**
   * 스트림 데이터 수신
   */
  async onStreamData(chartId, data, timestamp = Date.now()) {
    const chartConfig = this.charts.get(chartId);
    
    if (!chartConfig) {
      console.warn(`등록되지 않은 차트: ${chartId}`);
      return false;
    }

    try {
      // 데이터 필터링
      const filteredData = await this.filterData(chartId, data);
      
      if (filteredData === null) {
        return false; // 필터링으로 인해 데이터 제외
      }

      // 업데이트 큐에 추가
      const updateQueue = this.updateQueues.get(chartId);
      updateQueue.push({
        data: filteredData,
        timestamp,
        id: this.generateUpdateId()
      });

      // 큐 크기 제한
      if (updateQueue.length > this.config.batchSize * 2) {
        updateQueue.shift();
        this.metrics.droppedUpdates++;
      }

      this.metrics.queueSize = updateQueue.length;
      
      return true;
      
    } catch (error) {
      console.error(`스트림 데이터 처리 오류 (${chartId}):`, error);
      this.metrics.failedUpdates++;
      this.emit('updateError', { chartId, error });
      return false;
    }
  }

  /**
   * 배치 데이터 수신
   */
  async onBatchData(chartId, dataArray) {
    const results = [];
    
    for (const dataItem of dataArray) {
      const result = await this.onStreamData(chartId, dataItem.data, dataItem.timestamp);
      results.push(result);
    }
    
    return results;
  }

  /**
   * 차트 업데이트 타이머 시작
   */
  startUpdateTimer(chartId) {
    this.stopUpdateTimer(chartId);
    
    const chartConfig = this.charts.get(chartId);
    const interval = chartConfig.options.updateInterval;
    
    const timer = setInterval(() => {
      this.processUpdateQueue(chartId);
    }, interval);
    
    this.updateTimers.set(chartId, timer);
  }

  /**
   * 차트 업데이트 타이머 중지
   */
  stopUpdateTimer(chartId) {
    const timer = this.updateTimers.get(chartId);
    
    if (timer) {
      clearInterval(timer);
      this.updateTimers.delete(chartId);
    }
  }

  /**
   * 업데이트 큐 처리
   */
  async processUpdateQueue(chartId) {
    const updateQueue = this.updateQueues.get(chartId);
    const chartConfig = this.charts.get(chartId);
    
    if (!updateQueue || !chartConfig || updateQueue.length === 0) {
      return;
    }

    const startTime = performance.now();
    
    try {
      // 배치 크기만큼 데이터 가져오기
      const batchData = updateQueue.splice(0, this.config.batchSize);
      
      // 데이터 집계
      const aggregatedData = await this.aggregateData(chartId, batchData);
      
      // 차트 업데이트
      await this.updateChart(chartId, aggregatedData);
      
      // 메트릭 업데이트
      const updateTime = performance.now() - startTime;
      this.updateMetrics(true, updateTime);
      
      chartConfig.lastUpdate = Date.now();
      chartConfig.updateCount++;
      
      this.emit('chartUpdated', { chartId, dataCount: batchData.length, updateTime });
      
    } catch (error) {
      console.error(`차트 업데이트 오류 (${chartId}):`, error);
      this.updateMetrics(false, 0);
      this.emit('updateError', { chartId, error });
    }
  }

  /**
   * 차트 업데이트 실행
   */
  async updateChart(chartId, data) {
    const chartConfig = this.charts.get(chartId);
    const chart = chartConfig.instance;
    
    if (!chart || !chart.data) {
      throw new Error('유효하지 않은 차트 인스턴스');
    }

    // 데이터 매핑
    const mappedData = this.mapDataToChart(data, chartConfig.options.datasetMapping);
    
    // 차트 타입별 업데이트 처리
    switch (chart.config.type) {
      case 'line':
      case 'bar':
      case 'area':
        await this.updateTimeSeriesChart(chart, mappedData, chartConfig.options);
        break;
      case 'pie':
      case 'doughnut':
        await this.updatePieChart(chart, mappedData, chartConfig.options);
        break;
      case 'scatter':
        await this.updateScatterChart(chart, mappedData, chartConfig.options);
        break;
      case 'heatmap':
        await this.updateHeatmapChart(chart, mappedData, chartConfig.options);
        break;
      default:
        await this.updateGenericChart(chart, mappedData, chartConfig.options);
        break;
    }
    
    // 애니메이션 처리
    if (chartConfig.options.smoothTransition) {
      chart.update('none');
    } else {
      chart.update();
    }
  }

  /**
   * 시계열 차트 업데이트
   */
  async updateTimeSeriesChart(chart, data, options) {
    const chartData = chart.data;
    
    // 라벨 추가
    if (data.labels) {
      chartData.labels.push(...data.labels);
      
      // 최대 데이터 포인트 수 제한
      if (chartData.labels.length > options.maxDataPoints) {
        const excess = chartData.labels.length - options.maxDataPoints;
        chartData.labels.splice(0, excess);
      }
    }
    
    // 데이터셋 업데이트
    if (data.datasets) {
      data.datasets.forEach((newDataset, index) => {
        if (index < chartData.datasets.length) {
          const dataset = chartData.datasets[index];
          
          // 데이터 추가
          if (Array.isArray(newDataset.data)) {
            dataset.data.push(...newDataset.data);
          } else {
            dataset.data.push(newDataset.data);
          }
          
          // 최대 데이터 포인트 수 제한
          if (dataset.data.length > options.maxDataPoints) {
            const excess = dataset.data.length - options.maxDataPoints;
            dataset.data.splice(0, excess);
          }
        }
      });
    }
  }

  /**
   * 파이 차트 업데이트
   */
  async updatePieChart(chart, data, options) {
    const chartData = chart.data;
    
    // 라벨 업데이트
    if (data.labels) {
      chartData.labels = data.labels;
    }
    
    // 데이터 업데이트
    if (data.datasets && data.datasets.length > 0) {
      if (chartData.datasets.length === 0) {
        chartData.datasets.push({});
      }
      
      const dataset = chartData.datasets[0];
      const newDataset = data.datasets[0];
      
      dataset.data = newDataset.data;
      
      if (newDataset.backgroundColor) {
        dataset.backgroundColor = newDataset.backgroundColor;
      }
    }
  }

  /**
   * 산점도 차트 업데이트
   */
  async updateScatterChart(chart, data, options) {
    const chartData = chart.data;
    
    if (data.datasets) {
      data.datasets.forEach((newDataset, index) => {
        if (index < chartData.datasets.length) {
          const dataset = chartData.datasets[index];
          
          // 포인트 데이터 추가
          if (Array.isArray(newDataset.data)) {
            dataset.data.push(...newDataset.data);
          } else {
            dataset.data.push(newDataset.data);
          }
          
          // 최대 포인트 수 제한
          if (dataset.data.length > options.maxDataPoints) {
            const excess = dataset.data.length - options.maxDataPoints;
            dataset.data.splice(0, excess);
          }
        }
      });
    }
  }

  /**
   * 히트맵 차트 업데이트
   */
  async updateHeatmapChart(chart, data, options) {
    const chartData = chart.data;
    
    if (data.datasets && data.datasets.length > 0) {
      if (chartData.datasets.length === 0) {
        chartData.datasets.push({});
      }
      
      const dataset = chartData.datasets[0];
      const newDataset = data.datasets[0];
      
      // 히트맵 데이터는 완전 교체
      dataset.data = newDataset.data;
    }
  }

  /**
   * 일반 차트 업데이트
   */
  async updateGenericChart(chart, data, options) {
    // 기본적으로 시계열 차트 업데이트 로직 사용
    await this.updateTimeSeriesChart(chart, data, options);
  }

  /**
   * 데이터 필터링
   */
  async filterData(chartId, data) {
    const chartConfig = this.charts.get(chartId);
    const filters = chartConfig.options.filters;
    
    if (!filters || filters.length === 0) {
      return data;
    }

    let filteredData = data;
    
    for (const filterName of filters) {
      const filter = this.dataFilters.get(filterName);
      
      if (filter) {
        filteredData = await filter(filteredData);
        
        if (filteredData === null) {
          return null; // 필터링으로 인해 데이터 제외
        }
      }
    }
    
    return filteredData;
  }

  /**
   * 데이터 집계
   */
  async aggregateData(chartId, batchData) {
    const chartConfig = this.charts.get(chartId);
    const aggregatorName = chartConfig.options.aggregator;
    
    if (!aggregatorName || batchData.length === 0) {
      return this.createChartDataFromBatch(batchData);
    }

    const aggregator = this.aggregators.get(aggregatorName);
    
    if (!aggregator) {
      console.warn(`집계기를 찾을 수 없습니다: ${aggregatorName}`);
      return this.createChartDataFromBatch(batchData);
    }

    return await aggregator(batchData);
  }

  /**
   * 배치 데이터에서 차트 데이터 생성
   */
  createChartDataFromBatch(batchData) {
    if (batchData.length === 0) {
      return {};
    }

    // 시간순 정렬
    batchData.sort((a, b) => a.timestamp - b.timestamp);
    
    const labels = batchData.map(item => new Date(item.timestamp).toLocaleTimeString());
    const data = batchData.map(item => item.data);
    
    return {
      labels,
      datasets: [{
        data: data
      }]
    };
  }

  /**
   * 데이터 차트 매핑
   */
  mapDataToChart(data, mapping) {
    if (!mapping || Object.keys(mapping).length === 0) {
      return data;
    }

    const mappedData = {};
    
    for (const [chartField, dataField] of Object.entries(mapping)) {
      if (data[dataField] !== undefined) {
        mappedData[chartField] = data[dataField];
      }
    }
    
    return Object.keys(mappedData).length > 0 ? mappedData : data;
  }

  /**
   * 기본 필터 설정
   */
  setupDefaultFilters() {
    // 널 값 필터
    this.dataFilters.set('removeNull', (data) => {
      if (data === null || data === undefined) {
        return null;
      }
      return data;
    });

    // 숫자 범위 필터
    this.dataFilters.set('numberRange', (data) => {
      if (typeof data !== 'number') {
        return data;
      }
      
      const min = -1000000;
      const max = 1000000;
      
      return (data >= min && data <= max) ? data : null;
    });

    // 중복 제거 필터 (시간 기반)
    this.dataFilters.set('removeDuplicates', (data) => {
      // 실제 구현에서는 이전 데이터와 비교하여 중복 제거
      return data;
    });

    // 이상치 필터
    this.dataFilters.set('removeOutliers', (data) => {
      if (typeof data !== 'number') {
        return data;
      }
      
      // 간단한 이상치 탐지 (Z-score 기반)
      const mean = 0; // 실제로는 이동 평균 계산
      const std = 1;   // 실제로는 표준편차 계산
      const zScore = Math.abs((data - mean) / std);
      
      return zScore < 3 ? data : null;
    });
  }

  /**
   * 기본 집계기 설정
   */
  setupDefaultAggregators() {
    // 평균 집계기
    this.aggregators.set('average', (batchData) => {
      if (batchData.length === 0) return {};
      
      const values = batchData.map(item => item.data).filter(val => typeof val === 'number');
      const average = values.reduce((sum, val) => sum + val, 0) / values.length;
      
      return {
        labels: [new Date(batchData[batchData.length - 1].timestamp).toLocaleTimeString()],
        datasets: [{
          data: [average]
        }]
      };
    });

    // 합계 집계기
    this.aggregators.set('sum', (batchData) => {
      if (batchData.length === 0) return {};
      
      const values = batchData.map(item => item.data).filter(val => typeof val === 'number');
      const sum = values.reduce((sum, val) => sum + val, 0);
      
      return {
        labels: [new Date(batchData[batchData.length - 1].timestamp).toLocaleTimeString()],
        datasets: [{
          data: [sum]
        }]
      };
    });

    // 최대값 집계기
    this.aggregators.set('max', (batchData) => {
      if (batchData.length === 0) return {};
      
      const values = batchData.map(item => item.data).filter(val => typeof val === 'number');
      const max = Math.max(...values);
      
      return {
        labels: [new Date(batchData[batchData.length - 1].timestamp).toLocaleTimeString()],
        datasets: [{
          data: [max]
        }]
      };
    });

    // 최소값 집계기
    this.aggregators.set('min', (batchData) => {
      if (batchData.length === 0) return {};
      
      const values = batchData.map(item => item.data).filter(val => typeof val === 'number');
      const min = Math.min(...values);
      
      return {
        labels: [new Date(batchData[batchData.length - 1].timestamp).toLocaleTimeString()],
        datasets: [{
          data: [min]
        }]
      };
    });

    // 이동평균 집계기
    this.aggregators.set('movingAverage', (batchData) => {
      if (batchData.length === 0) return {};
      
      const windowSize = 5;
      const values = batchData.map(item => item.data).filter(val => typeof val === 'number');
      
      if (values.length < windowSize) {
        return this.aggregators.get('average')(batchData);
      }
      
      const recentValues = values.slice(-windowSize);
      const movingAvg = recentValues.reduce((sum, val) => sum + val, 0) / recentValues.length;
      
      return {
        labels: [new Date(batchData[batchData.length - 1].timestamp).toLocaleTimeString()],
        datasets: [{
          data: [movingAvg]
        }]
      };
    });
  }

  /**
   * 사용자 정의 필터 등록
   */
  registerFilter(name, filter) {
    this.dataFilters.set(name, filter);
    console.log(`데이터 필터 등록: ${name}`);
    return true;
  }

  /**
   * 사용자 정의 집계기 등록
   */
  registerAggregator(name, aggregator) {
    this.aggregators.set(name, aggregator);
    console.log(`데이터 집계기 등록: ${name}`);
    return true;
  }

  /**
   * 차트 옵션 업데이트
   */
  updateChartOptions(chartId, options) {
    const chartConfig = this.charts.get(chartId);
    
    if (!chartConfig) {
      return false;
    }

    chartConfig.options = { ...chartConfig.options, ...options };
    
    // 업데이트 간격 변경 시 타이머 재시작
    if (options.updateInterval) {
      this.startUpdateTimer(chartId);
    }
    
    console.log(`차트 옵션 업데이트: ${chartId}`);
    return true;
  }

  /**
   * 차트 데이터 초기화
   */
  clearChartData(chartId) {
    const chartConfig = this.charts.get(chartId);
    
    if (!chartConfig) {
      return false;
    }

    const chart = chartConfig.instance;
    
    if (chart && chart.data) {
      chart.data.labels = [];
      chart.data.datasets.forEach(dataset => {
        dataset.data = [];
      });
      
      chart.update();
    }
    
    // 업데이트 큐 초기화
    const updateQueue = this.updateQueues.get(chartId);
    if (updateQueue) {
      updateQueue.length = 0;
    }
    
    console.log(`차트 데이터 초기화: ${chartId}`);
    return true;
  }

  /**
   * 메트릭 업데이트
   */
  updateMetrics(success, updateTime) {
    this.metrics.totalUpdates++;
    
    if (success) {
      this.metrics.successfulUpdates++;
      
      // 평균 업데이트 시간 계산
      const currentAvg = this.metrics.averageUpdateTime;
      this.metrics.averageUpdateTime = (currentAvg + updateTime) / 2;
    } else {
      this.metrics.failedUpdates++;
    }
  }

  /**
   * 메트릭 타이머 설정
   */
  setupMetricsTimer() {
    setInterval(() => {
      this.updateQueueSizeMetric();
    }, 1000);
  }

  /**
   * 큐 크기 메트릭 업데이트
   */
  updateQueueSizeMetric() {
    const totalQueueSize = Array.from(this.updateQueues.values())
      .reduce((total, queue) => total + queue.length, 0);
    
    this.metrics.queueSize = totalQueueSize;
  }

  /**
   * 업데이트 ID 생성
   */
  generateUpdateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }

  /**
   * 등록된 차트 목록 조회
   */
  getRegisteredCharts() {
    return Array.from(this.charts.entries()).map(([id, config]) => ({
      id,
      options: config.options,
      lastUpdate: config.lastUpdate,
      updateCount: config.updateCount
    }));
  }

  /**
   * 차트 상태 조회
   */
  getChartStatus(chartId) {
    const chartConfig = this.charts.get(chartId);
    const updateQueue = this.updateQueues.get(chartId);
    
    if (!chartConfig || !updateQueue) {
      return null;
    }

    return {
      id: chartId,
      options: chartConfig.options,
      lastUpdate: chartConfig.lastUpdate,
      updateCount: chartConfig.updateCount,
      queueSize: updateQueue.length,
      isActive: this.updateTimers.has(chartId)
    };
  }

  /**
   * 성능 메트릭 조회
   */
  getMetrics() {
    return {
      ...this.metrics,
      registeredCharts: this.charts.size,
      activeTimers: this.updateTimers.size,
      totalFilters: this.dataFilters.size,
      totalAggregators: this.aggregators.size
    };
  }

  /**
   * 리소스 정리
   */
  async destroy() {
    try {
      // 모든 타이머 정리
      for (const chartId of this.updateTimers.keys()) {
        this.stopUpdateTimer(chartId);
      }
      
      // 데이터 정리
      this.charts.clear();
      this.updateQueues.clear();
      this.dataFilters.clear();
      this.aggregators.clear();
      this.lastUpdateTimes.clear();
      
      // 이벤트 리스너 제거
      this.removeAllListeners();
      
      console.log('StreamingChartUpdater 리소스 정리 완료');
      
    } catch (error) {
      console.error('StreamingChartUpdater 리소스 정리 실패:', error);
    }
  }
}

export default StreamingChartUpdater;