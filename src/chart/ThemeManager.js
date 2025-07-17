/**
 * 테마 매니저
 * 차트 테마 관리 및 적용을 담당
 */

export class ThemeManager {
  constructor() {
    this.themes = new Map();
    this.activeTheme = 'default';
    this.customThemes = new Map();
    
    this.setupDefaultThemes();
  }

  /**
   * 기본 테마 설정
   */
  setupDefaultThemes() {
    // 기본 테마
    this.themes.set('default', {
      name: 'Default',
      colors: {
        primary: '#3B82F6',
        secondary: '#EF4444',
        success: '#10B981',
        warning: '#F59E0B',
        info: '#06B6D4',
        palette: [
          '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
          '#06B6D4', '#F97316', '#84CC16', '#EC4899', '#6B7280'
        ]
      },
      fonts: {
        family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        title: {
          size: 16,
          weight: 'bold',
          color: '#1F2937'
        },
        legend: {
          size: 12,
          weight: 'normal',
          color: '#374151'
        },
        ticks: {
          size: 11,
          weight: 'normal',
          color: '#6B7280'
        },
        tooltip: {
          size: 12,
          weight: 'normal',
          color: '#1F2937'
        }
      },
      spacing: {
        padding: 20,
        legend: 20,
        title: 10,
        ticks: 8
      },
      borders: {
        width: 1,
        color: '#E5E7EB',
        radius: 4
      },
      backgrounds: {
        chart: '#FFFFFF',
        grid: '#F3F4F6',
        tooltip: '#1F2937'
      },
      animations: {
        duration: 1000,
        easing: 'easeInOutQuart'
      }
    });

    // 다크 테마
    this.themes.set('dark', {
      name: 'Dark',
      colors: {
        primary: '#60A5FA',
        secondary: '#F87171',
        success: '#34D399',
        warning: '#FBBF24',
        info: '#22D3EE',
        palette: [
          '#60A5FA', '#F87171', '#34D399', '#FBBF24', '#A78BFA',
          '#22D3EE', '#FB923C', '#A3E635', '#F472B6', '#9CA3AF'
        ]
      },
      fonts: {
        family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        title: {
          size: 16,
          weight: 'bold',
          color: '#F9FAFB'
        },
        legend: {
          size: 12,
          weight: 'normal',
          color: '#E5E7EB'
        },
        ticks: {
          size: 11,
          weight: 'normal',
          color: '#9CA3AF'
        },
        tooltip: {
          size: 12,
          weight: 'normal',
          color: '#F9FAFB'
        }
      },
      spacing: {
        padding: 20,
        legend: 20,
        title: 10,
        ticks: 8
      },
      borders: {
        width: 1,
        color: '#374151',
        radius: 4
      },
      backgrounds: {
        chart: '#1F2937',
        grid: '#374151',
        tooltip: '#111827'
      },
      animations: {
        duration: 1000,
        easing: 'easeInOutQuart'
      }
    });

    // 라이트 테마
    this.themes.set('light', {
      name: 'Light',
      colors: {
        primary: '#2563EB',
        secondary: '#DC2626',
        success: '#059669',
        warning: '#D97706',
        info: '#0891B2',
        palette: [
          '#2563EB', '#DC2626', '#059669', '#D97706', '#7C3AED',
          '#0891B2', '#EA580C', '#65A30D', '#DB2777', '#4B5563'
        ]
      },
      fonts: {
        family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        title: {
          size: 16,
          weight: 'bold',
          color: '#111827'
        },
        legend: {
          size: 12,
          weight: 'normal',
          color: '#1F2937'
        },
        ticks: {
          size: 11,
          weight: 'normal',
          color: '#374151'
        },
        tooltip: {
          size: 12,
          weight: 'normal',
          color: '#111827'
        }
      },
      spacing: {
        padding: 20,
        legend: 20,
        title: 10,
        ticks: 8
      },
      borders: {
        width: 1,
        color: '#D1D5DB',
        radius: 4
      },
      backgrounds: {
        chart: '#FFFFFF',
        grid: '#F9FAFB',
        tooltip: '#F3F4F6'
      },
      animations: {
        duration: 1000,
        easing: 'easeInOutQuart'
      }
    });

    // 비즈니스 테마
    this.themes.set('business', {
      name: 'Business',
      colors: {
        primary: '#1E40AF',
        secondary: '#BE123C',
        success: '#166534',
        warning: '#A16207',
        info: '#164E63',
        palette: [
          '#1E40AF', '#BE123C', '#166534', '#A16207', '#581C87',
          '#164E63', '#C2410C', '#365314', '#A21CAF', '#374151'
        ]
      },
      fonts: {
        family: '"Inter", "Segoe UI", Roboto, sans-serif',
        title: {
          size: 18,
          weight: 'bold',
          color: '#1F2937'
        },
        legend: {
          size: 13,
          weight: 'medium',
          color: '#374151'
        },
        ticks: {
          size: 12,
          weight: 'normal',
          color: '#6B7280'
        },
        tooltip: {
          size: 13,
          weight: 'medium',
          color: '#1F2937'
        }
      },
      spacing: {
        padding: 24,
        legend: 24,
        title: 12,
        ticks: 10
      },
      borders: {
        width: 2,
        color: '#E5E7EB',
        radius: 6
      },
      backgrounds: {
        chart: '#FFFFFF',
        grid: '#F8FAFC',
        tooltip: '#F1F5F9'
      },
      animations: {
        duration: 800,
        easing: 'easeInOutCubic'
      }
    });

    // 모던 테마
    this.themes.set('modern', {
      name: 'Modern',
      colors: {
        primary: '#6366F1',
        secondary: '#EC4899',
        success: '#10B981',
        warning: '#F59E0B',
        info: '#06B6D4',
        palette: [
          '#6366F1', '#EC4899', '#10B981', '#F59E0B', '#8B5CF6',
          '#06B6D4', '#F97316', '#84CC16', '#EF4444', '#64748B'
        ]
      },
      fonts: {
        family: '"Poppins", "Segoe UI", Roboto, sans-serif',
        title: {
          size: 17,
          weight: '600',
          color: '#1E293B'
        },
        legend: {
          size: 12,
          weight: '500',
          color: '#334155'
        },
        ticks: {
          size: 11,
          weight: '400',
          color: '#64748B'
        },
        tooltip: {
          size: 12,
          weight: '500',
          color: '#1E293B'
        }
      },
      spacing: {
        padding: 20,
        legend: 20,
        title: 10,
        ticks: 8
      },
      borders: {
        width: 0,
        color: 'transparent',
        radius: 8
      },
      backgrounds: {
        chart: '#FFFFFF',
        grid: '#F8FAFC',
        tooltip: '#FFFFFF'
      },
      animations: {
        duration: 1200,
        easing: 'easeInOutBack'
      }
    });

    // 미니멀 테마
    this.themes.set('minimal', {
      name: 'Minimal',
      colors: {
        primary: '#000000',
        secondary: '#666666',
        success: '#000000',
        warning: '#000000',
        info: '#000000',
        palette: [
          '#000000', '#333333', '#666666', '#999999', '#CCCCCC',
          '#1A1A1A', '#4D4D4D', '#808080', '#B3B3B3', '#E6E6E6'
        ]
      },
      fonts: {
        family: '"Helvetica Neue", "Helvetica", Arial, sans-serif',
        title: {
          size: 16,
          weight: 'normal',
          color: '#000000'
        },
        legend: {
          size: 12,
          weight: 'normal',
          color: '#333333'
        },
        ticks: {
          size: 11,
          weight: 'normal',
          color: '#666666'
        },
        tooltip: {
          size: 12,
          weight: 'normal',
          color: '#000000'
        }
      },
      spacing: {
        padding: 16,
        legend: 16,
        title: 8,
        ticks: 6
      },
      borders: {
        width: 1,
        color: '#E0E0E0',
        radius: 0
      },
      backgrounds: {
        chart: '#FFFFFF',
        grid: '#F5F5F5',
        tooltip: '#FFFFFF'
      },
      animations: {
        duration: 600,
        easing: 'easeInOutQuad'
      }
    });
  }

