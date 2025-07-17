/**
 * 차트 설정 빌더
 * 차트 설정을 구성하고 표준화하는 유틸리티
 */

export class ChartConfigBuilder {
  constructor() {
    this.config = {};
    this.options = {};
    this.data = {};
    this.plugins = [];
    this.scales = {};
    this.theme = null;
  }

  /**
   * 차트 타입 설정
   */
  setType(type) {
    this.config.type = type;
    return this;
  }

  /**
   * 차트 데이터 설정
   */
  setData(data) {
    this.data = data;
    return this;
  }

  /**
   * 라벨 설정
   */
  setLabels(labels) {
    if (!this.data.labels) {
      this.data.labels = labels;
    }
    return this;
  }

  /**
   * 데이터셋 추가
   */
  addDataset(dataset) {
    if (!this.data.datasets) {
      this.data.datasets = [];
    }
    this.data.datasets.push(dataset);
    return this;
  }

  /**
   * 다중 데이터셋 추가
   */
  addDatasets(datasets) {
    if (!this.data.datasets) {
      this.data.datasets = [];
    }
    this.data.datasets.push(...datasets);
    return this;
  }

  /**
   * 반응형 설정
   */
  setResponsive(responsive = true) {
    this.options.responsive = responsive;
    return this;
  }

  /**
   * 애니메이션 설정
   */
  setAnimation(animationConfig) {
    this.options.animation = animationConfig;
    return this;
  }

  /**
   * 범례 설정
   */
  setLegend(legendConfig) {
    if (!this.options.plugins) {
      this.options.plugins = {};
    }
    this.options.plugins.legend = legendConfig;
    return this;
  }

  /**
   * 툴팁 설정
   */
  setTooltip(tooltipConfig) {
    if (!this.options.plugins) {
      this.options.plugins = {};
    }
    this.options.plugins.tooltip = tooltipConfig;
    return this;
  }

  /**
   * 색상 팔레트 설정
   */
  setColorPalette(colors) {
    if (!this.options.plugins) {
      this.options.plugins = {};
    }
    this.options.plugins.colorPalette = colors;
    return this;
  }

  /**
   * X축 설정
   */
  setXAxis(axisConfig) {
    if (!this.options.scales) {
      this.options.scales = {};
    }
    this.options.scales.x = axisConfig;
    return this;
  }

  /**
   * Y축 설정
   */
  setYAxis(axisConfig) {
    if (!this.options.scales) {
      this.options.scales = {};
    }
    this.options.scales.y = axisConfig;
    return this;
  }

  /**
   * 다중 Y축 설정
   */
  setMultipleYAxis(axisConfigs) {
    if (!this.options.scales) {
      this.options.scales = {};
    }
    
    Object.keys(axisConfigs).forEach(key => {
      this.options.scales[key] = axisConfigs[key];
    });
    
    return this;
  }

  /**
   * 플러그인 추가
   */
  addPlugin(plugin) {
    this.plugins.push(plugin);
    return this;
  }

  /**
   * 테마 설정
   */
  setTheme(theme) {
    this.theme = theme;
    return this;
  }

  /**
   * 차트 타입별 특화 설정
   */
  applyChartTypeDefaults() {
    const type = this.config.type;
    
    switch (type) {
      case 'line':
        this.applyLineChartDefaults();
        break;
      case 'bar':
        this.applyBarChartDefaults();
        break;
      case 'pie':
      case 'doughnut':
        this.applyPieChartDefaults();
        break;
      case 'scatter':
        this.applyScatterChartDefaults();
        break;
      case 'area':
        this.applyAreaChartDefaults();
        break;
      case 'heatmap':
        this.applyHeatmapDefaults();
        break;
      case 'boxplot':
        this.applyBoxplotDefaults();
        break;
      case 'violin':
        this.applyViolinDefaults();
        break;
      case 'waterfall':
        this.applyWaterfallDefaults();
        break;
      case 'gauge':
        this.applyGaugeDefaults();
        break;
      case 'candlestick':
        this.applyCandlestickDefaults();
        break;
      case 'gantt':
        this.applyGanttDefaults();
        break;
      case 'network':
        this.applyNetworkDefaults();
        break;
      case 'treemap':
        this.applyTreemapDefaults();
        break;
      case 'sunburst':
        this.applySunburstDefaults();
        break;
      case 'sankey':
        this.applySankeyDefaults();
        break;
      default:
        this.applyGenericDefaults();
        break;
    }
    
    return this;
  }

