/**
 * 차트 팩토리
 * 차트 설정 처리 및 표준화를 담당
 */

import { ChartConfigBuilder } from './ChartConfigBuilder.js';
import { DataProcessor } from './DataProcessor.js';
import { ThemeManager } from './ThemeManager.js';

export class ChartFactory {
  constructor() {
    this.configBuilder = new ChartConfigBuilder();
    this.dataProcessor = new DataProcessor();
    this.themeManager = new ThemeManager();
    
    // 차트 타입별 기본 설정
    this.defaultConfigs = new Map();
    this.setupDefaultConfigs();
  }

  /**
   * 차트 설정 처리
   */
  async processConfig(config) {
    try {
      // 1. 기본 설정 적용
      const baseConfig = this.applyDefaults(config);
      
      // 2. 데이터 처리
      const processedData = await this.dataProcessor.process(baseConfig.data, baseConfig.type);
      
      // 3. 테마 적용
      const themedConfig = await this.themeManager.applyTheme(baseConfig, baseConfig.theme);
      
      // 4. 최종 설정 빌드
      const finalConfig = this.configBuilder.build({
        ...themedConfig,
        data: processedData
      });
      
      return finalConfig;
      
    } catch (error) {
      throw new Error(`차트 설정 처리 실패: ${error.message}`);
    }
  }

  /**
   * 차트 생성 (간편 메소드)
   */
  async createChart(type, data, options = {}) {
    const config = {
      type,
      data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        ...options
      }
    };

