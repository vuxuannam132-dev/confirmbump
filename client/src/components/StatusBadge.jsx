import React from 'react';
import { CheckCircle2, Clock, AlertTriangle, XCircle, Clock4, CheckCheck } from 'lucide-react';

export default function StatusBadge({ status, isMakeup = false }) {
  switch (status) {
    case 'DA_HOAN_THANH':
    case 'APPROVED':
      if (isMakeup) {
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-300">
            <CheckCheck className="w-3.5 h-3.5 mr-1 text-emerald-600" />
            Hoàn thành bù
          </span>
        );
      }
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-300">
          <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-green-600" />
          Đã hoàn thành
        </span>
      );

    case 'HOAN_THANH_BU':
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-300">
          <CheckCheck className="w-3.5 h-3.5 mr-1 text-emerald-600" />
          Hoàn thành bù
        </span>
      );

    case 'CHO_DUYET':
    case 'PENDING':
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-300 animate-pulse">
          <Clock className="w-3.5 h-3.5 mr-1 text-blue-600" />
          Chờ Admin Tổng duyệt
        </span>
      );

    case 'BI_TU_CHOI':
    case 'REJECTED':
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-300">
          <XCircle className="w-3.5 h-3.5 mr-1 text-red-600" />
          Bị từ chối (Nộp lại)
        </span>
      );

    case 'QUA_HAN_CHO_NOP_BU':
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-400">
          <AlertTriangle className="w-3.5 h-3.5 mr-1 text-amber-600" />
          Quá hạn (Cho nộp bù)
        </span>
      );

    case 'QUA_HAN_DA_DONG':
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-300">
          <Clock4 className="w-3.5 h-3.5 mr-1 text-slate-500" />
          Thiếu (Hết hạn bù)
        </span>
      );

    case 'CHUA_NOP':
    default:
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
          <Clock className="w-3.5 h-3.5 mr-1 text-slate-500" />
          Chưa nộp
        </span>
      );
  }
}
