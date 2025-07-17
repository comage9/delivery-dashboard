/**
 * 데이터 처리기
 * 다양한 형태의 데이터를 차트에 적합한 형태로 변환
 */

export class DataProcessor {
  constructor() {
    this.transformers = new Map();
    this.validators = new Map();
    this.normalizers = new Map();
    
    this.setupDefaultTransformers();
    this.setupDefaultValidators();
    this.setupDefaultNormalizers();
  }

  /**
   * 메인 데이터 처리 메소드
   */
  async process(data, chartType, options = {}) {
    try {
      // 1. 데이터 검증
      await this.validate(data, chartType);
      
      // 2. 데이터 정규화
      const normalizedData = await this.normalize(data, chartType, options);
      
      // 3. 데이터 변환
      const transformedData = await this.transform(normalizedData, chartType, options);
      
      // 4. 후처리
      const processedData = await this.postProcess(transformedData, chartType, options);
      
      return processedData;
      
    } catch (error) {
      throw new Error(`데이터 처리 실패: ${error.message}`);
    }
  }

  /**
   * 데이터 검증
   */
  async validate(data, chartType) {
    const validator = this.validators.get(chartType) || this.validators.get('default');
    
    if (validator) {
      const result = await validator(data);
      if (!result.valid) {
        throw new Error(`데이터 검증 실패: ${result.errors.join(', ')}`);
      }
    }
    
    return true;
  }

  /**
   * 데이터 정규화
   */
  async normalize(data, chartType, options = {}) {
    const normalizer = this.normalizers.get(chartType) || this.normalizers.get('default');
    
    if (normalizer) {
      return await normalizer(data, options);
    }
    
    return data;
  }

  /**
   * 데이터 변환
   */
  async transform(data, chartType, options = {}) {
    const transformer = this.transformers.get(chartType) || this.transformers.get('default');
    
    if (transformer) {
      return await transformer(data, options);
    }
    
    return data;
  }

  /**
   * 후처리
   */
  async postProcess(data, chartType, options = {}) {
    // 색상 자동 적용
    if (options.autoColor !== false) {
      data = this.applyAutoColors(data, options);
    }
    
    // 라벨 자동 생성
    if (options.autoLabel !== false) {
      data = this.applyAutoLabels(data, options);
    }
    
    // 데이터 정렬
    if (options.sort) {
      data = this.sortData(data, options.sort);
    }
    
    // 데이터 필터링
    if (options.filter) {
      data = this.filterData(data, options.filter);
    }
    
    return data;
  }

  /**
   * 기본 변환기 설정
   */
  setupDefaultTransformers() {
    // 라인 차트 변환기
    this.transformers.set('line', async (data, options) => {
      return this.transformLineData(data, options);
    });

    // 바 차트 변환기
    this.transformers.set('bar', async (data, options) => {
      return this.transformBarData(data, options);
    });

    // 파이 차트 변환기
    this.transformers.set('pie', async (data, options) => {
      return this.transformPieData(data, options);
    });

    // 산점도 변환기
    this.transformers.set('scatter', async (data, options) => {
      return this.transformScatterData(data, options);
    });

    // 히트맵 변환기
    this.transformers.set('heatmap', async (data, options) => {
      return this.transformHeatmapData(data, options);
    });

    // 박스플롯 변환기
    this.transformers.set('boxplot', async (data, options) => {
      return this.transformBoxplotData(data, options);
    });

    // 바이올린 플롯 변환기
    this.transformers.set('violin', async (data, options) => {
      return this.transformViolinData(data, options);
    });

    // 워터폴 변환기
    this.transformers.set('waterfall', async (data, options) => {
      return this.transformWaterfallData(data, options);
    });

    // 게이지 변환기
    this.transformers.set('gauge', async (data, options) => {
      return this.transformGaugeData(data, options);
    });

    // 캔들스틱 변환기
    this.transformers.set('candlestick', async (data, options) => {
      return this.transformCandlestickData(data, options);
    });

    // 간트 차트 변환기
    this.transformers.set('gantt', async (data, options) => {
      return this.transformGanttData(data, options);
    });

    // 네트워크 차트 변환기
    this.transformers.set('network', async (data, options) => {
      return this.transformNetworkData(data, options);
    });

    // 트리맵 변환기
    this.transformers.set('treemap', async (data, options) => {
      return this.transformTreemapData(data, options);
    });

    // 선버스트 변환기
    this.transformers.set('sunburst', async (data, options) => {
      return this.transformSunburstData(data, options);
    });

    // 산키 다이어그램 변환기
    this.transformers.set('sankey', async (data, options) => {
      return this.transformSankeyData(data, options);
    });

    // 기본 변환기
    this.transformers.set('default', async (data, options) => {
      return this.transformGenericData(data, options);
    });
  }

