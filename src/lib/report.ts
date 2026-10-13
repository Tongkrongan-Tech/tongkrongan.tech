// Alasan laporan penyalahgunaan: satu sumber untuk halaman lapor dan worker.
export const REPORT_REASONS = ['phishing', 'malware', 'spam', 'illegal', 'impersonation', 'other'] as const
export type ReportReason = (typeof REPORT_REASONS)[number]
