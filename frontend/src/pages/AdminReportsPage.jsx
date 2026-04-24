import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchAdminReport } from "../lib/adminApi";
import { formatDateTime } from "../lib/adminUi";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Select } from "../components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";

const REPORT_TYPES = [
  {
    key: "operations",
    label: "Operations summary",
    description: "Platform health, active usage, and recent admin activity.",
  },
  {
    key: "acquisition",
    label: "User acquisition",
    description: "Signup funnel, match volume, and user movement trends.",
  },
  {
    key: "scheme-quality",
    label: "Scheme quality",
    description: "Scheme review flags, inactive items, and enrichment coverage.",
  },
];

function formatDateInput(date) {
  return date.toISOString().slice(0, 10);
}

function makeDefaultDateRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 29);

  return {
    startDate: formatDateInput(start),
    endDate: formatDateInput(end),
  };
}

function downloadTextFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

function sanitizeFileName(value) {
  return String(value || "report")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function buildCsv(rows = []) {
  const escape = (value) => {
    const text = String(value ?? "");
    if (!/[",\n]/.test(text)) {
      return text;
    }

    return `"${text.replace(/"/g, '""')}"`;
  };

  return rows.map((row) => row.map(escape).join(",")).join("\n");
}

async function downloadPdf(report) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const left = 14;
  const width = doc.internal.pageSize.getWidth() - left * 2;
  let y = 18;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(report.title, left, y);
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(90, 100, 112);
  doc.text(`Range: ${report.dateLabel}`, left, y);
  y += 6;
  doc.text("Note: This report was generated from server-side data filtered to the selected date range.", left, y, {
    maxWidth: width,
  });
  y += 12;

  doc.setTextColor(20, 20, 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Highlights", left, y);
  y += 7;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  for (const item of report.highlights) {
    const lines = doc.splitTextToSize(`${item.label}: ${item.value}`, width);
    doc.text(lines, left, y);
    y += lines.length * 5 + 1;
  }

  y += 4;
  doc.setFont("helvetica", "bold");
  doc.text("Rows", left, y);
  y += 7;
  doc.setFont("helvetica", "normal");

  for (const row of report.tableRows.slice(0, 18)) {
    const lines = doc.splitTextToSize(row.join(" | "), width);
    if (y > 278) {
      doc.addPage();
      y = 18;
    }
    doc.text(lines, left, y);
    y += lines.length * 5 + 2;
  }

  doc.save(`${sanitizeFileName(report.title)}.pdf`);
}

function StatCard({ label, value, hint }) {
  return (
    <div className="rounded-[22px] border border-white/8 bg-slate-950/60 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
      <p className="mt-2 text-sm text-slate-400">{hint}</p>
    </div>
  );
}

export default function AdminReportsPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
    reportType: REPORT_TYPES[0].key,
    ...makeDefaultDateRange(),
  });
  const [report, setReport] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");

  const activeType = useMemo(
    () => REPORT_TYPES.find((item) => item.key === filters.reportType) || REPORT_TYPES[0],
    [filters.reportType]
  );

  async function handleGenerate() {
    setIsGenerating(true);
    setError("");

    try {
      if (!filters.startDate || !filters.endDate) {
        throw new Error("Start date and end date are required.");
      }

      if (filters.startDate > filters.endDate) {
        throw new Error("Start date must be before end date.");
      }

      const payload = await fetchAdminReport({
        reportType: filters.reportType,
        startDate: filters.startDate,
        endDate: filters.endDate,
      });

      if (payload === null) {
        navigate("/admin/login", { replace: true });
        return;
      }

      setReport(payload);
    } catch (buildError) {
      setError(buildError.message || "Could not generate report right now.");
    } finally {
      setIsGenerating(false);
    }
  }

  function handleCsvDownload() {
    if (!report) {
      return;
    }

    const csv = buildCsv([
      [report.title],
      ["Range", report.dateLabel],
      ["Generated at", formatDateTime(report.generatedAt)],
      [],
      ["Highlights"],
      ["Label", "Value"],
      ...report.highlights.map((item) => [item.label, item.value]),
      [],
      report.tableHeaders,
      ...report.tableRows,
    ]);

    downloadTextFile(`${sanitizeFileName(report.title)}.csv`, csv, "text/csv;charset=utf-8");
  }

  async function handlePdfDownload() {
    if (!report) {
      return;
    }

    await downloadPdf(report);
  }

  return (
    <section className="space-y-6">
      <Card className="rounded-[28px]">
        <CardHeader className="px-5 pt-5 sm:px-6 sm:pt-6">
          <Badge variant="success" className="w-fit uppercase tracking-[0.18em]">
            Reports
          </Badge>
          <CardTitle className="text-2xl sm:text-3xl">Reports</CardTitle>
          <CardDescription className="max-w-3xl leading-6">
            Choose a report type, set a date range, generate a preview, then download CSV or PDF output for ops reviews
            and stakeholder updates.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-5 pb-5 sm:px-6 sm:pb-6">
          <div className="grid gap-4 lg:grid-cols-[minmax(220px,1fr)_minmax(180px,0.8fr)_minmax(180px,0.8fr)_auto]">
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-100">Report type</span>
              <Select
                value={filters.reportType}
                onChange={(event) => setFilters((current) => ({ ...current, reportType: event.target.value }))}
              >
                {REPORT_TYPES.map((item) => (
                  <option key={item.key} value={item.key}>
                    {item.label}
                  </option>
                ))}
              </Select>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-100">Start date</span>
              <Input
                type="date"
                value={filters.startDate}
                max={filters.endDate || undefined}
                onChange={(event) => {
                  setFilters((current) => ({ ...current, startDate: event.target.value }));
                  setError("");
                }}
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-100">End date</span>
              <Input
                type="date"
                value={filters.endDate}
                min={filters.startDate || undefined}
                onChange={(event) => {
                  setFilters((current) => ({ ...current, endDate: event.target.value }));
                  setError("");
                }}
              />
            </label>

            <div className="flex items-end">
              <Button type="button" onClick={handleGenerate} disabled={isGenerating} className="w-full lg:w-auto">
                {isGenerating ? "Generating..." : "Generate"}
              </Button>
            </div>
          </div>

          <div className="mt-4 rounded-[20px] border border-white/8 bg-slate-950/60 px-4 py-3 text-sm text-slate-400">
            {activeType.description}
          </div>

          {error ? (
            <div className="mt-4 rounded-[20px] border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              {error}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {report ? (
        <>
          <section className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
            {report.highlights.map((item) => (
              <StatCard key={item.label} label={item.label} value={item.value} hint={report.dateLabel} />
            ))}
          </section>

          <Card className="rounded-[28px]">
            <CardHeader className="flex flex-col gap-4 px-5 pt-5 sm:px-6 sm:pt-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <CardTitle className="text-xl sm:text-2xl">{report.title}</CardTitle>
                <CardDescription className="leading-6">
                  Generated {formatDateTime(report.generatedAt)} for {report.dateLabel}
                </CardDescription>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:flex">
                <Button type="button" variant="outline" onClick={handleCsvDownload}>
                  Download CSV
                </Button>
                <Button type="button" variant="secondary" onClick={handlePdfDownload}>
                  Download PDF
                </Button>
              </div>
            </CardHeader>
            <CardContent className="px-5 pb-5 sm:px-6 sm:pb-6">
              <div className="space-y-3 lg:hidden">
                {report.tableRows.length ? (
                  report.tableRows.map((row, index) => (
                    <div key={`${row[0]}-${index}`} className="rounded-[22px] border border-white/8 bg-slate-950/60 p-4">
                      {row.map((value, valueIndex) => (
                        <div key={`${valueIndex}-${value}`} className={valueIndex === 0 ? "" : "mt-3"}>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                            {report.tableHeaders[valueIndex]}
                          </p>
                          <p className="mt-1 text-sm text-slate-100">{value}</p>
                        </div>
                      ))}
                    </div>
                  ))
                ) : (
                  <div className="rounded-[20px] border border-white/8 bg-slate-950/60 px-4 py-3 text-sm text-slate-400">
                    No rows available for this report.
                  </div>
                )}
              </div>

              <div className="hidden overflow-hidden rounded-[24px] border border-white/10 lg:block">
                <Table className="bg-slate-950/60">
                  <TableHeader className="bg-white/5">
                    <TableRow className="hover:bg-transparent">
                      {report.tableHeaders.map((header) => (
                        <TableHead key={header}>{header}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.tableRows.length ? (
                      report.tableRows.map((row, index) => (
                        <TableRow key={`${row[0]}-${index}`}>
                          {row.map((value, valueIndex) => (
                            <TableCell key={`${valueIndex}-${value}`} className={valueIndex === 0 ? "font-medium text-white" : "text-slate-300"}>
                              {value}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={report.tableHeaders.length} className="text-slate-400">
                          No rows available for this report.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      ) : null}
    </section>
  );
}