  /**
   * 라인 차트 기본 설정
   */
  applyLineChartDefaults() {
    this.setResponsive(true);
    
    if (!this.options.elements) {
      this.options.elements = {};
    }
    
    this.options.elements.line = {
      tension: 0.4,
      borderWidth: 2,
      fill: false
    };
    
    this.options.elements.point = {
      radius: 4,
      hoverRadius: 6,
      borderWidth: 2
    };
    
    this.setXAxis({
      display: true,
      grid: { display: true }
    });
    
    this.setYAxis({
      display: true,
      beginAtZero: true,
      grid: { display: true }
    });
    
    this.setLegend({
      display: true,
      position: 'top'
    });
    
    this.setTooltip({
      mode: 'index',
      intersect: false
    });
  }

  /**
   * 바 차트 기본 설정
   */
  applyBarChartDefaults() {
    this.setResponsive(true);
    
    this.setXAxis({
      display: true,
      grid: { display: false }
    });
    
    this.setYAxis({
      display: true,
      beginAtZero: true,
      grid: { display: true }
    });
    
    this.setLegend({
      display: true,
      position: 'top'
    });
    
    this.setTooltip({
      mode: 'index',
      intersect: false
    });
  }

  /**
   * 파이 차트 기본 설정
   */
  applyPieChartDefaults() {
    this.setResponsive(true);
    
    this.setLegend({
      display: true,
      position: 'right'
    });
    
    this.setTooltip({
      callbacks: {
        label: function(context) {
          const label = context.label || '';
          const value = context.parsed;
          const total = context.dataset.data.reduce((a, b) => a + b, 0);
          const percentage = Math.round((value / total) * 100);
          return `${label}: ${value} (${percentage}%)`;
        }
      }
    });
  }

  /**
   * 산점도 기본 설정
   */
  applyScatterChartDefaults() {
    this.setResponsive(true);
    
    this.setXAxis({
      type: 'linear',
      position: 'bottom',
      display: true,
      grid: { display: true }
    });
    
    this.setYAxis({
      display: true,
      beginAtZero: true,
      grid: { display: true }
    });
    
    this.setLegend({
      display: true,
      position: 'top'
    });
    
    this.setTooltip({
      mode: 'point',
      intersect: true
    });
  }

  /**
   * 영역 차트 기본 설정
   */
  applyAreaChartDefaults() {
    this.applyLineChartDefaults();
    
    if (!this.options.elements) {
      this.options.elements = {};
    }
    
    this.options.elements.line.fill = true;
    this.options.elements.line.backgroundColor = 'rgba(54, 162, 235, 0.2)';
  }

  /**
   * 히트맵 기본 설정
   */
  applyHeatmapDefaults() {
    this.setResponsive(true);
    
    this.setLegend({
      display: false
    });
    
    this.setTooltip({
      callbacks: {
        title: function(context) {
          return `Row: ${context[0].dataIndex}, Col: ${context[0].index}`;
        },
        label: function(context) {
          return `Value: ${context.parsed.v}`;
        }
      }
    });
  }

  /**
   * 박스플롯 기본 설정
   */
  applyBoxplotDefaults() {
    this.setResponsive(true);
    
    this.setYAxis({
      display: true,
      beginAtZero: true,
      grid: { display: true }
    });
    
    this.setLegend({
      display: true,
      position: 'top'
    });
    
    this.setTooltip({
      callbacks: {
        label: function(context) {
          const stats = context.parsed;
          return [
            `Min: ${stats.min}`,
            `Q1: ${stats.q1}`,
            `Median: ${stats.median}`,
            `Q3: ${stats.q3}`,
            `Max: ${stats.max}`
          ];
        }
      }
    });
  }

  /**
   * 바이올린 플롯 기본 설정
   */
  applyViolinDefaults() {
    this.applyBoxplotDefaults();
    
    this.setTooltip({
      callbacks: {
        label: function(context) {
          const stats = context.parsed;
          return [
            `Min: ${stats.min}`,
            `Q1: ${stats.q1}`,
            `Median: ${stats.median}`,
            `Q3: ${stats.q3}`,
            `Max: ${stats.max}`,
            `Density: ${stats.density}`
          ];
        }
      }
    });
  }

