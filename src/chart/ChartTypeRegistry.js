/**
 * 차트 타입 레지스트리
 * 차트 타입 관리 및 추천 시스템
 */

export class ChartTypeRegistry {
  constructor() {
    this.types = new Map();
    this.templates = new Map();
    this.categories = new Map();
    this.setupDefaultTypes();
  }

  /**
   * 기본 차트 타입 설정
   */
  setupDefaultTypes() {
    // 기본 차트 타입들
    const basicTypes = [
      {
        name: 'line',
        category: 'basic',
        description: '데이터의 연속적인 변화를 시각화하는 라인 차트',
        icon: '📈',
        requiredFields: ['x', 'y'],
        optionalFields: ['series', 'color'],
        bestFor: ['시계열 데이터', '트렌드 분석', '연속 데이터'],
        complexity: 'easy',
        dataTypes: ['number', 'date'],
        minDataPoints: 2,
        maxDataPoints: 10000,
        supportedFeatures: ['animation', 'tooltip', 'legend', 'zoom'],
        examples: [
          { name: '시간별 매출', use: '매출 데이터의 시간에 따른 변화' },
          { name: '주가 차트', use: '주식 가격의 일별 변동' }
        ]
      },
      {
        name: 'bar',
        category: 'basic',
        description: '범주형 데이터를 막대로 비교하는 바 차트',
        icon: '📊',
        requiredFields: ['category', 'value'],
        optionalFields: ['series', 'color'],
        bestFor: ['범주형 데이터', '비교 분석', '순위 표시'],
        complexity: 'easy',
        dataTypes: ['string', 'number'],
        minDataPoints: 1,
        maxDataPoints: 100,
        supportedFeatures: ['animation', 'tooltip', 'legend', 'stacking'],
        examples: [
          { name: '지역별 매출', use: '각 지역의 매출 비교' },
          { name: '제품별 판매량', use: '제품 카테고리별 판매 실적' }
        ]
      },
      {
        name: 'pie',
        category: 'basic',
        description: '전체에서 각 부분의 비율을 보여주는 파이 차트',
        icon: '🥧',
        requiredFields: ['label', 'value'],
        optionalFields: ['color'],
        bestFor: ['비율 표시', '구성 요소 분석', '전체 대비 부분'],
        complexity: 'easy',
        dataTypes: ['string', 'number'],
        minDataPoints: 2,
        maxDataPoints: 10,
        supportedFeatures: ['animation', 'tooltip', 'legend', 'explosion'],
        examples: [
          { name: '시장 점유율', use: '각 브랜드의 시장 점유율' },
          { name: '예산 배분', use: '부서별 예산 배분 현황' }
        ]
      },
      {
        name: 'scatter',
        category: 'basic',
        description: '두 변수 간의 상관관계를 보여주는 산점도',
        icon: '🔵',
        requiredFields: ['x', 'y'],
        optionalFields: ['size', 'color', 'label'],
        bestFor: ['상관관계 분석', '분포 확인', '패턴 탐지'],
        complexity: 'medium',
        dataTypes: ['number'],
        minDataPoints: 10,
        maxDataPoints: 5000,
        supportedFeatures: ['animation', 'tooltip', 'legend', 'trendline'],
        examples: [
          { name: '키와 몸무게 관계', use: '키와 몸무게의 상관관계' },
          { name: '광고비 vs 매출', use: '광고비 투입 대비 매출 효과' }
        ]
      },
      {
        name: 'area',
        category: 'basic',
        description: '라인 차트에 영역을 채운 면적 차트',
        icon: '🌄',
        requiredFields: ['x', 'y'],
        optionalFields: ['series', 'color'],
        bestFor: ['누적 데이터', '볼륨 표시', '트렌드 강조'],
        complexity: 'medium',
        dataTypes: ['number', 'date'],
        minDataPoints: 3,
        maxDataPoints: 1000,
        supportedFeatures: ['animation', 'tooltip', 'legend', 'stacking'],
        examples: [
          { name: '누적 매출', use: '월별 누적 매출 추이' },
          { name: '사용자 증가', use: '서비스 사용자 증가 추이' }
        ]
      }
    ];

    // 고급 차트 타입들
    const advancedTypes = [
      {
        name: 'heatmap',
        category: 'advanced',
        description: '2차원 데이터를 색상으로 표현하는 히트맵',
        icon: '🔥',
        requiredFields: ['x', 'y', 'value'],
        optionalFields: ['color'],
        bestFor: ['패턴 분석', '상관관계 매트릭스', '시간-카테고리 분석'],
        complexity: 'hard',
        dataTypes: ['number', 'string'],
        minDataPoints: 9,
        maxDataPoints: 10000,
        supportedFeatures: ['animation', 'tooltip', 'colorScale'],
        examples: [
          { name: '시간별 활동', use: '요일별 시간대별 활동량' },
          { name: '상관관계 매트릭스', use: '변수 간 상관관계 시각화' }
        ]
      },
      {
        name: 'boxplot',
        category: 'advanced',
        description: '데이터 분포를 사분위수로 표현하는 박스플롯',
        icon: '📦',
        requiredFields: ['values'],
        optionalFields: ['category', 'outliers'],
        bestFor: ['분포 분석', '이상치 탐지', '그룹별 비교'],
        complexity: 'hard',
        dataTypes: ['number'],
        minDataPoints: 5,
        maxDataPoints: 1000,
        supportedFeatures: ['animation', 'tooltip', 'outliers'],
        examples: [
          { name: '성적 분포', use: '반별 성적 분포 비교' },
          { name: '소득 분포', use: '지역별 소득 분포 분석' }
        ]
      },
      {
        name: 'treemap',
        category: 'advanced',
        description: '계층적 데이터를 중첩된 사각형으로 표현',
        icon: '🌳',
        requiredFields: ['value', 'label'],
        optionalFields: ['parent', 'color'],
        bestFor: ['계층적 데이터', '비율 시각화', '포트폴리오 분석'],
        complexity: 'hard',
        dataTypes: ['number', 'string'],
        minDataPoints: 3,
        maxDataPoints: 1000,
        supportedFeatures: ['animation', 'tooltip', 'drilling'],
        examples: [
          { name: '파일 크기', use: '디렉토리별 파일 크기 분포' },
          { name: '포트폴리오', use: '투자 포트폴리오 구성' }
        ]
      },
      {
        name: 'sankey',
        category: 'advanced',
        description: '플로우를 시각화하는 산키 다이어그램',
        icon: '🌊',
        requiredFields: ['source', 'target', 'value'],
        optionalFields: ['color'],
        bestFor: ['플로우 분석', '전환율 추적', '에너지 흐름'],
        complexity: 'hard',
        dataTypes: ['string', 'number'],
        minDataPoints: 3,
        maxDataPoints: 500,
        supportedFeatures: ['animation', 'tooltip', 'interactive'],
        examples: [
          { name: '사용자 플로우', use: '웹사이트 사용자 이동 경로' },
          { name: '에너지 흐름', use: '에너지 생산에서 소비까지의 흐름' }
        ]
      }
    ];

    // 커스텀 차트 타입들
    const customTypes = [
      {
        name: 'delivery_dashboard',
        category: 'custom',
        description: '출고 현황 전용 대시보드 차트',
        icon: '🚚',
        requiredFields: ['time', 'today', 'yesterday', 'dayBefore'],
        optionalFields: ['prediction', 'changes'],
        bestFor: ['출고 현황', '예측 분석', '시간별 비교'],
        complexity: 'medium',
        dataTypes: ['date', 'number'],
        minDataPoints: 24,
        maxDataPoints: 72,
        supportedFeatures: ['animation', 'tooltip', 'legend', 'prediction'],
        examples: [
          { name: '시간별 출고', use: '시간별 출고량 추이 및 예측' }
        ]
      },
      {
        name: 'business_kpi',
        category: 'custom',
        description: '비즈니스 KPI 전용 차트',
        icon: '📈',
        requiredFields: ['metric', 'value', 'target'],
        optionalFields: ['trend', 'benchmark'],
        bestFor: ['KPI 모니터링', '목표 달성도', '성과 평가'],
        complexity: 'medium',
        dataTypes: ['string', 'number'],
        minDataPoints: 1,
        maxDataPoints: 20,
        supportedFeatures: ['animation', 'tooltip', 'targets', 'alerts'],
        examples: [
          { name: '월별 KPI', use: '월별 주요 성과 지표 추적' }
        ]
      }
    ];

    // 모든 타입 등록
    [...basicTypes, ...advancedTypes, ...customTypes].forEach(type => {
      this.registerType(type.name, type);
    });

    // 카테고리 설정
    this.categories.set('basic', {
      name: '기본 차트',
      description: '일반적으로 사용되는 기본 차트 타입',
      icon: '📊',
      order: 1
    });

    this.categories.set('advanced', {
      name: '고급 차트',
      description: '전문적인 분석을 위한 고급 차트 타입',
      icon: '🔬',
      order: 2
    });

    this.categories.set('custom', {
      name: '커스텀 차트',
      description: '특정 용도에 특화된 맞춤형 차트',
      icon: '🎨',
      order: 3
    });
  }

