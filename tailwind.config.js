/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/main/resources/static/**/*.{html,js}",
    "./src/main/resources/templates/**/*.{html,js}"
  ],
  theme: {
    extend: {
      colors: {
        // 브랜드 컬러
        'primary-red': '#e74c3c',
        'primary-dark-red': '#c0392b',
        'primary-blue': '#3498db',
        'primary-dark-blue': '#2980b9',
        'primary-green': '#27ae60',
        'primary-dark-green': '#229954',

        // 라이어 게임 테마 컬러
        'liar-red': '#e74c3c',
        'liar-dark': '#c0392b',
        'citizen-blue': '#3498db',
        'citizen-dark': '#2980b9',
        'truth-green': '#27ae60',
        'truth-dark': '#229954',
        'mystery-purple': '#8e44ad',
        'mystery-dark': '#732d91',

        // 뉴트럴 컬러
        'light-gray': '#f8f9fa',
        'medium-gray': '#e9ecef',
        'dark-gray': '#6c757d',
        'very-dark-gray': '#343a40',
      },
      backgroundImage: {
        // 그라데이션
        'gradient-primary': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'gradient-liar': 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
        'gradient-citizen': 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)',
        'gradient-truth': 'linear-gradient(135deg, #27ae60 0%, #229954 100%)',
        'gradient-mystery': 'linear-gradient(135deg, #8e44ad 0%, #732d91 100%)',
        'gradient-danger': 'linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)',
        'gradient-warning': 'linear-gradient(135deg, #ffeaa7 0%, #fdcb6e 100%)',
        'gradient-success': 'linear-gradient(135deg, #00b894 0%, #00cec9 100%)',
      },
      boxShadow: {
        'game': '0 8px 32px rgba(102, 126, 234, 0.15)',
        'liar': '0 4px 15px rgba(231, 76, 60, 0.3)',
        'citizen': '0 4px 15px rgba(52, 152, 219, 0.3)',
        'success': '0 8px 25px rgba(0, 184, 148, 0.3)',
      },
      borderRadius: {
        'pill': '50px',
      },
      fontFamily: {
        'game': ['Pretendard', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Noto Sans KR', 'Arial', 'sans-serif'],
        'mono': ['Monaco', 'Menlo', 'Courier New', 'monospace'],
      },
      fontSize: {
        'xs': '0.7rem',
        'sm': '0.8rem',
        'base': '0.9rem',
        'lg': '1rem',
        'xl': '1.1rem',
        '2xl': '1.3rem',
        '3xl': '1.5rem',
        '4xl': '1.8rem',
      },
      spacing: {
        'xs': '4px',
        'sm': '8px',
        'md': '12px',
        'lg': '16px',
        'xl': '20px',
        '2xl': '32px',
        '15': '60px', // h-15 클래스 지원
        '24': '96px', // min-h-24 클래스 지원
        '30': '120px', // countdown-circle용
        '36': '144px', // max-h-36 클래스 지원
        '44': '176px', // chat container용
        '60': '240px', // chat container용
        '72': '288px', // chat container용
        '96': '384px', // 추가 높이값
      },
      animation: {
        'fadeIn': 'fadeIn 0.3s ease-in-out',
        'modalAppear': 'modalAppear 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'messageSlideIn': 'messageSlideIn 0.3s ease-out',
        'roleReveal': 'roleReveal 0.8s ease-out',
        'wordReveal': 'wordReveal 1s ease-out 0.3s both',
        'float': 'float 3s ease-in-out infinite',
        'shine': 'shine 3s infinite',
        'countdown-pulse': 'countdown-pulse 1s ease-in-out infinite',
        'spin': 'spin 1s linear infinite',
        'bounce': 'bounce 2s infinite',
        'pulse': 'pulse 2s infinite',
        'deadLayerAppear': 'deadLayerAppear 0.8s ease-out',
        'deadPopupSlideIn': 'deadPopupSlideIn 0.8s ease-out',
        'deadIconBounce': 'deadIconBounce 2s ease-in-out infinite',
        'hintPulse': 'hintPulse 3s ease-in-out infinite',
        'countdownPulse': 'countdownPulse 1s infinite',
        'toastSlideIn': 'toastSlideIn 0.3s ease-out forwards',
        'toastSlideOut': 'toastSlideOut 0.3s ease-out forwards',
        'winnerModalAppear': 'winnerModalAppear 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'finalResultAppear': 'finalResultAppear 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'successPulse': 'successPulse 0.3s ease-out',
        'slideIn': 'slideIn 0.5s ease-out',
        'resultShine': 'resultShine 2s infinite',
      },
      keyframes: {
        fadeIn: {
          'from': { opacity: '0', transform: 'translateY(20px)' },
          'to': { opacity: '1', transform: 'translateY(0)' }
        },
        modalAppear: {
          'from': { opacity: '0', transform: 'scale(0.8) translateY(-50px)' },
          'to': { opacity: '1', transform: 'scale(1) translateY(0)' }
        },
        messageSlideIn: {
          'from': { opacity: '0', transform: 'translateY(20px) scale(0.95)' },
          'to': { opacity: '1', transform: 'translateY(0) scale(1)' }
        },
        roleReveal: {
          '0%': { opacity: '0', transform: 'scale(0.8) rotateY(-90deg)' },
          '50%': { transform: 'scale(1.1) rotateY(0deg)' },
          '100%': { opacity: '1', transform: 'scale(1) rotateY(0deg)' }
        },
        wordReveal: {
          '0%': { opacity: '0', transform: 'scale(0.9) translateY(20px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' }
        },
        float: {
          '0%, 100%': { transform: 'translateY(-50%) translateX(0)' },
          '50%': { transform: 'translateY(-50%) translateX(5px)' }
        },
        shine: {
          '0%': { transform: 'translateX(-100%) translateY(-100%) rotate(45deg)' },
          '100%': { transform: 'translateX(100%) translateY(100%) rotate(45deg)' }
        },
        'countdown-pulse': {
          '0%': { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(255, 255, 255, 0.7)' },
          '70%': { transform: 'scale(1.05)', boxShadow: '0 0 0 20px rgba(255, 255, 255, 0)' },
          '100%': { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(255, 255, 255, 0)' }
        },
        spin: {
          'from': { transform: 'rotate(0deg)' },
          'to': { transform: 'rotate(360deg)' }
        },
        bounce: {
          '0%, 20%, 50%, 80%, 100%': { transform: 'translateY(0)' },
          '40%': { transform: 'translateY(-30px)' },
          '60%': { transform: 'translateY(-15px)' }
        },
        pulse: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.1)' }
        },
        deadLayerAppear: {
          '0%': { opacity: '0', backdropFilter: 'blur(0px)' },
          '100%': { opacity: '1', backdropFilter: 'blur(3px)' }
        },
        deadPopupSlideIn: {
          '0%': { opacity: '0', transform: 'translateY(-50px) scale(0.9)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' }
        },
        deadIconBounce: {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.8' },
          '50%': { transform: 'scale(1.1)', opacity: '0.6' }
        },
        hintPulse: {
          '0%, 100%': { opacity: '0.6', transform: 'scale(1)' },
          '50%': { opacity: '0.8', transform: 'scale(1.02)' }
        },
        countdownPulse: {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.05)', opacity: '0.9' }
        },
        toastSlideIn: {
          'from': { transform: 'translateX(100%)', opacity: '0' },
          'to': { transform: 'translateX(0)', opacity: '1' }
        },
        toastSlideOut: {
          'from': { transform: 'translateX(0)', opacity: '1' },
          'to': { transform: 'translateX(100%)', opacity: '0' }
        },
        winnerModalAppear: {
          '0%': { opacity: '0', transform: 'scale(0.3) rotate(-10deg)' },
          '100%': { opacity: '1', transform: 'scale(1) rotate(0deg)' }
        },
        finalResultAppear: {
          '0%': { opacity: '0', transform: 'scale(0.5) translateY(-50px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' }
        },
        successPulse: {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.05)' },
          '100%': { transform: 'scale(1)' }
        },
        slideIn: {
          '0%': { opacity: '0', transform: 'translateY(-20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        resultShine: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' }
        }
      },
      backdropBlur: {
        '3': '3px',
        '10': '10px'
      },
      zIndex: {
        'modal': '1000',
        'overlay': '1001',
        'tooltip': '1002',
        'dropdown': '1003'
      }
    },
  },
  plugins: [],
}