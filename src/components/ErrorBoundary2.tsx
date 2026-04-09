import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      let errorMessage = "Đã có lỗi xảy ra. Vui lòng thử lại sau.";
      let isQuotaError = false;

      try {
        if (this.state.error?.message) {
          const parsedError = JSON.parse(this.state.error.message);
          if (parsedError.error && parsedError.error.includes('Quota limit exceeded')) {
            isQuotaError = true;
            errorMessage = "Hệ thống đã vượt quá giới hạn truy cập miễn phí trong ngày của Firebase (50,000 lượt đọc). Giới hạn này sẽ được reset vào ngày mai. Vui lòng quay lại sau!";
          } else if (parsedError.error && parsedError.error.includes('Missing or insufficient permissions')) {
            errorMessage = "Bạn không có quyền thực hiện thao tác này.";
          }
        }
      } catch (e) {
        if (this.state.error?.message?.includes('Quota limit exceeded')) {
          isQuotaError = true;
          errorMessage = "Hệ thống đã vượt quá giới hạn truy cập miễn phí trong ngày của Firebase (50,000 lượt đọc). Giới hạn này sẽ được reset vào ngày mai. Vui lòng quay lại sau!";
        }
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-nie8-bg p-4">
          <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center">
            <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-2xl font-serif italic text-nie8-text mb-4">
              {isQuotaError ? "Tạm ngưng phục vụ" : "Oops!"}
            </h2>
            <p className="text-nie8-text/70 mb-6 leading-relaxed">
              {errorMessage}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-nie8-primary text-white rounded-full font-bold text-sm hover:bg-nie8-secondary transition-colors"
            >
              Tải lại trang
            </button>
          </div>
        </div>
      );
    }

    return (this.props as any).children;
  }
}