  /**
   * 차트 타입 등록
   */
  registerType(name, typeInfo) {
    if (!name || !typeInfo) {
      throw new Error('차트 타입 이름과 정보가 필요합니다');
    }

    const type = {
      name,
      category: typeInfo.category || 'custom',
      description: typeInfo.description || '',
      icon: typeInfo.icon || '📊',
      requiredFields: typeInfo.requiredFields || [],
      optionalFields: typeInfo.optionalFields || [],
      bestFor: typeInfo.bestFor || [],
      complexity: typeInfo.complexity || 'medium',
      dataTypes: typeInfo.dataTypes || ['number'],
      minDataPoints: typeInfo.minDataPoints || 1,
      maxDataPoints: typeInfo.maxDataPoints || 1000,
      supportedFeatures: typeInfo.supportedFeatures || [],
      examples: typeInfo.examples || [],
      registeredAt: new Date().toISOString()
    };

    this.types.set(name, type);
    return type;
  }

  /**
   * 차트 타입 조회
   */
  getType(name) {
    return this.types.get(name);
  }

  /**
   * 모든 차트 타입 조회
   */
  getAllTypes() {
    return Array.from(this.types.values());
  }

  /**
   * 카테고리별 차트 타입 조회
   */
  getTypesByCategory(category) {
    return Array.from(this.types.values()).filter(type => type.category === category);
  }