  /**
   * 기본 검증기 설정
   */
  setupDefaultValidators() {
    // 라인 차트 검증기
    this.validators.set('line', (data) => {
      return this.validateLineData(data);
    });

    // 바 차트 검증기
    this.validators.set('bar', (data) => {
      return this.validateBarData(data);
    });

    // 파이 차트 검증기
    this.validators.set('pie', (data) => {
      return this.validatePieData(data);
    });

    // 산점도 검증기
    this.validators.set('scatter', (data) => {
      return this.validateScatterData(data);
    });

    // 기본 검증기
    this.validators.set('default', (data) => {
      return this.validateGenericData(data);
    });
  }

  /**
   * 기본 정규화기 설정
   */
  setupDefaultNormalizers() {
    // 배열 데이터 정규화
    this.normalizers.set('array', (data, options) => {
      return this.normalizeArrayData(data, options);
    });

    // 객체 데이터 정규화
    this.normalizers.set('object', (data, options) => {
      return this.normalizeObjectData(data, options);
    });

    // CSV 데이터 정규화
    this.normalizers.set('csv', (data, options) => {
      return this.normalizeCSVData(data, options);
    });

    // 기본 정규화기
    this.normalizers.set('default', (data, options) => {
      return this.normalizeGenericData(data, options);
    });
  }

  // === 차트 타입별 변환 메소드 ===

  /**
   * 라인 차트 데이터 변환
   */
  transformLineData(data, options) {
    // 이미 Chart.js 형식이면 그대로 반환
    if (data.labels && data.datasets) {
      return data;
    }

    // 배열 데이터 처리
    if (Array.isArray(data)) {
      return {
        labels: data.map((_, index) => `Point ${index + 1}`),
        datasets: [{
          label: options.label || 'Dataset',
          data: data,
          borderColor: options.borderColor || '#3B82F6',
          backgroundColor: options.backgroundColor || '#3B82F620',
          tension: 0.4
        }]
      };
    }

    // 객체 배열 처리
    if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'object') {
      const labels = data.map(item => item.x || item.label || item.name);
      const values = data.map(item => item.y || item.value);
      
      return {
        labels,
        datasets: [{
          label: options.label || 'Dataset',
          data: values,
          borderColor: options.borderColor || '#3B82F6',
          backgroundColor: options.backgroundColor || '#3B82F620',
          tension: 0.4
        }]
      };
    }

    // 시계열 데이터 처리
    if (data.timeSeries) {
      return {
        labels: data.timeSeries.map(item => item.timestamp),
        datasets: [{
          label: options.label || 'Time Series',
          data: data.timeSeries.map(item => item.value),
          borderColor: options.borderColor || '#3B82F6',
          backgroundColor: options.backgroundColor || '#3B82F620',
          tension: 0.4
        }]
      };
    }

