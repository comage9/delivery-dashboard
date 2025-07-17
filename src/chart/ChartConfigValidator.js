/**
 * 차트 설정 검증기
 * 차트 설정의 유효성을 검사하고 오류를 보고
 */

export class ChartConfigValidator {
  constructor() {
    this.rules = new Map();
    this.setupDefaultRules();
  }

  /**
   * 기본 검증 규칙 설정
   */
  setupDefaultRules() {
    // 필수 필드 검증
    this.rules.set('required', {
      validate: (value, field) => {
        if (value === null || value === undefined || value === '') {
          return { valid: false, message: `필수 필드입니다: ${field}` };
        }
        return { valid: true };
      }
    });

    // 타입 검증
    this.rules.set('type', {
      validate: (value, expectedType) => {
        const actualType = typeof value;
        if (actualType !== expectedType) {
          return { 
            valid: false, 
            message: `타입이 일치하지 않습니다. 예상: ${expectedType}, 실제: ${actualType}` 
          };
        }
        return { valid: true };
      }
    });

    // 배열 검증
    this.rules.set('array', {
      validate: (value, options = {}) => {
        if (!Array.isArray(value)) {
          return { valid: false, message: '배열이어야 합니다' };
        }
        
        if (options.minLength && value.length < options.minLength) {
          return { valid: false, message: `최소 ${options.minLength}개의 항목이 필요합니다` };
        }
        
        if (options.maxLength && value.length > options.maxLength) {
          return { valid: false, message: `최대 ${options.maxLength}개의 항목만 허용됩니다` };
        }
        
        return { valid: true };
      }
    });

    // 색상 검증
    this.rules.set('color', {
      validate: (value) => {
        if (!value) return { valid: true };
        
        // Hex 색상 패턴
        const hexPattern = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
        // RGB 색상 패턴
        const rgbPattern = /^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/;
        // RGBA 색상 패턴
        const rgbaPattern = /^rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[\d.]+\s*\)$/;
        
        if (!hexPattern.test(value) && !rgbPattern.test(value) && !rgbaPattern.test(value)) {
          return { valid: false, message: '유효한 색상 형식이 아닙니다' };
        }
        
        return { valid: true };
      }
    });

    // 숫자 범위 검증
    this.rules.set('range', {
      validate: (value, options) => {
        const num = Number(value);
        
        if (isNaN(num)) {
          return { valid: false, message: '숫자여야 합니다' };
        }
        
        if (options.min !== undefined && num < options.min) {
          return { valid: false, message: `최소값은 ${options.min}입니다` };
        }
        
        if (options.max !== undefined && num > options.max) {
          return { valid: false, message: `최대값은 ${options.max}입니다` };
        }
        
        return { valid: true };
      }
    });