  /**
   * 테마 적용
   */
  async applyTheme(config, themeName = null) {
    const theme = this.getTheme(themeName || this.activeTheme);
    
    if (!theme) {
      console.warn(`테마를 찾을 수 없습니다: ${themeName}`);
      return config;
    }

    // 깊은 복사
    const themedConfig = JSON.parse(JSON.stringify(config));

    // 색상 적용
    themedConfig = this.applyColors(themedConfig, theme.colors);

    // 폰트 적용
    themedConfig = this.applyFonts(themedConfig, theme.fonts);

    // 간격 적용
    themedConfig = this.applySpacing(themedConfig, theme.spacing);

    // 경계선 적용
    themedConfig = this.applyBorders(themedConfig, theme.borders);

    // 배경 적용
    themedConfig = this.applyBackgrounds(themedConfig, theme.backgrounds);

    // 애니메이션 적용
    themedConfig = this.applyAnimations(themedConfig, theme.animations);

    return themedConfig;
  }

  /**
   * 색상 적용
   */
  applyColors(config, colors) {
    if (!config.data || !config.data.datasets) {
      return config;
    }

    config.data.datasets.forEach((dataset, index) => {
      // 배경색 적용
      if (!dataset.backgroundColor) {
        if (Array.isArray(dataset.data)) {
          // 다중 색상 (파이 차트 등)
          dataset.backgroundColor = colors.palette.slice(0, dataset.data.length);
        } else {
          // 단일 색상
          dataset.backgroundColor = colors.palette[index % colors.palette.length];
        }
      }

      // 테두리 색상 적용
      if (!dataset.borderColor) {
        if (Array.isArray(dataset.data)) {
          dataset.borderColor = colors.palette.slice(0, dataset.data.length);
        } else {
          dataset.borderColor = colors.palette[index % colors.palette.length];
        }
      }

      // 포인트 색상 적용 (라인 차트)
      if (config.type === 'line' && !dataset.pointBackgroundColor) {
        dataset.pointBackgroundColor = colors.palette[index % colors.palette.length];
      }
    });

    return config;
  }