    return data;
  }

  /**
   * 바 차트 데이터 변환
   */
  transformBarData(data, options) {
    // 이미 Chart.js 형식이면 그대로 반환
    if (data.labels && data.datasets) {
      return data;
    }

    // 객체 배열 처리
    if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'object') {
      const labels = data.map(item => item.category || item.label || item.name);
      const values = data.map(item => item.value || item.y);
      
      return {
        labels,
        datasets: [{
          label: options.label || 'Dataset',
          data: values,
          backgroundColor: options.backgroundColor || '#3B82F6',
          borderColor: options.borderColor || '#3B82F6',
          borderWidth: 1
        }]
      };
    }

    // 카테고리-값 쌍 처리
    if (data.categories && data.values) {
      return {
        labels: data.categories,
        datasets: [{
          label: options.label || 'Dataset',
          data: data.values,
          backgroundColor: options.backgroundColor || '#3B82F6',
          borderColor: options.borderColor || '#3B82F6',
          borderWidth: 1
        }]
      };
    }

    return data;
  }

  /**
   * 파이 차트 데이터 변환
   */
  transformPieData(data, options) {
    // 이미 Chart.js 형식이면 그대로 반환
    if (data.labels && data.datasets) {
      return data;
    }

    // 객체 배열 처리
    if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'object') {
      const labels = data.map(item => item.label || item.name || item.category);
      const values = data.map(item => item.value || item.y);
      
      return {
        labels,
        datasets: [{
          label: options.label || 'Dataset',
          data: values,
          backgroundColor: this.generateColors(values.length),
          borderWidth: 1
        }]
      };
    }

    // 라벨-값 쌍 처리
    if (data.labels && data.values) {
      return {
        labels: data.labels,
        datasets: [{
          label: options.label || 'Dataset',
          data: data.values,
          backgroundColor: this.generateColors(data.values.length),
          borderWidth: 1
        }]
      };
    }

    return data;
  }

  /**
   * 산점도 데이터 변환
   */
  transformScatterData(data, options) {
    // 이미 Chart.js 형식이면 그대로 반환
    if (data.datasets) {
      return data;
    }

    // 객체 배열 처리
    if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'object') {
      const points = data.map(item => ({
        x: item.x,
        y: item.y
      }));
      
      return {
        datasets: [{
          label: options.label || 'Dataset',
          data: points,
          backgroundColor: options.backgroundColor || '#3B82F6',
          borderColor: options.borderColor || '#3B82F6',
          pointRadius: 5
        }]
      };
    }

    // x, y 배열 처리
    if (data.x && data.y && Array.isArray(data.x) && Array.isArray(data.y)) {
      const points = data.x.map((x, index) => ({
        x: x,
        y: data.y[index]
      }));
      
      return {
        datasets: [{
          label: options.label || 'Dataset',
          data: points,
          backgroundColor: options.backgroundColor || '#3B82F6',
          borderColor: options.borderColor || '#3B82F6',
          pointRadius: 5
        }]
      };
    }

    return data;
  }

  /**
   * 히트맵 데이터 변환
   */
  transformHeatmapData(data, options) {
    // 2차원 배열 처리
    if (Array.isArray(data) && Array.isArray(data[0])) {
      const heatmapData = [];
      
      for (let row = 0; row < data.length; row++) {
        for (let col = 0; col < data[row].length; col++) {
          heatmapData.push({
            x: col,
            y: row,
            v: data[row][col]
          });
        }
      }
      
      return {
        datasets: [{
          label: options.label || 'Heatmap',
          data: heatmapData,
          backgroundColor: function(context) {
            const value = context.parsed.v;
            return `rgba(59, 130, 246, ${value / 100})`;
          }
        }]
      };
    }

    // 객체 배열 처리
    if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'object') {
      const heatmapData = data.map(item => ({
        x: item.x,
        y: item.y,
        v: item.value || item.v
      }));
      
      return {
        datasets: [{
          label: options.label || 'Heatmap',
          data: heatmapData,
          backgroundColor: function(context) {
            const value = context.parsed.v;
            return `rgba(59, 130, 246, ${value / 100})`;
          }
        }]
      };
    }

    return data;
  }

  /**
   * 박스플롯 데이터 변환
   */
  transformBoxplotData(data, options) {
    // 이미 박스플롯 형식이면 그대로 반환
    if (data.datasets && data.datasets[0] && data.datasets[0].data && data.datasets[0].data[0] && data.datasets[0].data[0].min !== undefined) {
      return data;
    }

    // 숫자 배열 처리
    if (Array.isArray(data) && typeof data[0] === 'number') {
      const stats = this.calculateBoxplotStats(data);
      
      return {
        labels: [options.label || 'Dataset'],
        datasets: [{
          label: options.label || 'Dataset',
          data: [stats],
          backgroundColor: options.backgroundColor || '#3B82F620',
          borderColor: options.borderColor || '#3B82F6',
          borderWidth: 1
        }]
      };
    }

    // 그룹화된 데이터 처리
    if (data.groups && Array.isArray(data.groups)) {
      const labels = [];
      const boxData = [];
      
      data.groups.forEach(group => {
        labels.push(group.label || group.name);
        boxData.push(this.calculateBoxplotStats(group.values));
      });
      
      return {
        labels,
        datasets: [{
          label: options.label || 'Dataset',
          data: boxData,
          backgroundColor: options.backgroundColor || '#3B82F620',
          borderColor: options.borderColor || '#3B82F6',
          borderWidth: 1
        }]
      };
    }

    return data;
  }

  /**
   * 바이올린 플롯 데이터 변환
   */
  transformViolinData(data, options) {
    // 박스플롯 변환을 기반으로 밀도 정보 추가
    const boxplotData = this.transformBoxplotData(data, options);
    
    // 밀도 계산 (KDE 간소화 버전)
    if (Array.isArray(data) && typeof data[0] === 'number') {
      const density = this.calculateKDE(data);
      
      boxplotData.datasets[0].data[0].density = density;
    }

    return boxplotData;
  }

  /**
   * 워터폴 차트 데이터 변환
   */
  transformWaterfallData(data, options) {
    // 객체 배열 처리
    if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'object') {
      const labels = [];
      const values = [];
      const types = [];
      
      let cumulative = 0;
      
      data.forEach(item => {
        labels.push(item.category || item.label || item.name);
        
        if (item.type === 'total') {
          values.push(item.value);
          cumulative = item.value;
        } else {
          cumulative += item.value;
          values.push(cumulative);
        }
        
        types.push(item.type || 'increment');
      });
      
      return {
        labels,
        datasets: [{
          label: options.label || 'Waterfall',
          data: values,
          backgroundColor: function(context) {
            const index = context.dataIndex;
            const value = context.parsed.y;
            const type = types[index];
            
            if (type === 'total') return '#6B7280';
            return value >= 0 ? '#10B981' : '#EF4444';
          },
          borderColor: '#374151',
          borderWidth: 1,
          type: types
        }]
      };
    }

    return data;
  }

  /**
   * 게이지 차트 데이터 변환
   */
  transformGaugeData(data, options) {
    // 숫자 값 처리
    if (typeof data === 'number') {
      return {
        datasets: [{
          label: options.label || 'Gauge',
          data: [data],
          backgroundColor: this.getGaugeColor(data, options.max || 100),
          borderColor: options.borderColor || '#374151',
          borderWidth: 2,
          max: options.max || 100,
          target: options.target
        }]
      };
    }

    // 객체 처리
    if (typeof data === 'object' && data.value !== undefined) {
      return {
        datasets: [{
          label: options.label || 'Gauge',
          data: [data.value],
          backgroundColor: this.getGaugeColor(data.value, data.max || 100),
          borderColor: options.borderColor || '#374151',
          borderWidth: 2,
          max: data.max || 100,
          target: data.target
        }]
      };
    }

    return data;
  }

  /**
   * 캔들스틱 차트 데이터 변환
   */
  transformCandlestickData(data, options) {
    // 객체 배열 처리
    if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'object') {
      const candlestickData = data.map(item => ({
        x: item.date || item.x,
        o: item.open || item.o,
        h: item.high || item.h,
        l: item.low || item.l,
        c: item.close || item.c,
        v: item.volume || item.v
      }));
      
      return {
        datasets: [{
          label: options.label || 'Candlestick',
          data: candlestickData,
          backgroundColor: function(context) {
            const data = context.parsed;
            return data.c >= data.o ? '#10B981' : '#EF4444';
          },
          borderColor: function(context) {
            const data = context.parsed;
            return data.c >= data.o ? '#059669' : '#DC2626';
          },
          borderWidth: 1
        }]
      };
    }

    return data;
  }

  /**
   * 간트 차트 데이터 변환
   */
  transformGanttData(data, options) {
    // 객체 배열 처리
    if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'object') {
      const ganttData = data.map(item => ({
        x: [item.start, item.end],
        y: item.task || item.name,
        progress: item.progress || 0,
        dependencies: item.dependencies || []
      }));
      
      return {
        datasets: [{
          label: options.label || 'Gantt',
          data: ganttData,
          backgroundColor: options.backgroundColor || '#3B82F6',
          borderColor: options.borderColor || '#1D4ED8',
          borderWidth: 1
        }]
      };
    }

    return data;
  }

  /**
   * 네트워크 차트 데이터 변환
   */
  transformNetworkData(data, options) {
    // nodes와 edges 형식 처리
    if (data.nodes && data.edges) {
      return {
        datasets: [{
          label: options.label || 'Network',
          data: {
            nodes: data.nodes.map(node => ({
              id: node.id,
              label: node.label || node.name,
              x: node.x || Math.random() * 100,
              y: node.y || Math.random() * 100,
              size: node.size || 10,
              color: node.color || '#3B82F6'
            })),
            edges: data.edges.map(edge => ({
              source: edge.source,
              target: edge.target,
              weight: edge.weight || 1,
              color: edge.color || '#6B7280'
            }))
          }
        }]
      };
    }

    return data;
  }

  /**
   * 트리맵 데이터 변환
   */
  transformTreemapData(data, options) {
    // 계층적 데이터 처리
    if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'object') {
      const treemapData = data.map(item => ({
        label: item.label || item.name,
        value: item.value || item.size,
        parent: item.parent || null,
        color: item.color || this.generateColors(1)[0]
      }));
      
      return {
        datasets: [{
          label: options.label || 'Treemap',
          data: treemapData,
          backgroundColor: function(context) {
            return context.parsed.color;
          },
          borderColor: '#ffffff',
          borderWidth: 1
        }]
      };
    }

    return data;
  }

  /**
   * 선버스트 데이터 변환
   */
  transformSunburstData(data, options) {
    // 계층적 데이터 처리
    if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'object') {
      const sunburstData = data.map(item => ({
        label: item.label || item.name,
        value: item.value || item.size,
        parent: item.parent || null,
        level: item.level || 0,
        color: item.color || this.generateColors(1)[0]
      }));
      
      return {
        datasets: [{
          label: options.label || 'Sunburst',
          data: sunburstData,
          backgroundColor: function(context) {
            return context.parsed.color;
          },
          borderColor: '#ffffff',
          borderWidth: 1
        }]
      };
    }

    return data;
  }

  /**
   * 산키 다이어그램 데이터 변환
   */
  transformSankeyData(data, options) {
    // nodes와 links 형식 처리
    if (data.nodes && data.links) {
      return {
        datasets: [{
          label: options.label || 'Sankey',
          data: {
            nodes: data.nodes.map(node => ({
              id: node.id,
              name: node.name || node.label,
              color: node.color || '#3B82F6'
            })),
            links: data.links.map(link => ({
              source: link.source,
              target: link.target,
              value: link.value || link.weight,
              color: link.color || '#6B7280'
            }))
          }
        }]
      };
    }

    return data;
  }

  /**
   * 일반 데이터 변환
   */
  transformGenericData(data, options) {
    // 기본적인 형태 변환
    if (Array.isArray(data) && typeof data[0] === 'number') {
      return {
        labels: data.map((_, index) => `Point ${index + 1}`),
        datasets: [{
          label: options.label || 'Dataset',
          data: data,
          backgroundColor: options.backgroundColor || '#3B82F6',
          borderColor: options.borderColor || '#3B82F6'
        }]
      };
    }

    return data;
  }

  // === 검증 메소드 ===

  /**
   * 라인 차트 데이터 검증
   */
  validateLineData(data) {
    if (!data) {
      return { valid: false, errors: ['데이터가 없습니다'] };
    }

    if (data.labels && data.datasets) {
      if (!Array.isArray(data.datasets) || data.datasets.length === 0) {
        return { valid: false, errors: ['데이터셋이 없습니다'] };
      }
    }

    return { valid: true, errors: [] };
  }

  /**
   * 바 차트 데이터 검증
   */
  validateBarData(data) {
    return this.validateLineData(data); // 라인 차트와 동일한 검증
  }

  /**
   * 파이 차트 데이터 검증
   */
  validatePieData(data) {
    if (!data) {
      return { valid: false, errors: ['데이터가 없습니다'] };
    }

    if (data.labels && data.datasets) {
      if (!Array.isArray(data.datasets) || data.datasets.length === 0) {
        return { valid: false, errors: ['데이터셋이 없습니다'] };
      }
      
      const dataset = data.datasets[0];
      if (!dataset.data || !Array.isArray(dataset.data)) {
        return { valid: false, errors: ['데이터 배열이 없습니다'] };
      }
    }

    return { valid: true, errors: [] };
  }

  /**
   * 산점도 데이터 검증
   */
  validateScatterData(data) {
    if (!data) {
      return { valid: false, errors: ['데이터가 없습니다'] };
    }

    if (data.datasets) {
      if (!Array.isArray(data.datasets) || data.datasets.length === 0) {
        return { valid: false, errors: ['데이터셋이 없습니다'] };
      }
      
      const dataset = data.datasets[0];
      if (!dataset.data || !Array.isArray(dataset.data)) {
        return { valid: false, errors: ['데이터 배열이 없습니다'] };
      }
    }

    return { valid: true, errors: [] };
  }

  /**
   * 일반 데이터 검증
   */
  validateGenericData(data) {
    if (!data) {
      return { valid: false, errors: ['데이터가 없습니다'] };
    }

    return { valid: true, errors: [] };
  }

  // === 정규화 메소드 ===

  /**
   * 배열 데이터 정규화
   */
  normalizeArrayData(data, options) {
    if (!Array.isArray(data)) {
      return data;
    }

    // 빈 값 제거
    const cleaned = data.filter(item => item !== null && item !== undefined);
    
    // 숫자 변환
    if (options.convertNumbers) {
      return cleaned.map(item => {
        if (typeof item === 'string' && !isNaN(item)) {
          return parseFloat(item);
        }
        return item;
      });
    }

    return cleaned;
  }

  /**
   * 객체 데이터 정규화
   */
  normalizeObjectData(data, options) {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    // 빈 값 제거
    const cleaned = {};
    
    Object.keys(data).forEach(key => {
      if (data[key] !== null && data[key] !== undefined) {
        cleaned[key] = data[key];
      }
    });

    return cleaned;
  }

  /**
   * CSV 데이터 정규화
   */
  normalizeCSVData(data, options) {
    if (typeof data === 'string') {
      // CSV 파싱
      const lines = data.trim().split('\n');
      const headers = lines[0].split(',');
      
      const objects = lines.slice(1).map(line => {
        const values = line.split(',');
        const obj = {};
        
        headers.forEach((header, index) => {
          obj[header.trim()] = values[index] ? values[index].trim() : null;
        });
        
        return obj;
      });
      
      return objects;
    }

    return data;
  }

  /**
   * 일반 데이터 정규화
   */
  normalizeGenericData(data, options) {
    // 기본적인 정리만 수행
    if (data === null || data === undefined) {
      return null;
    }

    return data;
  }

  // === 유틸리티 메소드 ===

  /**
   * 박스플롯 통계 계산
   */
  calculateBoxplotStats(values) {
    const sorted = [...values].sort((a, b) => a - b);
    const n = sorted.length;
    
    const q1 = sorted[Math.floor(n * 0.25)];
    const median = sorted[Math.floor(n * 0.5)];
    const q3 = sorted[Math.floor(n * 0.75)];
    const min = sorted[0];
    const max = sorted[n - 1];
    
    return { min, q1, median, q3, max };
  }

  /**
   * 간단한 KDE 계산
   */
  calculateKDE(values) {
    // 간소화된 KDE 구현
    const sorted = [...values].sort((a, b) => a - b);
    const n = sorted.length;
    const bandwidth = (sorted[n - 1] - sorted[0]) / 20;
    
    const density = [];
    for (let i = 0; i < 50; i++) {
      const x = sorted[0] + (i / 49) * (sorted[n - 1] - sorted[0]);
      let sum = 0;
      
      for (const value of values) {
        sum += Math.exp(-0.5 * Math.pow((x - value) / bandwidth, 2));
      }
      
      density.push(sum / (n * bandwidth * Math.sqrt(2 * Math.PI)));
    }
    
    return density;
  }

  /**
   * 색상 생성
   */
  generateColors(count) {
    const colors = [
      '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
      '#06B6D4', '#F97316', '#84CC16', '#EC4899', '#6B7280'
    ];
    
    const result = [];
    for (let i = 0; i < count; i++) {
      result.push(colors[i % colors.length]);
    }
    
    return result;
  }

  /**
   * 게이지 색상 결정
   */
  getGaugeColor(value, max) {
    const percentage = (value / max) * 100;
    
    if (percentage <= 33) return '#EF4444'; // 빨간색
    if (percentage <= 66) return '#F59E0B'; // 주황색
    return '#10B981'; // 초록색
  }

  /**
   * 자동 색상 적용
   */
  applyAutoColors(data, options) {
    if (!data.datasets) return data;
    
    data.datasets.forEach((dataset, index) => {
      if (!dataset.backgroundColor) {
        const colors = this.generateColors(Array.isArray(dataset.data) ? dataset.data.length : 1);
        dataset.backgroundColor = colors.length === 1 ? colors[0] : colors;
      }
      
      if (!dataset.borderColor) {
        dataset.borderColor = dataset.backgroundColor;
      }
    });
    
    return data;
  }

  /**
   * 자동 라벨 적용
   */
  applyAutoLabels(data, options) {
    if (!data.labels && data.datasets && data.datasets[0] && Array.isArray(data.datasets[0].data)) {
      data.labels = data.datasets[0].data.map((_, index) => `Item ${index + 1}`);
    }
    
    return data;
  }

  /**
   * 데이터 정렬
   */
  sortData(data, sortOptions) {
    if (!data.datasets) return data;
    
    // 간단한 정렬 구현
    if (sortOptions === 'asc' || sortOptions === 'desc') {
      data.datasets.forEach(dataset => {
        if (Array.isArray(dataset.data)) {
          const indices = dataset.data.map((_, index) => index);
          indices.sort((a, b) => {
            const valueA = dataset.data[a];
            const valueB = dataset.data[b];
            return sortOptions === 'asc' ? valueA - valueB : valueB - valueA;
          });
          
          dataset.data = indices.map(i => dataset.data[i]);
          
          if (data.labels) {
            data.labels = indices.map(i => data.labels[i]);
          }
        }
      });
    }
    
    return data;
  }

  /**
   * 데이터 필터링
   */
  filterData(data, filterOptions) {
    if (!data.datasets) return data;
    
    // 간단한 필터링 구현
    if (typeof filterOptions === 'function') {
      data.datasets.forEach(dataset => {
        if (Array.isArray(dataset.data)) {
          const filtered = dataset.data.filter(filterOptions);
          dataset.data = filtered;
        }
      });
    }
    
    return data;
  }

  /**
   * 변환기 추가
   */
  addTransformer(chartType, transformer) {
    this.transformers.set(chartType, transformer);
  }

  /**
   * 검증기 추가
   */
  addValidator(chartType, validator) {
    this.validators.set(chartType, validator);
  }

  /**
   * 정규화기 추가
   */
  addNormalizer(dataType, normalizer) {
    this.normalizers.set(dataType, normalizer);
  }
}

export default DataProcessor;