    return await this.processConfig(config);
  }

  /**
   * 시계열 차트 생성
   */
  async createTimeSeriesChart(data, options = {}) {
    const config = {
      type: 'line',
      data: {
        datasets: Array.isArray(data) ? data : [data]
      },
      options: {
        responsive: true,
        scales: {
          x: {
            type: 'time',
            time: {
              displayFormats: {
                hour: 'HH:mm',
                day: 'MM/DD',
                week: 'MM/DD',
                month: 'MMM YYYY'
              }
            },
            ...options.xAxis
          },
          y: {
            beginAtZero: true,
            ...options.yAxis
          }
        },
        plugins: {
          legend: {
            display: true,
            position: 'top'
          },
          tooltip: {
            mode: 'index',
            intersect: false
          }
        },
        ...options
      }
    };

    return await this.processConfig(config);
  }

  /**
   * 출고 현황 차트 생성 (특화된 메소드)
   */
  async createDeliveryChart(data, options = {}) {
    const datasets = [];
    
    // 오늘 데이터
    if (data.today) {
      datasets.push({
        label: '오늘',
        data: data.today,
        borderColor: '#3B82F6',
        backgroundColor: '#3B82F620',
        borderWidth: 3,
        pointRadius: 4,
        pointBackgroundColor: '#3B82F6',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        tension: 0.4
      });
    }

    // 어제 데이터
    if (data.yesterday) {
      datasets.push({
        label: '어제',
        data: data.yesterday,
        borderColor: '#EF4444',
        backgroundColor: '#EF444420',
        borderWidth: 2,
        pointRadius: 3,
        pointBackgroundColor: '#EF4444',
        borderDash: [5, 5],
        tension: 0.4
      });
    }

    // 그저께 데이터
    if (data.dayBefore) {
      datasets.push({
        label: '그저께',
        data: data.dayBefore,
        borderColor: '#10B981',
        backgroundColor: '#10B98120',
        borderWidth: 2,
        pointRadius: 3,
        pointBackgroundColor: '#10B981',
        borderDash: [10, 5],
        tension: 0.4
      });
    }

    // 증감량 막대 데이터
    if (data.changes) {
      datasets.push({
        label: '시간별 증감량',
        type: 'bar',
        data: data.changes,
        backgroundColor: '#F59E0B50',
        borderColor: '#F59E0B',
        borderWidth: 1,
        yAxisID: 'y1'
      });
    }

    const config = {
      type: 'line',
      data: {
        labels: data.labels || this.generateHourlyLabels(),
        datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        scales: {
          x: {
            display: true,
            title: {
              display: true,
              text: '시간'
            },
            grid: {
              display: true,
              color: '#e5e7eb'
            }
          },
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            title: {
              display: true,
              text: '누적 출고량'
            },
            beginAtZero: true,
            grid: {
              display: true,
              color: '#e5e7eb'
            }
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            title: {
              display: true,
              text: '증감량'
            },
            beginAtZero: true,
            grid: {
              drawOnChartArea: false
            }
          }
        },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: {
              usePointStyle: true,
              padding: 20
            }
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            callbacks: {
              title: function(context) {
                return `시간: ${context[0].label}`;
              },
              label: function(context) {
                const label = context.dataset.label || '';
                const value = context.parsed.y;
                
                if (context.dataset.type === 'bar') {
                  return `${label}: ${value > 0 ? '+' : ''}${value}`;
                } else {
                  return `${label}: ${value}`;
                }
              }
            }
          },
          datalabels: {
            display: function(context) {
              // 오늘 데이터만 라벨 표시
              return context.datasetIndex === 0;
            },
            color: '#374151',
            backgroundColor: '#ffffff',
            borderColor: '#d1d5db',
            borderRadius: 4,
            borderWidth: 1,
            padding: 4,
            font: {
              size: 10,
              weight: 'bold'
            },
            formatter: function(value, context) {
              return value;
            }
          }
        },
        ...options
      }
    };

    return await this.processConfig(config);
  }

  /**
   * 비즈니스 대시보드 차트 생성
   */
  async createBusinessChart(type, data, options = {}) {
    const chartConfigs = {
      revenue_trend: {
        type: 'line',
        options: {
          scales: {
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: '매출액 (원)'
              }
            }
          }
        }
      },
      category_distribution: {
        type: 'pie',
        options: {
          plugins: {
            legend: {
              position: 'right'
            }
          }
        }
      },
      region_performance: {
        type: 'bar',
        options: {
          indexAxis: 'y',
          scales: {
            x: {
              beginAtZero: true,
              title: {
                display: true,
                text: '성과 지표'
              }
            }
          }
        }
      },
      conversion_analysis: {
        type: 'scatter',
        options: {
          scales: {
            x: {
              title: {
                display: true,
                text: '방문자 수'
              }
            },
            y: {
              title: {
                display: true,
                text: '전환율 (%)'
              }
            }
          }
        }
      }
    };

    const baseConfig = chartConfigs[type] || chartConfigs.revenue_trend;
    
    const config = {
      ...baseConfig,
      data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        ...baseConfig.options,
        ...options
      }
    };

    return await this.processConfig(config);
  }

  /**
   * 고급 차트 생성
   */
  async createAdvancedChart(type, data, options = {}) {
    const advancedConfigs = {
      heatmap: {
        type: 'heatmap',
        options: {
          plugins: {
            legend: {
              display: false
            }
          }
        }
      },
      boxplot: {
        type: 'boxplot',
        options: {
          scales: {
            y: {
              beginAtZero: true
            }
          }
        }
      },
      violin: {
        type: 'violin',
        options: {
          scales: {
            y: {
              beginAtZero: true
            }
          }
        }
      },
      treemap: {
        type: 'treemap',
        options: {
          plugins: {
            legend: {
              display: false
            }
          }
        }
      },
      sankey: {
        type: 'sankey',
        options: {
          plugins: {
            legend: {
              display: false
            }
          }
        }
      }
    };

    const baseConfig = advancedConfigs[type];
    
    if (!baseConfig) {
      throw new Error(`지원하지 않는 고급 차트 타입: ${type}`);
    }

    const config = {
      ...baseConfig,
      data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        ...baseConfig.options,
        ...options
      }
    };

    return await this.processConfig(config);
  }

  /**
   * 차트 템플릿 생성
   */
  createTemplate(name, config) {
    const template = {
      name,
      type: config.type,
      defaultData: config.data,
      defaultOptions: config.options,
      description: config.description || '',
      category: config.category || 'custom',
      createdAt: new Date().toISOString()
    };

    return template;
  }

  /**
   * 템플릿으로부터 차트 생성
   */
  async createFromTemplate(template, data, options = {}) {
    const config = {
      type: template.type,
      data: data || template.defaultData,
      options: {
        ...template.defaultOptions,
        ...options
      }
    };

    return await this.processConfig(config);
  }

  // === 내부 메소드 ===

  /**
   * 기본 설정 적용
   */
  applyDefaults(config) {
    const defaultConfig = this.defaultConfigs.get(config.type) || {};
    
    return {
      responsive: true,
      maintainAspectRatio: false,
      ...defaultConfig,
      ...config,
      options: {
        ...defaultConfig.options,
        ...config.options
      }
    };
  }

  /**
   * 기본 설정 초기화
   */
  setupDefaultConfigs() {
    // 라인 차트 기본 설정
    this.defaultConfigs.set('line', {
      options: {
        elements: {
          line: {
            tension: 0.4
          },
          point: {
            radius: 4,
            hoverRadius: 6
          }
        },
        scales: {
          x: {
            display: true,
            grid: {
              display: true
            }
          },
          y: {
            display: true,
            beginAtZero: true,
            grid: {
              display: true
            }
          }
        },
        plugins: {
          legend: {
            display: true,
            position: 'top'
          },
          tooltip: {
            mode: 'index',
            intersect: false
          }
        }
      }
    });

    // 바 차트 기본 설정
    this.defaultConfigs.set('bar', {
      options: {
        scales: {
          x: {
            display: true,
            grid: {
              display: false
            }
          },
          y: {
            display: true,
            beginAtZero: true,
            grid: {
              display: true
            }
          }
        },
        plugins: {
          legend: {
            display: true,
            position: 'top'
          }
        }
      }
    });

    // 파이 차트 기본 설정
    this.defaultConfigs.set('pie', {
      options: {
        plugins: {
          legend: {
            display: true,
            position: 'right'
          }
        }
      }
    });

    // 산점도 기본 설정
    this.defaultConfigs.set('scatter', {
      options: {
        scales: {
          x: {
            type: 'linear',
            position: 'bottom'
          },
          y: {
            beginAtZero: true
          }
        }
      }
    });
  }

  /**
   * 시간별 라벨 생성
   */
  generateHourlyLabels() {
    const labels = [];
    for (let hour = 0; hour < 24; hour++) {
      labels.push(`${hour}시`);
    }
    return labels;
  }

  /**
   * 색상 팔레트 생성
   */
  generateColorPalette(count) {
    const colors = [
      '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
      '#06B6D4', '#F97316', '#84CC16', '#EC4899', '#6B7280'
    ];

    const palette = [];
    for (let i = 0; i < count; i++) {
      palette.push(colors[i % colors.length]);
    }

    return palette;
  }

  /**
   * 데이터 검증
   */
  validateData(data, type) {
    if (!data) {
      throw new Error('데이터가 제공되지 않았습니다');
    }

    switch (type) {
      case 'line':
      case 'bar':
        if (!data.labels || !data.datasets) {
          throw new Error('라인/바 차트는 labels와 datasets이 필요합니다');
        }
        break;
      case 'pie':
        if (!data.labels || !data.datasets) {
          throw new Error('파이 차트는 labels와 datasets이 필요합니다');
        }
        break;
      case 'scatter':
        if (!data.datasets || !Array.isArray(data.datasets)) {
          throw new Error('산점도는 datasets 배열이 필요합니다');
        }
        break;
      default:
        // 기본 검증은 통과
        break;
    }

    return true;
  }
}

export default ChartFactory;