  /**
   * 모든 카테고리 조회
   */
  getAllCategories() {
    return Array.from(this.categories.values()).sort((a, b) => a.order - b.order);
  }

  /**
   * 차트 타입 추천
   */
  async suggestTypes(data, context = {}) {
    const suggestions = [];

    try {
      // 데이터 분석
      const analysis = this.analyzeData(data);
      
      // 각 차트 타입에 대해 점수 계산
      for (const [name, type] of this.types.entries()) {
        const score = this.calculateScore(type, analysis, context);
        
        if (score > 0) {
          suggestions.push({
            name,
            type,
            score,
            reasoning: this.generateReasoning(type, analysis, score)
          });
        }
      }

      // 점수순 정렬
      suggestions.sort((a, b) => b.score - a.score);
      
      return suggestions.slice(0, 5); // 상위 5개만 반환
      
    } catch (error) {
      console.error('차트 타입 추천 실패:', error);
      return [];
    }
  }

  /**
   * 데이터 분석
   */
  analyzeData(data) {
    const analysis = {
      recordCount: 0,
      fieldCount: 0,
      fieldTypes: {},
      hasTimeSeries: false,
      hasCategories: false,
      hasNumerical: false,
      dataRange: {},
      patterns: []
    };

    if (!data || (!Array.isArray(data) && typeof data !== 'object')) {
      return analysis;
    }

    // 배열 데이터 처리
    if (Array.isArray(data)) {
      analysis.recordCount = data.length;
      
      if (data.length > 0) {
        const firstRecord = data[0];
        
        if (typeof firstRecord === 'object') {
          // 객체 배열
          analysis.fieldCount = Object.keys(firstRecord).length;
          
          // 필드 타입 분석
          Object.keys(firstRecord).forEach(field => {
            const fieldType = this.inferFieldType(data.map(record => record[field]));
            analysis.fieldTypes[field] = fieldType;
            
            if (fieldType === 'date') {
              analysis.hasTimeSeries = true;
            } else if (fieldType === 'string') {
              analysis.hasCategories = true;
            } else if (fieldType === 'number') {
              analysis.hasNumerical = true;
            }
          });
        } else {
          // 단순 배열
          analysis.fieldCount = 1;
          const fieldType = this.inferFieldType(data);
          analysis.fieldTypes.value = fieldType;
          
          if (fieldType === 'number') {
            analysis.hasNumerical = true;
          }
        }
      }
    }

    // Chart.js 형태 데이터 처리
    else if (data.datasets && Array.isArray(data.datasets)) {
      analysis.recordCount = data.labels ? data.labels.length : 0;
      analysis.fieldCount = data.datasets.length + 1; // datasets + labels
      
      if (data.labels) {
        const labelType = this.inferFieldType(data.labels);
        analysis.fieldTypes.labels = labelType;
        
        if (labelType === 'date') {
          analysis.hasTimeSeries = true;
        } else if (labelType === 'string') {
          analysis.hasCategories = true;
        }
      }
      
      data.datasets.forEach((dataset, index) => {
        if (dataset.data) {
          const dataType = this.inferFieldType(dataset.data);
          analysis.fieldTypes[`dataset_${index}`] = dataType;
          
          if (dataType === 'number') {
            analysis.hasNumerical = true;
          }
        }
      });
    }

    return analysis;
  }