  /**
   * 폰트 적용
   */
  applyFonts(config, fonts) {
    if (!config.options) {
      config.options = {};
    }

    if (!config.options.plugins) {
      config.options.plugins = {};
    }

    if (!config.options.scales) {
      config.options.scales = {};
    }

    // 기본 폰트 설정
    config.options.font = {
      family: fonts.family
    };

    // 범례 폰트
    if (!config.options.plugins.legend) {
      config.options.plugins.legend = {};
    }
    if (!config.options.plugins.legend.labels) {
      config.options.plugins.legend.labels = {};
    }
    config.options.plugins.legend.labels.font = fonts.legend;

    // 제목 폰트
    if (!config.options.plugins.title) {
      config.options.plugins.title = {};
    }
    config.options.plugins.title.font = fonts.title;

    // 툴팁 폰트
    if (!config.options.plugins.tooltip) {
      config.options.plugins.tooltip = {};
    }
    config.options.plugins.tooltip.titleFont = fonts.tooltip;
    config.options.plugins.tooltip.bodyFont = fonts.tooltip;

    // 축 폰트
    Object.keys(config.options.scales).forEach(scaleKey => {
      const scale = config.options.scales[scaleKey];
      
      if (scale.title) {
        scale.title.font = fonts.title;
      }
      
      if (scale.ticks) {
        scale.ticks.font = fonts.ticks;
      }
    });

    return config;
  }

  /**
   * 간격 적용
   */
  applySpacing(config, spacing) {
    if (!config.options) {
      config.options = {};
    }

    if (!config.options.layout) {
      config.options.layout = {};
    }

    // 차트 여백
    config.options.layout.padding = spacing.padding;

    // 범례 간격
    if (!config.options.plugins) {
      config.options.plugins = {};
    }
    if (!config.options.plugins.legend) {
      config.options.plugins.legend = {};
    }
    if (!config.options.plugins.legend.labels) {
      config.options.plugins.legend.labels = {};
    }
    config.options.plugins.legend.labels.padding = spacing.legend;

    // 제목 간격
    if (!config.options.plugins.title) {
      config.options.plugins.title = {};
    }
    config.options.plugins.title.padding = spacing.title;

    return config;
  }

  /**
   * 경계선 적용
   */
  applyBorders(config, borders) {
    if (!config.data || !config.data.datasets) {
      return config;
    }

    config.data.datasets.forEach(dataset => {
      if (!dataset.borderWidth) {
        dataset.borderWidth = borders.width;
      }
      
      if (!dataset.borderRadius && borders.radius > 0) {
        dataset.borderRadius = borders.radius;
      }
    });

    // 그리드 선
    if (!config.options) {
      config.options = {};
    }
    if (!config.options.scales) {
      config.options.scales = {};
    }

    Object.keys(config.options.scales).forEach(scaleKey => {
      const scale = config.options.scales[scaleKey];
      
      if (!scale.grid) {
        scale.grid = {};
      }
      
      scale.grid.color = borders.color;
      scale.grid.borderColor = borders.color;
    });

    return config;
  }