  /**
   * 워터폴 차트 기본 설정
   */
  applyWaterfallDefaults() {
    this.setResponsive(true);
    
    this.setXAxis({
      display: true,
      grid: { display: false }
    });
    
    this.setYAxis({
      display: true,
      beginAtZero: true,
      grid: { display: true }
    });
    
    this.setLegend({
      display: true,
      position: 'top'
    });
    
    this.setTooltip({
      callbacks: {
        label: function(context) {
          const value = context.parsed.y;
          const type = context.dataset.type || 'value';
          return `${context.dataset.label}: ${value > 0 ? '+' : ''}${value} (${type})`;
        }
      }
    });
  }

  /**
   * 게이지 차트 기본 설정
   */
  applyGaugeDefaults() {
    this.setResponsive(true);
    
    this.setLegend({
      display: false
    });
    
    this.setTooltip({
      callbacks: {
        label: function(context) {
          const value = context.parsed;
          const max = context.dataset.max || 100;
          const percentage = Math.round((value / max) * 100);
          return `${context.dataset.label}: ${value} (${percentage}%)`;
        }
      }
    });
  }

  /**
   * 캔들스틱 차트 기본 설정
   */
  applyCandlestickDefaults() {
    this.setResponsive(true);
    
    this.setXAxis({
      type: 'time',
      display: true,
      grid: { display: true }
    });
    
    this.setYAxis({
      display: true,
      grid: { display: true }
    });
    
    this.setLegend({
      display: true,
      position: 'top'
    });
    
    this.setTooltip({
      callbacks: {
        label: function(context) {
          const data = context.parsed;
          return [
            `Open: ${data.o}`,
            `High: ${data.h}`,
            `Low: ${data.l}`,
            `Close: ${data.c}`,
            `Volume: ${data.v || 'N/A'}`
          ];
        }
      }
    });
  }

  /**
   * 간트 차트 기본 설정
   */
  applyGanttDefaults() {
    this.setResponsive(true);
    
    this.setXAxis({
      type: 'time',
      display: true,
      grid: { display: true }
    });
    
    this.setYAxis({
      display: true,
      grid: { display: false }
    });
    
    this.setLegend({
      display: true,
      position: 'top'
    });
    
    this.setTooltip({
      callbacks: {
        label: function(context) {
          const data = context.parsed;
          return [
            `Task: ${data.task}`,
            `Start: ${data.start}`,
            `End: ${data.end}`,
            `Progress: ${data.progress || 0}%`
          ];
        }
      }
    });
  }

  /**
   * 네트워크 차트 기본 설정
   */
  applyNetworkDefaults() {
    this.setResponsive(true);
    
    this.setLegend({
      display: true,
      position: 'top'
    });
    
    this.setTooltip({
      callbacks: {
        label: function(context) {
          const data = context.parsed;
          if (data.type === 'node') {
            return `Node: ${data.id} (${data.value || 'N/A'})`;
          } else if (data.type === 'edge') {
            return `Edge: ${data.source} → ${data.target} (${data.weight || 'N/A'})`;
          }
          return `${context.dataset.label}: ${data.value}`;
        }
      }
    });
  }

  /**
   * 트리맵 기본 설정
   */
  applyTreemapDefaults() {
    this.setResponsive(true);
    
    this.setLegend({
      display: false
    });
    
    this.setTooltip({
      callbacks: {
        label: function(context) {
          const data = context.parsed;
          return [
            `Label: ${data.label}`,
            `Value: ${data.value}`,
            `Parent: ${data.parent || 'Root'}`
          ];
        }
      }
    });
  }

  /**
   * 선버스트 기본 설정
   */
  applySunburstDefaults() {
    this.setResponsive(true);
    
    this.setLegend({
      display: true,
      position: 'right'
    });
    
    this.setTooltip({
      callbacks: {
        label: function(context) {
          const data = context.parsed;
          return [
            `Label: ${data.label}`,
            `Value: ${data.value}`,
            `Level: ${data.level}`,
            `Parent: ${data.parent || 'Root'}`
          ];
        }
      }
    });
  }

  /**
   * 산키 다이어그램 기본 설정
   */
  applySankeyDefaults() {
    this.setResponsive(true);
    
    this.setLegend({
      display: false
    });
    
    this.setTooltip({
      callbacks: {
        label: function(context) {
          const data = context.parsed;
          if (data.type === 'node') {
            return `Node: ${data.name} (${data.value})`;
          } else if (data.type === 'link') {
            return `Flow: ${data.source} → ${data.target} (${data.value})`;
          }
          return `${context.dataset.label}: ${data.value}`;
        }
      }
    });
  }