  /**
   * 필드 타입 추론
   */
  inferFieldType(values) {
    if (!Array.isArray(values) || values.length === 0) {
      return 'unknown';
    }

    const sample = values.slice(0, 100); // 샘플 100개만 확인
    let numberCount = 0;
    let dateCount = 0;
    let stringCount = 0;

    sample.forEach(value => {
      if (value === null || value === undefined) {
        return;
      }

      if (typeof value === 'number') {
        numberCount++;
      } else if (value instanceof Date) {
        dateCount++;
      } else if (typeof value === 'string') {
        // 날짜 문자열 확인
        if (this.isDateString(value)) {
          dateCount++;
        } else if (this.isNumberString(value)) {
          numberCount++;
        } else {
          stringCount++;
        }
      }
    });

    // 가장 많은 타입 반환
    if (dateCount > numberCount && dateCount > stringCount) {
      return 'date';
    } else if (numberCount > stringCount) {
      return 'number';
    } else {
      return 'string';
    }
  }

  /**
   * 날짜 문자열 확인
   */
  isDateString(str) {
    const datePatterns = [
      /^\d{4}-\d{2}-\d{2}$/,
      /^\d{4}\/\d{2}\/\d{2}$/,
      /^\d{2}\/\d{2}\/\d{4}$/,
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
      /^\d{4}\.\d{2}\.\d{2}$/
    ];

    return datePatterns.some(pattern => pattern.test(str));
  }

  /**
   * 숫자 문자열 확인
   */
  isNumberString(str) {
    return !isNaN(str) && !isNaN(parseFloat(str));
  }