  /**
   * 배경 적용
   */
  applyBackgrounds(config, backgrounds) {
    if (!config.options) {
      config.options = {};
    }

    // 차트 배경
    config.options.backgroundColor = backgrounds.chart;

    // 그리드 배경
    if (!config.options.scales) {
      config.options.scales = {};
    }

    Object.keys(config.options.scales).forEach(scaleKey => {
      const scale = config.options.scales[scaleKey];
      
      if (!scale.grid) {
        scale.grid = {};
      }
      
      scale.grid.color = backgrounds.grid;
    });

    // 툴팁 배경
    if (!config.options.plugins) {
      config.options.plugins = {};
    }
    if (!config.options.plugins.tooltip) {
      config.options.plugins.tooltip = {};
    }
    config.options.plugins.tooltip.backgroundColor = backgrounds.tooltip;

    return config;
  }

  /**
   * 애니메이션 적용
   */
  applyAnimations(config, animations) {
    if (!config.options) {
      config.options = {};
    }

    if (!config.options.animation) {
      config.options.animation = {};
    }

    config.options.animation.duration = animations.duration;
    config.options.animation.easing = animations.easing;

    return config;
  }

  /**
   * 테마 조회
   */
  getTheme(themeName) {
    return this.themes.get(themeName) || this.customThemes.get(themeName);
  }

  /**
   * 모든 테마 조회
   */
  getAllThemes() {
    const themes = [];
    
    // 기본 테마
    for (const [name, theme] of this.themes.entries()) {
      themes.push({ name, ...theme, type: 'builtin' });
    }
    
    // 사용자 정의 테마
    for (const [name, theme] of this.customThemes.entries()) {
      themes.push({ name, ...theme, type: 'custom' });
    }
    
    return themes;
  }

  /**
   * 활성 테마 설정
   */
  setActiveTheme(themeName) {
    if (this.themes.has(themeName) || this.customThemes.has(themeName)) {
      this.activeTheme = themeName;
      return true;
    }
    
    console.warn(`테마를 찾을 수 없습니다: ${themeName}`);
    return false;
  }

  /**
   * 활성 테마 조회
   */
  getActiveTheme() {
    return this.activeTheme;
  }

  /**
   * 사용자 정의 테마 추가
   */
  addCustomTheme(name, theme) {
    // 기본 테마 구조 검증
    if (!this.validateTheme(theme)) {
      throw new Error('유효하지 않은 테마 구조입니다');
    }

    // 기본값 병합
    const completeTheme = this.mergeWithDefault(theme);
    
    this.customThemes.set(name, completeTheme);
    return completeTheme;
  }

  /**
   * 사용자 정의 테마 제거
   */
  removeCustomTheme(name) {
    if (this.customThemes.has(name)) {
      this.customThemes.delete(name);
      
      // 활성 테마가 제거된 경우 기본값으로 변경
      if (this.activeTheme === name) {
        this.activeTheme = 'default';
      }
      
      return true;
    }
    
    return false;
  }

  /**
   * 테마 복제
   */
  cloneTheme(sourceName, targetName) {
    const sourceTheme = this.getTheme(sourceName);
    
    if (!sourceTheme) {
      throw new Error(`소스 테마를 찾을 수 없습니다: ${sourceName}`);
    }

    const clonedTheme = JSON.parse(JSON.stringify(sourceTheme));
    clonedTheme.name = targetName;
    
    this.customThemes.set(targetName, clonedTheme);
    return clonedTheme;
  }

  /**
   * 테마 병합
   */
  mergeThemes(baseThemeName, overrideTheme) {
    const baseTheme = this.getTheme(baseThemeName);
    
    if (!baseTheme) {
      throw new Error(`기본 테마를 찾을 수 없습니다: ${baseThemeName}`);
    }

    return this.deepMerge(baseTheme, overrideTheme);
  }