    // 이넘 검증
    this.rules.set('enum', {
      validate: (value, allowedValues) => {
        if (!allowedValues.includes(value)) {
          return { 
            valid: false, 
            message: `허용된 값이 아닙니다. 허용값: ${allowedValues.join(', ')}` 
          };
        }
        return { valid: true };
      }
    });
  }

  /**
   * 차트 설정 검증 - 메인 메소드
   */
  async validate(config) {
    const errors = [];

    try {
      // 기본 구조 검증
      const structureErrors = this.validateStructure(config);
      errors.push(...structureErrors);

      // 차트 타입 검증
      const typeErrors = this.validateChartType(config);
      errors.push(...typeErrors);

      // 데이터 검증
      const dataErrors = this.validateData(config);
      errors.push(...dataErrors);

      // 옵션 검증
      const optionErrors = this.validateOptions(config);
      errors.push(...optionErrors);

      // 테마 검증
      if (config.theme) {
        const themeErrors = this.validateTheme(config.theme);
        errors.push(...themeErrors);
      }

      return {
        isValid: errors.length === 0,
        errors: errors,
        warnings: this.generateWarnings(config)
      };

    } catch (error) {
      return {
        isValid: false,
        errors: [`검증 중 오류 발생: ${error.message}`],
        warnings: []
      };
    }
  }

  /**
   * 기본 구조 검증
   */
  validateStructure(config) {
    const errors = [];

    // 필수 필드 검증
    const requiredFields = ['type', 'data'];
    
    for (const field of requiredFields) {
      const result = this.applyRule('required', config[field], field);
      if (!result.valid) {
        errors.push(result.message);
      }
    }

    // 타입 검증
    if (config.type) {
      const result = this.applyRule('type', config.type, 'string');
      if (!result.valid) {
        errors.push(result.message);
      }
    }

    // 옵션 타입 검증
    if (config.options && typeof config.options !== 'object') {
      errors.push('options는 객체여야 합니다');
    }

    return errors;
  }

  /**
   * 차트 타입 검증
   */
  validateChartType(config) {
    const errors = [];
    
    const supportedTypes = [
      'line', 'bar', 'pie', 'doughnut', 'scatter', 'bubble', 'area',
      'heatmap', 'boxplot', 'violin', 'treemap', 'sankey', 'funnel',
      'gauge', 'radar', 'waterfall', 'candlestick', 'bullet'
    ];

    if (!supportedTypes.includes(config.type)) {
      errors.push(`지원하지 않는 차트 타입: ${config.type}`);
    }

    return errors;
  }

  /**
   * 데이터 검증
   */
  validateData(config) {
    const errors = [];
    const { type, data } = config;

    if (!data) {
      errors.push('데이터가 제공되지 않았습니다');
      return errors;
    }

    // 차트 타입별 데이터 검증
    switch (type) {
      case 'line':
      case 'bar':
      case 'area':
        errors.push(...this.validateLineBarData(data));
        break;
      case 'pie':
      case 'doughnut':
        errors.push(...this.validatePieData(data));
        break;
      case 'scatter':
      case 'bubble':
        errors.push(...this.validateScatterData(data));
        break;
      case 'heatmap':
        errors.push(...this.validateHeatmapData(data));
        break;
      case 'boxplot':
        errors.push(...this.validateBoxplotData(data));
        break;
      default:
        errors.push(...this.validateGenericData(data));
        break;
    }

    return errors;
  }

  /**
   * 라인/바 차트 데이터 검증
   */
  validateLineBarData(data) {
    const errors = [];

    // labels 검증
    if (!data.labels) {
      errors.push('labels가 필요합니다');
    } else {
      const result = this.applyRule('array', data.labels, { minLength: 1 });
      if (!result.valid) {
        errors.push(`labels: ${result.message}`);
      }
    }

    // datasets 검증
    if (!data.datasets) {
      errors.push('datasets가 필요합니다');
    } else {
      const result = this.applyRule('array', data.datasets, { minLength: 1 });
      if (!result.valid) {
        errors.push(`datasets: ${result.message}`);
      } else {
        // 각 데이터셋 검증
        data.datasets.forEach((dataset, index) => {
          const datasetErrors = this.validateDataset(dataset, index);
          errors.push(...datasetErrors);
        });
      }
    }

    return errors;
  }

  /**
   * 파이 차트 데이터 검증
   */
  validatePieData(data) {
    const errors = [];

    if (!data.labels) {
      errors.push('파이 차트에는 labels가 필요합니다');
    }

    if (!data.datasets || !Array.isArray(data.datasets) || data.datasets.length === 0) {
      errors.push('파이 차트에는 최소 하나의 데이터셋이 필요합니다');
    } else {
      const dataset = data.datasets[0];
      if (!dataset.data || !Array.isArray(dataset.data)) {
        errors.push('파이 차트 데이터셋에는 data 배열이 필요합니다');
      } else {
        // 모든 값이 숫자인지 확인
        dataset.data.forEach((value, index) => {
          if (typeof value !== 'number' || isNaN(value)) {
            errors.push(`데이터셋 값 ${index}는 유효한 숫자여야 합니다`);
          }
        });
      }
    }

    return errors;
  }

  /**
   * 산점도 데이터 검증
   */
  validateScatterData(data) {
    const errors = [];

    if (!data.datasets || !Array.isArray(data.datasets)) {
      errors.push('산점도에는 datasets 배열이 필요합니다');
      return errors;
    }

    data.datasets.forEach((dataset, index) => {
      if (!dataset.data || !Array.isArray(dataset.data)) {
        errors.push(`데이터셋 ${index}에는 data 배열이 필요합니다`);
      } else {
        // 각 데이터 포인트 검증
        dataset.data.forEach((point, pointIndex) => {
          if (!point || typeof point !== 'object') {
            errors.push(`데이터셋 ${index}, 포인트 ${pointIndex}는 객체여야 합니다`);
          } else {
            if (typeof point.x !== 'number' || typeof point.y !== 'number') {
              errors.push(`데이터셋 ${index}, 포인트 ${pointIndex}는 x, y 숫자 값이 필요합니다`);
            }
          }
        });
      }
    });

    return errors;
  }

  /**
   * 히트맵 데이터 검증
   */
  validateHeatmapData(data) {
    const errors = [];

    if (!data.datasets || !Array.isArray(data.datasets)) {
      errors.push('히트맵에는 datasets 배열이 필요합니다');
      return errors;
    }

    const dataset = data.datasets[0];
    if (!dataset.data || !Array.isArray(dataset.data)) {
      errors.push('히트맵 데이터셋에는 data 배열이 필요합니다');
    } else {
      // 2차원 배열 검증
      dataset.data.forEach((row, rowIndex) => {
        if (!Array.isArray(row)) {
          errors.push(`히트맵 데이터 행 ${rowIndex}는 배열이어야 합니다`);
        } else {
          row.forEach((value, colIndex) => {
            if (typeof value !== 'number' || isNaN(value)) {
              errors.push(`히트맵 데이터 [${rowIndex}][${colIndex}]는 숫자여야 합니다`);
            }
          });
        }
      });
    }

    return errors;
  }

  /**
   * 박스플롯 데이터 검증
   */
  validateBoxplotData(data) {
    const errors = [];

    if (!data.datasets || !Array.isArray(data.datasets)) {
      errors.push('박스플롯에는 datasets 배열이 필요합니다');
      return errors;
    }

    data.datasets.forEach((dataset, index) => {
      if (!dataset.data || !Array.isArray(dataset.data)) {
        errors.push(`박스플롯 데이터셋 ${index}에는 data 배열이 필요합니다`);
      } else {
        // 각 박스 데이터 검증
        dataset.data.forEach((box, boxIndex) => {
          if (!box || typeof box !== 'object') {
            errors.push(`박스플롯 데이터셋 ${index}, 박스 ${boxIndex}는 객체여야 합니다`);
          } else {
            const requiredFields = ['min', 'q1', 'median', 'q3', 'max'];
            for (const field of requiredFields) {
              if (typeof box[field] !== 'number') {
                errors.push(`박스플롯 데이터셋 ${index}, 박스 ${boxIndex}에서 ${field}는 숫자여야 합니다`);
              }
            }
          }
        });
      }
    });

    return errors;
  }

  /**
   * 일반 데이터 검증
   */
  validateGenericData(data) {
    const errors = [];

    if (!data.datasets || !Array.isArray(data.datasets)) {
      errors.push('데이터셋 배열이 필요합니다');
    }

    return errors;
  }

  /**
   * 데이터셋 검증
   */
  validateDataset(dataset, index) {
    const errors = [];

    if (!dataset.data || !Array.isArray(dataset.data)) {
      errors.push(`데이터셋 ${index}에는 data 배열이 필요합니다`);
    }

    // 색상 검증
    if (dataset.backgroundColor) {
      const colorResult = this.applyRule('color', dataset.backgroundColor);
      if (!colorResult.valid) {
        errors.push(`데이터셋 ${index} backgroundColor: ${colorResult.message}`);
      }
    }

    if (dataset.borderColor) {
      const colorResult = this.applyRule('color', dataset.borderColor);
      if (!colorResult.valid) {
        errors.push(`데이터셋 ${index} borderColor: ${colorResult.message}`);
      }
    }

    // 숫자 값 검증
    if (dataset.borderWidth !== undefined) {
      const rangeResult = this.applyRule('range', dataset.borderWidth, { min: 0 });
      if (!rangeResult.valid) {
        errors.push(`데이터셋 ${index} borderWidth: ${rangeResult.message}`);
      }
    }

    return errors;
  }

  /**
   * 옵션 검증
   */
  validateOptions(config) {
    const errors = [];

    if (!config.options) {
      return errors;
    }

    const options = config.options;

    // 반응형 옵션 검증
    if (options.responsive !== undefined && typeof options.responsive !== 'boolean') {
      errors.push('responsive 옵션은 boolean이어야 합니다');
    }

    // 스케일 옵션 검증
    if (options.scales) {
      const scaleErrors = this.validateScales(options.scales);
      errors.push(...scaleErrors);
    }

    // 플러그인 옵션 검증
    if (options.plugins) {
      const pluginErrors = this.validatePlugins(options.plugins);
      errors.push(...pluginErrors);
    }

    return errors;
  }

  /**
   * 스케일 검증
   */
  validateScales(scales) {
    const errors = [];

    Object.keys(scales).forEach(scaleKey => {
      const scale = scales[scaleKey];

      if (scale.type) {
        const allowedTypes = ['linear', 'logarithmic', 'category', 'time', 'radialLinear'];
        const typeResult = this.applyRule('enum', scale.type, allowedTypes);
        if (!typeResult.valid) {
          errors.push(`스케일 ${scaleKey} type: ${typeResult.message}`);
        }
      }

      if (scale.min !== undefined && typeof scale.min !== 'number') {
        errors.push(`스케일 ${scaleKey} min은 숫자여야 합니다`);
      }

      if (scale.max !== undefined && typeof scale.max !== 'number') {
        errors.push(`스케일 ${scaleKey} max는 숫자여야 합니다`);
      }
    });

    return errors;
  }

  /**
   * 플러그인 검증
   */
  validatePlugins(plugins) {
    const errors = [];

    if (plugins.legend) {
      const legend = plugins.legend;
      
      if (legend.position) {
        const allowedPositions = ['top', 'bottom', 'left', 'right'];
        const positionResult = this.applyRule('enum', legend.position, allowedPositions);
        if (!positionResult.valid) {
          errors.push(`범례 position: ${positionResult.message}`);
        }
      }
    }

    if (plugins.tooltip) {
      const tooltip = plugins.tooltip;
      
      if (tooltip.mode) {
        const allowedModes = ['point', 'nearest', 'index', 'dataset', 'x', 'y'];
        const modeResult = this.applyRule('enum', tooltip.mode, allowedModes);
        if (!modeResult.valid) {
          errors.push(`툴팁 mode: ${modeResult.message}`);
        }
      }
    }

    return errors;
  }

  /**
   * 테마 검증
   */
  validateTheme(theme) {
    const errors = [];

    if (typeof theme !== 'object') {
      errors.push('테마는 객체여야 합니다');
      return errors;
    }

    // 색상 팔레트 검증
    if (theme.colors && Array.isArray(theme.colors)) {
      theme.colors.forEach((color, index) => {
        const colorResult = this.applyRule('color', color);
        if (!colorResult.valid) {
          errors.push(`테마 색상 ${index}: ${colorResult.message}`);
        }
      });
    }

    return errors;
  }

  /**
   * 경고 생성
   */
  generateWarnings(config) {
    const warnings = [];

    // 성능 관련 경고
    if (config.data && config.data.datasets) {
      const totalDataPoints = config.data.datasets.reduce((total, dataset) => {
        return total + (dataset.data ? dataset.data.length : 0);
      }, 0);

      if (totalDataPoints > 10000) {
        warnings.push('데이터 포인트가 많아 성능에 영향을 줄 수 있습니다');
      }
    }

    // 접근성 관련 경고
    if (config.options && config.options.plugins && config.options.plugins.legend) {
      if (config.options.plugins.legend.display === false) {
        warnings.push('범례가 비활성화되어 접근성에 영향을 줄 수 있습니다');
      }
    }

    return warnings;
  }

  /**
   * 규칙 적용
   */
  applyRule(ruleName, value, options) {
    const rule = this.rules.get(ruleName);
    
    if (!rule) {
      throw new Error(`존재하지 않는 규칙: ${ruleName}`);
    }

    return rule.validate(value, options);
  }

  /**
   * 사용자 정의 규칙 추가
   */
  addRule(name, validator) {
    if (typeof validator !== 'function') {
      throw new Error('검증기는 함수여야 합니다');
    }

    this.rules.set(name, {
      validate: validator
    });
  }

  /**
   * 규칙 제거
   */
  removeRule(name) {
    return this.rules.delete(name);
  }

  /**
   * 등록된 규칙 목록 조회
   */
  getRules() {
    return Array.from(this.rules.keys());
  }
}

export default ChartConfigValidator;