  /**
   * 일반 기본 설정
   */
  applyGenericDefaults() {
    this.setResponsive(true);
    
    this.setLegend({
      display: true,
      position: 'top'
    });
    
    this.setTooltip({
      mode: 'index',
      intersect: false
    });
  }

  /**
   * 최종 설정 빌드
   */
  build() {
    // 차트 타입별 기본 설정 적용
    this.applyChartTypeDefaults();
    
    // 테마 적용
    if (this.theme) {
      this.applyTheme(this.theme);
    }
    
    // 플러그인 적용
    if (this.plugins.length > 0) {
      this.options.plugins = {
        ...this.options.plugins,
        ...this.plugins.reduce((acc, plugin) => ({ ...acc, ...plugin }), {})
      };
    }
    
    // 최종 설정 구성
    const finalConfig = {
      ...this.config,
      data: this.data,
      options: this.options
    };
    
    // 설정 검증
    this.validateConfig(finalConfig);
    
    return finalConfig;
  }

  /**
   * 테마 적용
   */
  applyTheme(theme) {
    if (theme.colors) {
      this.applyColorTheme(theme.colors);
    }
    
    if (theme.fonts) {
      this.applyFontTheme(theme.fonts);
    }
    
    if (theme.spacing) {
      this.applySpacingTheme(theme.spacing);
    }
    
    if (theme.animations) {
      this.setAnimation(theme.animations);
    }
  }

  /**
   * 색상 테마 적용
   */
  applyColorTheme(colors) {
    if (!this.options.plugins) {
      this.options.plugins = {};
    }
    
    this.options.plugins.colorPalette = colors;
    
    // 데이터셋에 색상 적용
    if (this.data.datasets) {
      this.data.datasets.forEach((dataset, index) => {
        if (!dataset.backgroundColor) {
          dataset.backgroundColor = colors[index % colors.length];
        }
        if (!dataset.borderColor) {
          dataset.borderColor = colors[index % colors.length];
        }
      });
    }
  }

  /**
   * 폰트 테마 적용
   */
  applyFontTheme(fonts) {
    if (!this.options.plugins) {
      this.options.plugins = {};
    }
    
    this.options.plugins.font = fonts;
    
    // 각 구성요소에 폰트 적용
    if (this.options.scales) {
      Object.keys(this.options.scales).forEach(key => {
        if (this.options.scales[key].title) {
          this.options.scales[key].title.font = fonts.title;
        }
        if (this.options.scales[key].ticks) {
          this.options.scales[key].ticks.font = fonts.ticks;
        }
      });
    }
    
    if (this.options.plugins.legend) {
      this.options.plugins.legend.labels = {
        ...this.options.plugins.legend.labels,
        font: fonts.legend
      };
    }
  }

  /**
   * 간격 테마 적용
   */
  applySpacingTheme(spacing) {
    if (!this.options.layout) {
      this.options.layout = {};
    }
    
    this.options.layout.padding = spacing.padding;
    
    if (this.options.plugins.legend) {
      this.options.plugins.legend.labels = {
        ...this.options.plugins.legend.labels,
        padding: spacing.legend
      };
    }
  }

  /**
   * 설정 검증
   */
  validateConfig(config) {
    if (!config.type) {
      throw new Error('차트 타입이 지정되지 않았습니다');
    }
    
    if (!config.data) {
      throw new Error('차트 데이터가 제공되지 않았습니다');
    }
    
    // 차트 타입별 필수 필드 검증
    this.validateChartTypeRequirements(config);
  }

  /**
   * 차트 타입별 필수 사항 검증
   */
  validateChartTypeRequirements(config) {
    const { type, data } = config;
    
    switch (type) {
      case 'line':
      case 'bar':
      case 'area':
        if (!data.labels || !data.datasets) {
          throw new Error(`${type} 차트는 labels와 datasets이 필요합니다`);
        }
        break;
      case 'pie':
      case 'doughnut':
        if (!data.labels || !data.datasets || data.datasets.length === 0) {
          throw new Error(`${type} 차트는 labels와 최소 하나의 데이터셋이 필요합니다`);
        }
        break;
      case 'scatter':
        if (!data.datasets || data.datasets.length === 0) {
          throw new Error('산점도는 최소 하나의 데이터셋이 필요합니다');
        }
        break;
      default:
        // 기본 검증 통과
        break;
    }
  }

  /**
   * 설정 리셋
   */
  reset() {
    this.config = {};
    this.options = {};
    this.data = {};
    this.plugins = [];
    this.scales = {};
    this.theme = null;
    return this;
  }
}

export default ChartConfigBuilder;