  /**
   * 테마 미리보기
   */
  previewTheme(config, themeName) {
    const originalTheme = this.activeTheme;
    
    try {
      return this.applyTheme(config, themeName);
    } finally {
      // 원래 테마로 복원 (실제로는 변경되지 않음)
      this.activeTheme = originalTheme;
    }
  }

  /**
   * 테마 내보내기
   */
  exportTheme(themeName) {
    const theme = this.getTheme(themeName);
    
    if (!theme) {
      throw new Error(`테마를 찾을 수 없습니다: ${themeName}`);
    }

    return {
      name: themeName,
      theme: theme,
      version: '1.0.0',
      exportedAt: new Date().toISOString()
    };
  }

  /**
   * 테마 가져오기
   */
  importTheme(themeData) {
    if (!themeData || !themeData.name || !themeData.theme) {
      throw new Error('유효하지 않은 테마 데이터입니다');
    }

    if (!this.validateTheme(themeData.theme)) {
      throw new Error('유효하지 않은 테마 구조입니다');
    }

    this.customThemes.set(themeData.name, themeData.theme);
    return themeData.theme;
  }

  // === 내부 메소드 ===

  /**
   * 테마 검증
   */
  validateTheme(theme) {
    if (!theme || typeof theme !== 'object') {
      return false;
    }

    // 필수 속성 확인
    const requiredProps = ['colors', 'fonts', 'spacing'];
    
    for (const prop of requiredProps) {
      if (!theme[prop] || typeof theme[prop] !== 'object') {
        return false;
      }
    }

    // 색상 검증
    if (!theme.colors.palette || !Array.isArray(theme.colors.palette)) {
      return false;
    }

    // 폰트 검증
    if (!theme.fonts.family || typeof theme.fonts.family !== 'string') {
      return false;
    }

    return true;
  }

  /**
   * 기본값과 병합
   */
  mergeWithDefault(theme) {
    const defaultTheme = this.themes.get('default');
    return this.deepMerge(defaultTheme, theme);
  }

  /**
   * 깊은 병합
   */
  deepMerge(target, source) {
    const result = { ...target };
    
    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
          result[key] = this.deepMerge(result[key] || {}, source[key]);
        } else {
          result[key] = source[key];
        }
      }
    }
    
    return result;
  }

  /**
   * 색상 유틸리티 - HEX to RGB
   */
  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  /**
   * 색상 유틸리티 - RGB to HEX
   */
  rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => {
      const hex = x.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  }

  /**
   * 색상 유틸리티 - 밝기 조정
   */
  adjustBrightness(color, amount) {
    const rgb = this.hexToRgb(color);
    
    if (!rgb) return color;
    
    const adjusted = {
      r: Math.max(0, Math.min(255, rgb.r + amount)),
      g: Math.max(0, Math.min(255, rgb.g + amount)),
      b: Math.max(0, Math.min(255, rgb.b + amount))
    };
    
    return this.rgbToHex(adjusted.r, adjusted.g, adjusted.b);
  }

  /**
   * 색상 유틸리티 - 투명도 추가
   */
  addAlpha(color, alpha) {
    const rgb = this.hexToRgb(color);
    
    if (!rgb) return color;
    
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
  }

  /**
   * 색상 팔레트 생성
   */
  generateColorPalette(baseColor, count = 10) {
    const palette = [];
    const rgb = this.hexToRgb(baseColor);
    
    if (!rgb) return [baseColor];
    
    for (let i = 0; i < count; i++) {
      const hue = (i * 36) % 360; // 36도씩 회전
      const saturation = 70;
      const lightness = 50;
      
      palette.push(this.hslToHex(hue, saturation, lightness));
    }
    
    return palette;
  }

  /**
   * 색상 유틸리티 - HSL to HEX
   */
  hslToHex(h, s, l) {
    l /= 100;
    const a = s * Math.min(l, 1 - l) / 100;
    
    const f = n => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    
    return `#${f(0)}${f(8)}${f(4)}`;
  }

  /**
   * 테마 통계
   */
  getStats() {
    return {
      totalThemes: this.themes.size + this.customThemes.size,
      builtinThemes: this.themes.size,
      customThemes: this.customThemes.size,
      activeTheme: this.activeTheme,
      themeList: Array.from(this.themes.keys()).concat(Array.from(this.customThemes.keys()))
    };
  }
}

export default ThemeManager;