  /**
   * 점수 계산
   */
  calculateScore(type, analysis, context) {
    let score = 0;

    // 데이터 포인트 수 적합성
    if (analysis.recordCount >= type.minDataPoints && analysis.recordCount <= type.maxDataPoints) {
      score += 30;
    } else if (analysis.recordCount < type.minDataPoints) {
      score -= 20;
    } else if (analysis.recordCount > type.maxDataPoints) {
      score -= 10;
    }

    // 데이터 타입 적합성
    const hasRequiredTypes = type.dataTypes.some(dataType => {
      switch (dataType) {
        case 'number':
          return analysis.hasNumerical;
        case 'string':
          return analysis.hasCategories;
        case 'date':
          return analysis.hasTimeSeries;
        default:
          return false;
      }
    });

    if (hasRequiredTypes) {
      score += 25;
    }

    // 차트 타입별 특화 점수
    switch (type.name) {
      case 'line':
        if (analysis.hasTimeSeries) score += 20;
        if (analysis.recordCount > 5) score += 10;
        break;
      case 'bar':
        if (analysis.hasCategories) score += 20;
        if (analysis.recordCount <= 20) score += 10;
        break;
      case 'pie':
        if (analysis.hasCategories && analysis.recordCount <= 10) score += 20;
        if (analysis.recordCount >= 2 && analysis.recordCount <= 6) score += 10;
        break;
      case 'scatter':
        if (analysis.hasNumerical && analysis.recordCount >= 10) score += 20;
        break;
      case 'heatmap':
        if (analysis.fieldCount >= 3 && analysis.recordCount >= 9) score += 20;
        break;
    }

    // 컨텍스트 기반 점수
    if (context.purpose) {
      if (type.bestFor.includes(context.purpose)) {
        score += 15;
      }
    }

    if (context.complexity) {
      if (type.complexity === context.complexity) {
        score += 10;
      }
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * 추천 이유 생성
   */
  generateReasoning(type, analysis, score) {
    const reasons = [];

    if (analysis.recordCount >= type.minDataPoints && analysis.recordCount <= type.maxDataPoints) {
      reasons.push(`데이터 포인트 수(${analysis.recordCount})가 적절합니다`);
    }

    if (type.dataTypes.includes('date') && analysis.hasTimeSeries) {
      reasons.push('시계열 데이터에 적합합니다');
    }

    if (type.dataTypes.includes('string') && analysis.hasCategories) {
      reasons.push('범주형 데이터에 적합합니다');
    }

    if (type.dataTypes.includes('number') && analysis.hasNumerical) {
      reasons.push('수치 데이터에 적합합니다');
    }

    if (type.bestFor.length > 0) {
      reasons.push(`${type.bestFor.join(', ')}에 최적화되어 있습니다`);
    }

    return reasons.join(', ');
  }

  /**
   * 템플릿 추가
   */
  addTemplate(name, template) {
    this.templates.set(name, {
      name,
      ...template,
      createdAt: new Date().toISOString()
    });
  }

  /**
   * 템플릿 조회
   */
  getTemplate(name) {
    return this.templates.get(name);
  }

  /**
   * 모든 템플릿 조회
   */
  getAllTemplates() {
    return Array.from(this.templates.values());
  }

  /**
   * 타입 제거
   */
  removeType(name) {
    return this.types.delete(name);
  }

  /**
   * 템플릿 제거
   */
  removeTemplate(name) {
    return this.templates.delete(name);
  }

  /**
   * 통계 정보 조회
   */
  getStats() {
    return {
      totalTypes: this.types.size,
      totalTemplates: this.templates.size,
      categoryCounts: this.getAllCategories().map(cat => ({
        category: cat.name,
        count: this.getTypesByCategory(cat.name).length
      })),
      complexityCounts: {
        easy: Array.from(this.types.values()).filter(t => t.complexity === 'easy').length,
        medium: Array.from(this.types.values()).filter(t => t.complexity === 'medium').length,
        hard: Array.from(this.types.values()).filter(t => t.complexity === 'hard').length
      }
    };
  }
}

export default ChartTypeRegistry;