import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    errorMessage: '',
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error.message || 'Unexpected application error',
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Application ErrorBoundary caught:', error, errorInfo);
  }

  private formatFriendlyMessage(raw: string): string {
    const lower = raw.toLowerCase();
    if (lower.includes('quota exceeded')) {
      return 'تم تجاوز الحد اليومي المجاني لقاعدة بيانات Firebase. سيتم إعادة التعيين تلقائياً في اليوم التالي.';
    }
    if (lower.includes('missing or insufficient permissions') || lower.includes('permission-denied')) {
      return 'صلاحيات حسابك في Firebase لا تسمح بهذه العملية. يرجى تسجيل الدخول بحساب الإدارة المعتمد.';
    }
    return 'حدث خطأ غير متوقع أثناء تحميل البيانات. يمكنك إعادة تحميل الصفحة للمتابعة.';
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          dir="rtl"
          className="min-h-screen bg-[#0B132B] text-white flex items-center justify-center p-6"
        >
          <div className="max-w-md w-full bg-white text-[#0B132B] rounded-2xl border border-[#C5A059]/40 shadow-2xl p-6 sm:p-8 space-y-4 text-center">
            <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" aria-hidden="true" />
            </div>
            <h1 className="text-lg font-bold">تنبيه النظام القانوني</h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              {this.formatFriendlyMessage(this.state.errorMessage)}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="w-full min-h-[46px] px-5 py-2.5 rounded-xl bg-[#C5A059] hover:bg-[#d4b06a] text-[#0B132B] font-bold text-sm inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" aria-hidden="true" />
              <span>إعادة تحميل الصفحة</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
