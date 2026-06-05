import React, { useState, useEffect, useMemo } from "react";
import {
  getDashboardSummary,
  getAnalyticsFunnel,
  getAnalyticsVenue,
  getMoneyVenues,
  getMoneyVenue,
  updateVenuePricing,
} from "../services/adminStatsService";
import { resolveVenuePrices } from "../utils/venuePricing";
import {
  BarChart3,
  TrendingUp,
  Users,
  DollarSign,
  Music,
  CheckCircle,
  Clock,
  XCircle,
  Activity,
  MapPin,
  AlertCircle,
  QrCode,
} from "lucide-react";
import "./AdminDashboard.css";

function londonYmdBrowser() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function defaultSectionFilter() {
  return {
    preset: "today",
    customStart: londonYmdBrowser(),
    customEnd: londonYmdBrowser(),
  };
}

function sectionFilterToQuery(f) {
  const params = new URLSearchParams();
  if (f.preset === "custom" && f.customStart && f.customEnd) {
    params.set("range", "custom");
    params.set("startDate", f.customStart);
    params.set("endDate", f.customEnd);
    return `?${params.toString()}`;
  }
  const rangeMap = {
    today: "today",
    week: "week",
    month: "month",
    last6months: "last6months",
    year: "year",
  };
  params.set("range", rangeMap[f.preset] || "today");
  return `?${params.toString()}`;
}

function csvEscape(cell) {
  const s = String(cell ?? "");
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function buildVenueReportPayload(detail) {
  const funnel = detail?.funnel || {};
  const mm = detail?.mixmind || {};
  const jb = detail?.jukebox || {};
  const conv = funnel.venueFunnelConversionPct ?? funnel.visitToPaymentConversion ?? 0;
  return {
    venueName: detail?.venue?.name ?? "",
    dateRange: detail?.dateRange ?? null,
    appliedRangeLabel: detail?.appliedRange?.label ?? "",
    pageVisits: funnel.venuePageVisits ?? 0,
    venueTaggedQrScans: funnel.venueTaggedQrScans ?? 0,
    visitToPaymentConversionPct: conv,
    analyticsPaymentCompletions: funnel.analyticsCheckoutCompletions ?? 0,
    totalDbRequests: (mm.total ?? 0) + (jb.total ?? 0),
    mixmindAcceptedOrPipeline: mm.acceptedCompleted ?? 0,
    mixmindPending: mm.pending ?? 0,
    mixmindRejectedOrFailed: mm.rejectedFailed ?? 0,
    jukeboxQueuedSuccess: jb.queuedSuccess ?? 0,
    jukeboxPending: jb.pending ?? 0,
    jukeboxRejected: jb.rejected ?? 0,
    capturedMixmindRevenue: mm.capturedRevenue ?? 0,
    succeededJukeboxRevenue: jb.revenue ?? 0,
    totalTrueRevenue: (mm.capturedRevenue ?? 0) + (jb.revenue ?? 0),
    sources: detail?.sources ?? {},
    hourlyActivity: detail?.hourlyActivity ?? [],
    recentMixmindRequests: mm.recent ?? [],
    recentJukeboxRequests: jb.recent ?? [],
  };
}

function venueReportToCsv(p) {
  const lines = [];
  lines.push("field,value");
  const flat = [
    ["venue", p.venueName],
    ["appliedRange", p.appliedRangeLabel],
    ["dateFrom", p.dateRange?.from ?? ""],
    ["dateTo", p.dateRange?.to ?? ""],
    ["pageVisits_events", p.pageVisits],
    ["venueTaggedQrScans_events", p.venueTaggedQrScans],
    ["visitToPaymentConversionPct_events", p.visitToPaymentConversionPct],
    ["analyticsPaymentCompletions_events", p.analyticsPaymentCompletions],
    ["totalDbRequests", p.totalDbRequests],
    ["mixmindAcceptedOrPipeline_db", p.mixmindAcceptedOrPipeline],
    ["mixmindPending_db", p.mixmindPending],
    ["mixmindRejectedOrFailed_db", p.mixmindRejectedOrFailed],
    ["jukeboxQueuedSuccess_db", p.jukeboxQueuedSuccess],
    ["jukeboxPending_db", p.jukeboxPending],
    ["jukeboxRejected_db", p.jukeboxRejected],
    ["capturedMixmindRevenue_db", p.capturedMixmindRevenue],
    ["succeededJukeboxRevenue_db", p.succeededJukeboxRevenue],
    ["totalTrueRevenue_db", p.totalTrueRevenue],
  ];
  for (const [k, v] of flat) lines.push(`${csvEscape(k)},${csvEscape(v)}`);
  lines.push("");
  lines.push("hour,eventCount");
  for (const h of p.hourlyActivity) {
    lines.push(`${csvEscape(h.hour)},${csvEscape(h.count)}`);
  }
  lines.push("");
  lines.push("source,visits,selections,analyticsPaymentCompletions,conversionPct");
  for (const [src, s] of Object.entries(p.sources)) {
    lines.push(
      [src, s.visits ?? 0, s.selections ?? 0, s.analyticsCheckoutCompletions ?? 0, s.conversion ?? 0]
        .map(csvEscape)
        .join(",")
    );
  }
  lines.push("");
  lines.push("recentMixmindRequests_json", csvEscape(JSON.stringify(p.recentMixmindRequests)));
  lines.push("recentJukeboxRequests_json", csvEscape(JSON.stringify(p.recentJukeboxRequests)));
  return lines.join("\n");
}

function downloadBlob(filename, mime, body) {
  const blob = new Blob([body], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function formatGbp(n) {
  return `£${Number(n || 0).toFixed(2)}`;
}

const MONEY_SORT_OPTIONS = [
  { id: "earnedRevenue", label: "Earned Revenue" },
  { id: "potentialRevenue", label: "Potential Revenue" },
  { id: "lostRevenue", label: "Lost Revenue" },
  { id: "acceptanceRatePct", label: "Acceptance Rate" },
  { id: "totalRequests", label: "Total Requests" },
];

function moneyReportToCsv(rows) {
  const headers = [
    "Date",
    "Venue",
    "Mode",
    "Song Title",
    "Artist",
    "Customer Name",
    "Request Status",
    "Payment Status",
    "Potential Revenue",
    "Earned Revenue",
    "Lost Revenue",
    "Pending Revenue",
    "Created At",
  ];
  const lines = [headers.map(csvEscape).join(",")];
  for (const row of rows) {
    lines.push(
      [
        row.date,
        row.venue,
        row.mode,
        row.songTitle,
        row.artist,
        row.requesterName,
        row.status,
        row.paymentStatus,
        row.potentialRevenue,
        row.earnedRevenue,
        row.lostRevenue,
        row.pendingRevenue,
        row.createdAt,
      ]
        .map(csvEscape)
        .join(",")
    );
  }
  return lines.join("\n");
}

function buildMoneyReportJson(detail) {
  return {
    venue: detail?.venue ?? null,
    appliedRange: detail?.appliedRange ?? null,
    dateRange: detail?.dateRange ?? null,
    totals: detail?.totals ?? null,
    reportRows: detail?.reportRows ?? [],
  };
}

const FILTER_CHIPS = [
  { preset: "today", label: "Today" },
  { preset: "week", label: "This week" },
  { preset: "month", label: "This month" },
  { preset: "last6months", label: "Last 6 months" },
  { preset: "year", label: "This year" },
];

function SectionFilterControls({ value, onChange }) {
  return (
    <div className="admin-analytics-filters admin-section-filters">
      {FILTER_CHIPS.map(({ preset, label }) => (
        <button
          key={preset}
          type="button"
          className={`admin-filter-btn ${value.preset === preset ? "active" : ""}`}
          onClick={() => onChange({ ...value, preset })}
        >
          {label}
        </button>
      ))}
      <div className="admin-filter-custom">
        <span className="admin-filter-day-label">Custom</span>
        <input
          type="date"
          value={value.customStart}
          onChange={(e) =>
            onChange({ ...value, preset: "custom", customStart: e.target.value })
          }
        />
        <span style={{ opacity: 0.7 }}>–</span>
        <input
          type="date"
          value={value.customEnd}
          onChange={(e) =>
            onChange({ ...value, preset: "custom", customEnd: e.target.value })
          }
        />
      </div>
    </div>
  );
}

const AdminDashboard = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => !!localStorage.getItem("adminKey")?.trim()
  );
  const [loginInput, setLoginInput] = useState("");
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(
    () => !!localStorage.getItem("adminKey")?.trim()
  );
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [analyticsFilter, setAnalyticsFilter] = useState(() => defaultSectionFilter());
  const [revenueFilter, setRevenueFilter] = useState(() => defaultSectionFilter());
  const [venueFilter, setVenueFilter] = useState(() => defaultSectionFilter());
  const [analyticsSectionData, setAnalyticsSectionData] = useState(null);
  const [revenueSectionData, setRevenueSectionData] = useState(null);
  const [venueSectionData, setVenueSectionData] = useState(null);
  const [analyticsSectionError, setAnalyticsSectionError] = useState(null);
  const [revenueSectionError, setRevenueSectionError] = useState(null);
  const [venueSectionError, setVenueSectionError] = useState(null);
  const [detailVenueId, setDetailVenueId] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);
  const [detailTab, setDetailTab] = useState("overview");
  const [pricingForm, setPricingForm] = useState({
    spotifyJukeboxPrice: 1.0,
    djNormalPrice: 2.0,
    djPriorityPrice: 4.99,
  });
  const [pricingSaving, setPricingSaving] = useState(false);
  const [pricingMessage, setPricingMessage] = useState(null);
  const [pricingError, setPricingError] = useState(null);
  const [moneyFilter, setMoneyFilter] = useState(() => defaultSectionFilter());
  const [moneySectionData, setMoneySectionData] = useState(null);
  const [moneySectionError, setMoneySectionError] = useState(null);
  const [moneySectionLoading, setMoneySectionLoading] = useState(false);
  const [moneyVenueSearch, setMoneyVenueSearch] = useState("");
  const [moneyVenueSort, setMoneyVenueSort] = useState("earnedRevenue");
  const [moneyDetailVenueId, setMoneyDetailVenueId] = useState(null);
  const [moneyDetailData, setMoneyDetailData] = useState(null);
  const [moneyDetailLoading, setMoneyDetailLoading] = useState(false);
  const [moneyDetailError, setMoneyDetailError] = useState(null);
  const [moneyDetailTab, setMoneyDetailTab] = useState("summary");

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchDashboardData();
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    const qa = sectionFilterToQuery(analyticsFilter);
    const qr = sectionFilterToQuery(revenueFilter);
    const qv = sectionFilterToQuery(venueFilter);
    (async () => {
      setAnalyticsSectionError(null);
      setRevenueSectionError(null);
      setVenueSectionError(null);
      const results = await Promise.allSettled([
        getAnalyticsFunnel(qa),
        getAnalyticsFunnel(qr),
        getAnalyticsFunnel(qv),
      ]);
      if (cancelled) return;
      const meta = [
        {
          setter: setAnalyticsSectionData,
          errSetter: setAnalyticsSectionError,
          msg: "Could not load analytics funnel.",
          label: "analytics",
        },
        {
          setter: setRevenueSectionData,
          errSetter: setRevenueSectionError,
          msg: "Could not load true revenue.",
          label: "revenue",
        },
        {
          setter: setVenueSectionData,
          errSetter: setVenueSectionError,
          msg: "Could not load venue performance.",
          label: "venue",
        },
      ];
      results.forEach((res, i) => {
        const { setter, errSetter, msg, label } = meta[i];
        if (res.status === "fulfilled") {
          setter(res.value);
          errSetter(null);
        } else {
          console.error(`[admin analytics/${label}]`, res.reason);
          errSetter(msg);
        }
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [
    isAuthenticated,
    analyticsFilter,
    revenueFilter,
    venueFilter,
  ]);

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    const qm = sectionFilterToQuery(moneyFilter);
    (async () => {
      setMoneySectionLoading(true);
      setMoneySectionError(null);
      try {
        const data = await getMoneyVenues(qm);
        if (!cancelled) setMoneySectionData(data);
      } catch (err) {
        console.error("[admin money/venues]", err);
        if (!cancelled) setMoneySectionError("Could not load venue money stats.");
      } finally {
        if (!cancelled) setMoneySectionLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, moneyFilter]);

  useEffect(() => {
    if (!isAuthenticated || !moneyDetailVenueId) {
      setMoneyDetailData(null);
      setMoneyDetailError(null);
      return;
    }
    let cancelled = false;
    const qm = sectionFilterToQuery(moneyFilter);
    (async () => {
      try {
        setMoneyDetailLoading(true);
        setMoneyDetailError(null);
        const data = await getMoneyVenue(moneyDetailVenueId, qm);
        if (!cancelled) setMoneyDetailData(data);
      } catch (err) {
        console.error("[admin money/venue]", err);
        if (!cancelled) setMoneyDetailError("Could not load venue money details.");
      } finally {
        if (!cancelled) setMoneyDetailLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, moneyDetailVenueId, moneyFilter]);

  useEffect(() => {
    if (moneyDetailVenueId) setMoneyDetailTab("summary");
  }, [moneyDetailVenueId]);

  useEffect(() => {
    if (!isAuthenticated || !detailVenueId) {
      setDetailData(null);
      setDetailError(null);
      return;
    }
    let cancelled = false;
    const qs = sectionFilterToQuery(venueFilter);
    (async () => {
      try {
        setDetailLoading(true);
        setDetailError(null);
        const data = await getAnalyticsVenue(detailVenueId, qs);
        if (!cancelled) setDetailData(data);
      } catch (err) {
        console.error(err);
        if (!cancelled) setDetailError("Could not load venue analytics.");
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, detailVenueId, venueFilter]);

  useEffect(() => {
    if (detailVenueId) setDetailTab("overview");
  }, [detailVenueId]);

  useEffect(() => {
    if (!detailVenueId) {
      setPricingMessage(null);
      setPricingError(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_URL}/venue/public/${detailVenueId}`
        );
        if (!res.ok) throw new Error("Could not load venue pricing");
        const data = await res.json();
        if (cancelled) return;
        const prices = resolveVenuePrices(data);
        setPricingForm(prices);
        setPricingMessage(null);
        setPricingError(null);
      } catch (err) {
        if (!cancelled) {
          setPricingError(err.message || "Could not load venue pricing");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [detailVenueId]);

  const handleSaveVenuePricing = async () => {
    if (!detailVenueId) return;
    setPricingSaving(true);
    setPricingMessage(null);
    setPricingError(null);
    try {
      const result = await updateVenuePricing(detailVenueId, {
        spotifyJukeboxPrice: Number(pricingForm.spotifyJukeboxPrice),
        djNormalPrice: Number(pricingForm.djNormalPrice),
        djPriorityPrice: Number(pricingForm.djPriorityPrice),
      });
      const prices = resolveVenuePrices(result.venue);
      setPricingForm(prices);
      setPricingMessage(result.message || "Venue pricing updated");
    } catch (err) {
      setPricingError(err.message || "Failed to update pricing");
    } finally {
      setPricingSaving(false);
    }
  };

  const handleLogin = (e) => {
    e.preventDefault();
    const v = loginInput.trim();
    if (!v) return;
    localStorage.setItem("adminKey", v);
    setLoginInput("");
    setLoading(true);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem("adminKey");
    setIsAuthenticated(false);
    setDashboardData(null);
    setAnalyticsSectionData(null);
    setRevenueSectionData(null);
    setVenueSectionData(null);
    setError(null);
    setAnalyticsSectionError(null);
    setRevenueSectionError(null);
    setVenueSectionError(null);
    setDetailVenueId(null);
    setDetailData(null);
    setDetailError(null);
    setMoneySectionData(null);
    setMoneySectionError(null);
    setMoneyDetailVenueId(null);
    setMoneyDetailData(null);
    setMoneyDetailError(null);
    setLoading(false);
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getDashboardSummary();
      setDashboardData(data);
    } catch (err) {
      setError("Failed to load dashboard data. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const refetchAnalyticsSections = () => {
    const qa = sectionFilterToQuery(analyticsFilter);
    const qr = sectionFilterToQuery(revenueFilter);
    const qv = sectionFilterToQuery(venueFilter);
    const qm = sectionFilterToQuery(moneyFilter);
    setAnalyticsSectionError(null);
    setRevenueSectionError(null);
    setVenueSectionError(null);
    setMoneySectionError(null);
    Promise.allSettled([
      getAnalyticsFunnel(qa),
      getAnalyticsFunnel(qr),
      getAnalyticsFunnel(qv),
      getMoneyVenues(qm),
    ]).then((results) => {
      const meta = [
        {
          setter: setAnalyticsSectionData,
          errSetter: setAnalyticsSectionError,
          msg: "Could not load analytics funnel.",
          label: "analytics",
        },
        {
          setter: setRevenueSectionData,
          errSetter: setRevenueSectionError,
          msg: "Could not load true revenue.",
          label: "revenue",
        },
        {
          setter: setVenueSectionData,
          errSetter: setVenueSectionError,
          msg: "Could not load venue performance.",
          label: "venue",
        },
        {
          setter: setMoneySectionData,
          errSetter: setMoneySectionError,
          msg: "Could not load venue money stats.",
          label: "money",
        },
      ];
      results.forEach((res, i) => {
        const { setter, errSetter, msg, label } = meta[i];
        if (res.status === "fulfilled") {
          setter(res.value);
          errSetter(null);
        } else {
          console.error(`[admin analytics/${label}]`, res.reason);
          errSetter(msg);
        }
      });
    });
  };

  const moneyTotals = moneySectionData?.totals;
  const filteredMoneyVenues = useMemo(() => {
    let rows = Array.isArray(moneySectionData?.venues) ? moneySectionData.venues : [];
    const q = moneyVenueSearch.trim().toLowerCase();
    if (q) {
      rows = rows.filter((v) => (v.venueName || "").toLowerCase().includes(q));
    }
    const sortKey = moneyVenueSort;
    return [...rows].sort((a, b) => (b[sortKey] ?? 0) - (a[sortKey] ?? 0));
  }, [moneySectionData, moneyVenueSearch, moneyVenueSort]);

  if (!isAuthenticated) {
    return (
      <div className="admin-dashboard">
        <div style={{ maxWidth: 400, margin: "4rem auto", padding: 24 }}>
          <h1 style={{ marginBottom: 16 }}>Admin login</h1>
          <p style={{ color: "#94a3b8", marginBottom: 20 }}>
            Enter your admin key. It is stored only in this browser (localStorage).
          </p>
          <form onSubmit={handleLogin}>
            <input
              type="password"
              autoComplete="off"
              value={loginInput}
              onChange={(e) => setLoginInput(e.target.value)}
              placeholder="Admin key"
              style={{
                width: "100%",
                padding: "10px 12px",
                marginBottom: 12,
                borderRadius: 8,
                border: "1px solid rgba(168,85,247,0.4)",
                background: "rgba(0,0,0,0.3)",
                color: "#fff",
              }}
            />
            <button type="submit" className="refresh-button" style={{ width: "100%" }}>
              Continue
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="admin-dashboard loading">
        <div className="loader"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-dashboard error">
        <AlertCircle size={48} />
        <h2>Error</h2>
        <p>{error}</p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <button onClick={fetchDashboardData} className="retry-button">
            Retry
          </button>
          <button type="button" onClick={handleLogout} className="retry-button">
            Logout
          </button>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return <div className="admin-dashboard">No data available</div>;
  }

  const { summary, venues, revenue, requests } = dashboardData;
  const venueRows =
    venueSectionData == null
      ? null
      : Array.isArray(venueSectionData.venues)
        ? venueSectionData.venues
        : [];

  return (
    <div className="admin-dashboard">
      <div className="dashboard-header">
        <div className="header-content">
          <h1>Admin Dashboard</h1>
          <p className="subtitle">Complete Platform Overview & Analytics</p>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <button type="button" onClick={handleLogout} className="refresh-button">
            Logout
          </button>
          <button
            onClick={() => {
              fetchDashboardData();
              refetchAnalyticsSections();
            }}
            className="refresh-button"
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      <p
        className="subtitle"
        style={{ opacity: 0.9, marginBottom: "20px", maxWidth: "800px", lineHeight: 1.5 }}
      >
        <strong>Events</strong> = in-app analytics. <strong>DB</strong> = stored requests and real payments.{" "}
        <span style={{ opacity: 0.85 }}>
          Revenue uses captured (MixMind) and succeeded (Jukebox) payments only.
        </span>
      </p>

      {/* A) Analytics funnel */}
      <section className="summary-section funnel-section admin-insights-block">
        <div className="admin-insights-block-header">
          <h2 style={{ margin: "0 0 6px" }}>A. Analytics funnel</h2>
          <p className="subtitle admin-range-label" style={{ margin: 0, fontSize: "0.95rem" }}>
            {analyticsSectionData?.appliedRange?.label || "—"}
          </p>
          <p className="subtitle" style={{ marginTop: 6, opacity: 0.75, fontSize: "0.82rem" }}>
            {analyticsSectionData?.dateRange?.timezone || ""}
          </p>
        </div>
        <SectionFilterControls value={analyticsFilter} onChange={setAnalyticsFilter} />
        {analyticsSectionError && (
          <p style={{ color: "#f87171", marginBottom: "12px" }}>{analyticsSectionError}</p>
        )}
        {analyticsSectionData?.analyticsTotals && (
          <>
            <p className="subtitle" style={{ fontSize: "0.82rem", opacity: 0.78, marginBottom: "14px" }}>
              Numbers in this section are <strong>event-based</strong>. QR scans include visits before a venue may be
              chosen.
            </p>
            <div className="summary-grid" style={{ marginTop: "4px" }}>
              <div className="summary-card requests-card">
                <div className="card-header">
                  <QrCode size={22} />
                  <span className="badge">Events</span>
                </div>
                <div className="card-content">
                  <h3>{analyticsSectionData.analyticsTotals.qrScans}</h3>
                  <p>QR scans (all traffic)</p>
                </div>
              </div>
              <div className="summary-card requests-card">
                <div className="card-header">
                  <Activity size={22} />
                  <span className="badge">Events</span>
                </div>
                <div className="card-content">
                  <h3>{analyticsSectionData.analyticsTotals.venuePageVisits}</h3>
                  <p>Venue page visits</p>
                </div>
              </div>
              <div className="summary-card revenue-card">
                <div className="card-header">
                  <CheckCircle size={22} />
                  <span className="badge">Events</span>
                </div>
                <div className="card-content">
                  <h3>{analyticsSectionData.analyticsTotals.analyticsCheckoutCompletions}</h3>
                  <p>Analytics payment completions</p>
                </div>
              </div>
              <div className="summary-card approval-card">
                <div className="card-header">
                  <TrendingUp size={22} />
                  <span className="badge">Events</span>
                </div>
                <div className="card-content">
                  <h3>
                    {Number(
                      analyticsSectionData.analyticsTotals.visitToPaymentConversionPct ?? 0
                    ).toFixed(2)}
                    %
                  </h3>
                  <p>Conversion: page visits → payment completions</p>
                </div>
              </div>
            </div>
          </>
        )}
      </section>

      {/* B) True revenue */}
      <section className="summary-section funnel-section admin-insights-block">
        <div className="admin-insights-block-header">
          <h2 style={{ margin: "0 0 6px" }}>B. True revenue</h2>
          <p className="subtitle admin-range-label" style={{ margin: 0, fontSize: "0.95rem" }}>
            {revenueSectionData?.appliedRange?.label || "—"}
          </p>
          <p className="subtitle" style={{ marginTop: 6, opacity: 0.75, fontSize: "0.82rem" }}>
            {revenueSectionData?.dateRange?.timezone || ""}
          </p>
        </div>
        <SectionFilterControls value={revenueFilter} onChange={setRevenueFilter} />
        {revenueSectionError && (
          <p style={{ color: "#f87171", marginBottom: "12px" }}>{revenueSectionError}</p>
        )}
        {revenueSectionData?.dbTotals && (
          <>
            <p className="subtitle" style={{ fontSize: "0.82rem", opacity: 0.78, marginBottom: "14px" }}>
              All amounts below are <strong>DB-based</strong> (real captured / succeeded payments in this date range).
            </p>
            <div className="summary-grid" style={{ marginTop: "4px" }}>
              <div className="summary-card revenue-card">
                <div className="card-header">
                  <DollarSign size={22} />
                  <span className="badge">DB</span>
                </div>
                <div className="card-content">
                  <h3>£{Number(revenueSectionData.dbTotals.mixmindCapturedRevenue || 0).toFixed(2)}</h3>
                  <p>Captured MixMind revenue</p>
                </div>
              </div>
              <div className="summary-card revenue-card">
                <div className="card-header">
                  <Music size={22} />
                  <span className="badge">DB</span>
                </div>
                <div className="card-content">
                  <h3>£{Number(revenueSectionData.dbTotals.jukeboxSucceededRevenue || 0).toFixed(2)}</h3>
                  <p>Succeeded Jukebox revenue</p>
                </div>
              </div>
              <div className="summary-card approval-card">
                <div className="card-header">
                  <TrendingUp size={22} />
                  <span className="badge">DB</span>
                </div>
                <div className="card-content">
                  <h3>£{Number(revenueSectionData.dbTotals.totalTrueRevenue || 0).toFixed(2)}</h3>
                  <p>True revenue</p>
                </div>
              </div>
              <div className="summary-card requests-card">
                <div className="card-header">
                  <Users size={22} />
                  <span className="badge">DB</span>
                </div>
                <div className="card-content">
                  <h3>
                    {(revenueSectionData.dbTotals.mixmindRequestCount || 0) +
                      (revenueSectionData.dbTotals.jukeboxRequestCount || 0)}
                  </h3>
                  <p>DB requests</p>
                </div>
              </div>
            </div>
          </>
        )}
      </section>

      {/* C) Venue performance */}
      <section className="summary-section funnel-section admin-insights-block">
        <div className="admin-insights-block-header">
          <h2 style={{ margin: "0 0 6px" }}>C. Venue performance</h2>
          <p className="subtitle admin-range-label" style={{ margin: 0, fontSize: "0.95rem" }}>
            {venueSectionData?.appliedRange?.label || "—"}
          </p>
          <p className="subtitle" style={{ marginTop: 6, opacity: 0.75, fontSize: "0.82rem" }}>
            {venueSectionData?.dateRange?.timezone || ""}
          </p>
        </div>
        <SectionFilterControls value={venueFilter} onChange={setVenueFilter} />
        {venueSectionError && (
          <p style={{ color: "#f87171", marginBottom: "12px" }}>{venueSectionError}</p>
        )}
        {venueSectionData === null && !venueSectionError && (
          <p className="subtitle" style={{ fontSize: "0.85rem", opacity: 0.8, marginBottom: "12px" }}>
            Loading venue performance…
          </p>
        )}
        {venueSectionData !== null && (
          <>
            <p className="subtitle" style={{ fontSize: "0.82rem", opacity: 0.78, marginBottom: "14px" }}>
              Cards use <strong>this section&apos;s date range</strong> only. Traffic and conversion are{" "}
              <strong>event-based</strong>; requests, rejected, and revenue are <strong>DB-based</strong>.
            </p>
            {venueRows.length === 0 ? (
              <p style={{ textAlign: "center", opacity: 0.75 }}>No venues with activity in this range.</p>
            ) : (
              <div className="admin-venue-grid">
                {venueRows.map((row) => {
                  const active = row.isActive !== false;
                  const rev = row.totalTrueRevenue ?? 0;
                  const conv = row.venueFunnelConversionPct ?? row.visitToPaymentConversion ?? 0;
                  const taggedQr = row.venueTaggedQrScans ?? 0;
                  const rejected = row.dbRejectedCount ?? 0;
                  return (
                    <button
                      type="button"
                      key={row.venueId}
                      className="admin-venue-card admin-venue-card-blue"
                      onClick={() => setDetailVenueId(row.venueId)}
                    >
                      <div className="admin-venue-card-title-row">
                        <span className="admin-venue-card-title">{row.venueName || row.venueId}</span>
                        <span className={`admin-venue-status-badge ${active ? "active" : "inactive"}`}>
                          {active ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <div className="admin-venue-card-metric">
                        <span className="admin-venue-card-metric-label">Page visits</span>
                        <span className="admin-venue-card-metric-value">{row.venuePageVisits ?? 0}</span>
                        <span className="admin-venue-card-metric-hint">events</span>
                      </div>
                      {taggedQr > 0 && (
                        <p className="admin-venue-card-secondary">Tagged QR scans (this venue): {taggedQr}</p>
                      )}
                      <div className="admin-venue-card-stat">
                        <span>Conversion (events)</span>
                        <strong>{conv}%</strong>
                      </div>
                      <div className="admin-venue-card-stat admin-venue-card-stat-hint">
                        <span>page visits → payment completions</span>
                      </div>
                      <div className="admin-venue-card-stat">
                        <span>DB requests</span>
                        <strong>{row.dbRequestCount ?? 0}</strong>
                      </div>
                      <div className="admin-venue-card-stat">
                        <span>Rejected (DB)</span>
                        <strong>{rejected}</strong>
                      </div>
                      <div className="admin-venue-card-stat">
                        <span>True revenue (DB)</span>
                        <strong>£{rev.toFixed(2)}</strong>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}
      </section>

      {/* Venue Money & Request Stats — source of truth for revenue */}
      <section className="summary-section funnel-section admin-insights-block admin-money-section">
        <div className="admin-insights-block-header">
          <h2 style={{ margin: "0 0 6px" }}>💰 Venue Money &amp; Request Stats</h2>
          <p className="subtitle admin-range-label" style={{ margin: 0, fontSize: "0.95rem" }}>
            Revenue and request performance based on actual database records.
          </p>
          <p className="subtitle admin-range-label" style={{ margin: "6px 0 0", fontSize: "0.9rem" }}>
            {moneySectionData?.appliedRange?.label || "—"}
          </p>
          <p className="subtitle" style={{ marginTop: 6, opacity: 0.75, fontSize: "0.82rem" }}>
            {moneySectionData?.dateRange?.timezone || "Europe/London (London)"}
          </p>
        </div>
        <SectionFilterControls value={moneyFilter} onChange={setMoneyFilter} />
        {moneySectionError && (
          <p style={{ color: "#f87171", marginBottom: "12px" }}>{moneySectionError}</p>
        )}
        {moneySectionLoading && !moneySectionData && (
          <p className="subtitle" style={{ fontSize: "0.85rem", opacity: 0.8 }}>
            Loading money stats…
          </p>
        )}
        {moneyTotals && (
          <>
            <div className="summary-grid admin-money-top-cards" style={{ marginTop: "4px" }}>
              <div className="summary-card money-card-blue">
                <div className="card-header">
                  <DollarSign size={22} />
                  <span className="badge money-badge-blue">DB</span>
                </div>
                <div className="card-content">
                  <h3 className="money-value-blue">{formatGbp(moneyTotals.potentialRevenue)}</h3>
                  <p>Potential Revenue</p>
                </div>
              </div>
              <div className="summary-card money-card-green">
                <div className="card-header">
                  <CheckCircle size={22} />
                  <span className="badge money-badge-green">DB</span>
                </div>
                <div className="card-content">
                  <h3 className="money-value-green">{formatGbp(moneyTotals.earnedRevenue)}</h3>
                  <p>Earned Revenue</p>
                </div>
              </div>
              <div className="summary-card money-card-red">
                <div className="card-header">
                  <XCircle size={22} />
                  <span className="badge money-badge-red">DB</span>
                </div>
                <div className="card-content">
                  <h3 className="money-value-red">{formatGbp(moneyTotals.lostRevenue)}</h3>
                  <p>Lost / Refunded Revenue</p>
                </div>
              </div>
              <div className="summary-card money-card-yellow">
                <div className="card-header">
                  <Clock size={22} />
                  <span className="badge money-badge-yellow">DB</span>
                </div>
                <div className="card-content">
                  <h3 className="money-value-yellow">{formatGbp(moneyTotals.pendingRevenue)}</h3>
                  <p>Pending Revenue</p>
                </div>
              </div>
              <div className="summary-card money-card-blue">
                <div className="card-header">
                  <Users size={22} />
                  <span className="badge money-badge-blue">DB</span>
                </div>
                <div className="card-content">
                  <h3 className="money-value-blue">{moneyTotals.totalRequests ?? 0}</h3>
                  <p>Total Requests</p>
                </div>
              </div>
              <div className="summary-card money-card-green">
                <div className="card-header">
                  <CheckCircle size={22} />
                  <span className="badge money-badge-green">DB</span>
                </div>
                <div className="card-content">
                  <h3 className="money-value-green">{moneyTotals.acceptedRequests ?? 0}</h3>
                  <p>Accepted Requests</p>
                </div>
              </div>
              <div className="summary-card money-card-red">
                <div className="card-header">
                  <XCircle size={22} />
                  <span className="badge money-badge-red">DB</span>
                </div>
                <div className="card-content">
                  <h3 className="money-value-red">{moneyTotals.rejectedRequests ?? 0}</h3>
                  <p>Rejected Requests</p>
                </div>
              </div>
              <div className="summary-card money-card-yellow">
                <div className="card-header">
                  <Clock size={22} />
                  <span className="badge money-badge-yellow">DB</span>
                </div>
                <div className="card-content">
                  <h3 className="money-value-yellow">{moneyTotals.pendingDjRequests ?? 0}</h3>
                  <p>Pending DJ Decision</p>
                </div>
              </div>
              <div className="summary-card money-card-yellow">
                <div className="card-header">
                  <Clock size={22} />
                  <span className="badge money-badge-yellow">DB</span>
                </div>
                <div className="card-content">
                  <h3 className="money-value-yellow">{moneyTotals.unpaidAbandonedRequests ?? 0}</h3>
                  <p>Unpaid / Abandoned</p>
                </div>
              </div>
            </div>

            <div className="admin-money-toolbar">
              <input
                type="search"
                className="admin-money-search"
                placeholder="Search venue name…"
                value={moneyVenueSearch}
                onChange={(e) => setMoneyVenueSearch(e.target.value)}
              />
              <label className="admin-money-sort-label">
                Sort by
                <select
                  className="admin-money-sort"
                  value={moneyVenueSort}
                  onChange={(e) => setMoneyVenueSort(e.target.value)}
                >
                  {MONEY_SORT_OPTIONS.map(({ id, label }) => (
                    <option key={id} value={id}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {filteredMoneyVenues.length === 0 ? (
              <p style={{ textAlign: "center", opacity: 0.75, marginTop: "12px" }}>
                No venues with request activity in this range.
              </p>
            ) : (
              <div className="admin-venue-grid admin-money-venue-grid">
                {filteredMoneyVenues.map((row) => {
                  const active = row.isActive !== false;
                  return (
                    <button
                      type="button"
                      key={row.venueId}
                      className="admin-venue-card admin-venue-card-blue admin-money-venue-card"
                      onClick={() => setMoneyDetailVenueId(row.venueId)}
                    >
                      <div className="admin-venue-card-title-row">
                        <span className="admin-venue-card-title">{row.venueName || row.venueId}</span>
                        <span className={`admin-venue-status-badge ${active ? "active" : "inactive"}`}>
                          {active ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <div className="admin-money-metric money-value-blue">
                        <span>Potential Revenue</span>
                        <strong>{formatGbp(row.potentialRevenue)}</strong>
                      </div>
                      <div className="admin-money-metric money-value-green">
                        <span>Earned Revenue</span>
                        <strong>{formatGbp(row.earnedRevenue)}</strong>
                      </div>
                      <div className="admin-money-metric money-value-red">
                        <span>Lost / Refunded</span>
                        <strong>{formatGbp(row.lostRevenue)}</strong>
                      </div>
                      <div className="admin-money-metric money-value-yellow">
                        <span>Pending Revenue</span>
                        <strong>{formatGbp(row.pendingRevenue)}</strong>
                      </div>
                      <div className="admin-money-divider" />
                      <div className="admin-money-metric money-value-blue">
                        <span>Total Requests</span>
                        <strong>{row.totalRequests ?? 0}</strong>
                      </div>
                      <div className="admin-money-metric money-value-green">
                        <span>Accepted</span>
                        <strong>{row.acceptedRequests ?? 0}</strong>
                      </div>
                      <div className="admin-money-metric money-value-red">
                        <span>Rejected</span>
                        <strong>{row.rejectedRequests ?? 0}</strong>
                      </div>
                      <div className="admin-money-metric money-value-yellow">
                        <span>Pending DJ</span>
                        <strong>{row.pendingDjRequests ?? 0}</strong>
                      </div>
                      <div className="admin-money-metric money-value-yellow">
                        <span>Unpaid / Abandoned</span>
                        <strong>{row.unpaidAbandonedRequests ?? 0}</strong>
                      </div>
                      <div className="admin-money-divider" />
                      <div className="admin-venue-card-stat">
                        <span>Acceptance Rate</span>
                        <strong>{Number(row.acceptanceRatePct ?? 0).toFixed(1)}%</strong>
                      </div>
                      <div className="admin-venue-card-stat">
                        <span>Revenue Capture Rate</span>
                        <strong>{Number(row.revenueCaptureRatePct ?? 0).toFixed(1)}%</strong>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}
      </section>

      <div className="admin-legacy-banner" role="note">
        Legacy statistics — may not match new money reporting. Use{" "}
        <strong>Venue Money &amp; Request Stats</strong> above as the source of truth for revenue.
      </div>

      {/* SUMMARY CARDS */}
      <section className="summary-section">
        <h2>Key Metrics</h2>
        <div className="summary-grid">
          {/* Total Venues */}
          <div className="summary-card venues-card">
            <div className="card-header">
              <MapPin size={24} />
              <span className="badge">Venues</span>
            </div>
            <div className="card-content">
              <h3>{summary.totalVenues}</h3>
              <p>Total Venues</p>
            </div>
            <div className="card-stats">
              <span className="active">
                🟢 {summary.activeVenues} Active
              </span>
              <span className="inactive">
                🔴 {summary.inactiveVenues} Inactive
              </span>
            </div>
          </div>

          {/* Total Revenue */}
          <div className="summary-card revenue-card">
            <div className="card-header">
              <DollarSign size={24} />
              <span className="badge">Revenue</span>
            </div>
            <div className="card-content">
              <h3>${summary.totalRevenue.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}</h3>
              <p>Total Revenue</p>
            </div>
            <div className="card-stats">
              <span className="transactions">
                {summary.totalTransactions} Transactions
              </span>
              <span className="avg-per-venue">
                Avg: ${summary.avgRevenuePerVenue.toFixed(2)}/venue
              </span>
            </div>
          </div>

          {/* Total Requests */}
          <div className="summary-card requests-card">
            <div className="card-header">
              <Music size={24} />
              <span className="badge">Requests</span>
            </div>
            <div className="card-content">
              <h3>{summary.totalRequests}</h3>
              <p>Total Requests</p>
            </div>
            <div className="card-stats">
              <span className="approved">
                ✓ {summary.totalApproved} Approved
              </span>
              <span className="pending">
                ⧗ {summary.totalPending} Pending
              </span>
            </div>
          </div>

          {/* Approval Rate */}
          <div className="summary-card approval-card">
            <div className="card-header">
              <TrendingUp size={24} />
              <span className="badge">Approval Rate</span>
            </div>
            <div className="card-content">
              <h3>{summary.approvalRate}%</h3>
              <p>Request Approval Rate</p>
            </div>
            <div className="card-stats">
              <span className="rejected">
                ✗ {summary.totalRejected} Rejected
              </span>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${summary.approvalRate}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TABS NAVIGATION */}
      <div className="tabs-container">
        <button
          className={`tab-button ${activeTab === "overview" ? "active" : ""}`}
          onClick={() => setActiveTab("overview")}
        >
          <BarChart3 size={18} /> Overview
        </button>
        <button
          className={`tab-button ${activeTab === "venues" ? "active" : ""}`}
          onClick={() => setActiveTab("venues")}
        >
          <MapPin size={18} /> Venues
        </button>
        <button
          className={`tab-button ${activeTab === "revenue" ? "active" : ""}`}
          onClick={() => setActiveTab("revenue")}
        >
          <DollarSign size={18} /> Revenue
        </button>
        <button
          className={`tab-button ${activeTab === "songs" ? "active" : ""}`}
          onClick={() => setActiveTab("songs")}
        >
          <Music size={18} /> Songs
        </button>
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === "overview" && (
        <section className="tab-content overview-section">
          <div className="tab-grid">
            {/* Request Status Distribution */}
            <div className="card">
              <h3>Request Status Distribution</h3>
              <div className="status-distribution">
                <div className="status-item approved">
                  <CheckCircle size={20} />
                  <div className="status-info">
                    <p className="label">Approved</p>
                    <p className="count">{summary.totalApproved}</p>
                  </div>
                </div>
                <div className="status-item pending">
                  <Clock size={20} />
                  <div className="status-info">
                    <p className="label">Pending</p>
                    <p className="count">{summary.totalPending}</p>
                  </div>
                </div>
                <div className="status-item rejected">
                  <XCircle size={20} />
                  <div className="status-info">
                    <p className="label">Rejected</p>
                    <p className="count">{summary.totalRejected}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Top 5 Venues by Revenue */}
            <div className="card">
              <h3>Top 5 Venues by Revenue</h3>
              <div className="venues-list">
                {venues.top.map((venue, index) => (
                  <div key={venue._id} className="venue-item">
                    <div className="rank">{index + 1}</div>
                    <div className="venue-details">
                      <p className="name">{venue.name || "Unknown Venue"}</p>
                      <p className="stats">
                        {venue.approvedRequests} approved requests
                      </p>
                    </div>
                    <div className="revenue">
                      ${venue.totalRevenue.toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top 5 Songs */}
            <div className="card full-width">
              <h3>Top 5 Requested Songs</h3>
              <div className="songs-list">
                <div className="songs-header">
                  <span className="rank">Rank</span>
                  <span className="song">Song</span>
                  <span className="requests">Requests</span>
                  <span className="status">Approved</span>
                </div>
                {requests.topSongs.map((song, index) => (
                  <div key={index} className="song-row">
                    <span className="rank">#{index + 1}</span>
                    <span className="song">
                      <strong>{song.songName}</strong>
                      <small>{song.artistName}</small>
                    </span>
                    <span className="requests">{song.totalRequests}</span>
                    <span className="status">{song.approvedCount}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* VENUES TAB */}
      {activeTab === "venues" && (
        <section className="tab-content venues-section">
          <div className="venues-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Venue Name</th>
                  <th>Status</th>
                  <th>Total Requests</th>
                  <th>Approved</th>
                  <th>Pending</th>
                  <th>Total Revenue</th>
                </tr>
              </thead>
              <tbody>
                {venues.all.map((venue) => (
                  <tr key={venue._id}>
                    <td className="venue-name">
                      {venue.name || "Unknown Venue"}
                    </td>
                    <td className="status">
                      <span className={`status-badge ${venue.isActive ? "active" : "inactive"}`}>
                        {venue.isActive ? "🟢 Active" : "🔴 Inactive"}
                      </span>
                    </td>
                    <td>{venue.totalRequests}</td>
                    <td className="approved">{venue.approvedRequests}</td>
                    <td className="pending">{venue.pendingRequests}</td>
                    <td className="revenue">
                      ${venue.totalRevenue.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* REVENUE TAB */}
      {activeTab === "revenue" && (
        <section className="tab-content revenue-section">
          <div className="revenue-summary-card">
            <h3>Revenue Summary</h3>
            <div className="revenue-stats">
              <div className="stat">
                <p className="label">Total Revenue</p>
                <p className="value">
                  ${revenue.total.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
              </div>
              <div className="stat">
                <p className="label">Total Transactions</p>
                <p className="value">{revenue.totalTransactions}</p>
              </div>
              <div className="stat">
                <p className="label">Avg Transaction</p>
                <p className="value">
                  $
                  {revenue.totalTransactions > 0
                    ? (revenue.total / revenue.totalTransactions).toFixed(2)
                    : "0.00"}
                </p>
              </div>
            </div>
          </div>

          <div className="revenue-by-venue">
            <h3>Revenue by Venue</h3>
            <div className="venue-revenue-list">
              {revenue.byVenue.map((venueRevenue) => (
                <div key={venueRevenue.venueId} className="venue-revenue-card">
                  <div className="venue-revenue-header">
                    <h4>{venueRevenue.venueName}</h4>
                    <span className="total">
                      ${venueRevenue.totalAmount.toFixed(2)}
                    </span>
                  </div>
                  <div className="venue-revenue-stats">
                    <span className="transactions">
                      {venueRevenue.transactionCount} transactions
                    </span>
                    <span className="avg">
                      Avg: $
                      {(
                        venueRevenue.totalAmount /
                        venueRevenue.transactionCount
                      ).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* SONGS TAB */}
      {activeTab === "songs" && (
        <section className="tab-content songs-section">
          <div className="songs-stats">
            <div className="stat-card">
              <h4>Total Requests</h4>
              <p className="big-number">{requests.totalRequests}</p>
            </div>
            <div className="stat-card approved">
              <h4>Approved</h4>
              <p className="big-number">{requests.byStatus.approved.length}</p>
            </div>
            <div className="stat-card pending">
              <h4>Pending</h4>
              <p className="big-number">{requests.byStatus.pending.length}</p>
            </div>
            <div className="stat-card rejected">
              <h4>Rejected</h4>
              <p className="big-number">{requests.byStatus.rejected.length}</p>
            </div>
          </div>

          <div className="songs-grid">
            {/* Approved Requests */}
            <div className="card">
              <h3>✓ Approved Requests ({requests.byStatus.approved.length})</h3>
              <div className="requests-list">
                {requests.byStatus.approved.slice(0, 10).map((req) => (
                  <div key={req._id} className="request-item approved">
                    <p className="song">
                      <strong>{req.songName}</strong>
                      <small>{req.artistName}</small>
                    </p>
                    <p className="meta">
                      {req.venueName} • {req.userName}
                    </p>
                    <p className="amount">${req.amount.toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Pending Requests */}
            <div className="card">
              <h3>⧗ Pending Requests ({requests.byStatus.pending.length})</h3>
              <div className="requests-list">
                {requests.byStatus.pending.slice(0, 10).map((req) => (
                  <div key={req._id} className="request-item pending">
                    <p className="song">
                      <strong>{req.songName}</strong>
                      <small>{req.artistName}</small>
                    </p>
                    <p className="meta">
                      {req.venueName} • {req.userName}
                    </p>
                    <p className="amount">${req.amount.toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Rejected Requests */}
            <div className="card">
              <h3>✗ Rejected Requests ({requests.byStatus.rejected.length})</h3>
              <div className="requests-list">
                {requests.byStatus.rejected.slice(0, 10).map((req) => (
                  <div key={req._id} className="request-item rejected">
                    <p className="song">
                      <strong>{req.songName}</strong>
                      <small>{req.artistName}</small>
                    </p>
                    <p className="meta">
                      {req.venueName} • {req.userName}
                    </p>
                    <p className="amount">${req.amount.toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* VENUE DETAIL MODAL */}
      {detailVenueId && (
        <div
          className="admin-modal-overlay"
          role="presentation"
          onClick={() => setDetailVenueId(null)}
        >
          <div
            className="admin-modal"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="admin-modal-header">
              <div>
                <h2 style={{ marginBottom: 6 }}>{detailData?.venue?.name || "Venue"}</h2>
                {detailData?.venue && (
                  <span
                    className={`admin-venue-status-badge ${
                      detailData.venue.isActive !== false ? "active" : "inactive"
                    }`}
                  >
                    {detailData.venue.isActive !== false ? "Active" : "Inactive"}
                  </span>
                )}
              </div>
              <button
                type="button"
                className="admin-modal-close"
                onClick={() => setDetailVenueId(null)}
              >
                Close
              </button>
            </div>
            <p className="subtitle admin-range-label" style={{ marginBottom: 4 }}>
              {detailData?.appliedRange?.label || "—"}
            </p>
            <p className="subtitle" style={{ fontSize: "0.78rem", opacity: 0.75, marginBottom: "10px" }}>
              Uses the <strong>Venue performance</strong> date range only.
            </p>
            {detailLoading && (
              <p className="subtitle" style={{ marginBottom: "12px", opacity: 0.85 }}>
                Loading venue details…
              </p>
            )}
            {!detailLoading && detailError && (
              <div
                role="alert"
                style={{
                  marginBottom: "12px",
                  padding: "12px 14px",
                  borderRadius: "8px",
                  border: "1px solid rgba(248, 113, 113, 0.5)",
                  background: "rgba(127, 29, 29, 0.25)",
                  color: "#fecaca",
                  fontSize: "0.9rem",
                }}
              >
                {detailError}
              </div>
            )}
            {!detailLoading && detailData && !detailError && (
              <>
                <div className="admin-modal-downloads">
                  <button
                    type="button"
                    className="admin-download-btn"
                    onClick={() => {
                      const payload = buildVenueReportPayload(detailData);
                      const base = (detailData.venue?.name || "venue")
                        .replace(/[^\w-]+/g, "_")
                        .slice(0, 64);
                      downloadBlob(
                        `${base}-report.json`,
                        "application/json;charset=utf-8",
                        JSON.stringify(payload, null, 2)
                      );
                    }}
                  >
                    Download JSON
                  </button>
                  <button
                    type="button"
                    className="admin-download-btn"
                    onClick={() => {
                      const payload = buildVenueReportPayload(detailData);
                      const base = (detailData.venue?.name || "venue")
                        .replace(/[^\w-]+/g, "_")
                        .slice(0, 64);
                      downloadBlob(
                        `${base}-report.csv`,
                        "text/csv;charset=utf-8",
                        venueReportToCsv(payload)
                      );
                    }}
                  >
                    Download CSV
                  </button>
                </div>
                <div className="admin-detail-tabs">
                  {[
                    { id: "overview", label: "Overview" },
                    { id: "scans", label: "Scans & conversion" },
                    { id: "revenue", label: "Revenue" },
                    { id: "requests", label: "Requests" },
                    { id: "sources", label: "Sources" },
                    { id: "hourly", label: "Hourly" },
                  ].map(({ id, label }) => (
                    <button
                      key={id}
                      type="button"
                      className={`admin-detail-tab ${detailTab === id ? "active" : ""}`}
                      onClick={() => setDetailTab(id)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="admin-modal-body">
                {detailTab === "overview" && (
                  <section className="admin-modal-section">
                    <h3>At a glance</h3>
                    <p className="subtitle" style={{ marginBottom: "12px", lineHeight: 1.45 }}>
                      Revenue uses captured (MixMind) and succeeded (Jukebox) payments only. Event numbers are not
                      money.
                    </p>
                    <ul className="admin-modal-kv">
                      <li>
                        <span>Page visits (events)</span>
                        <strong>{detailData.funnel?.venuePageVisits ?? 0}</strong>
                      </li>
                      {(detailData.funnel?.venueTaggedQrScans ?? 0) > 0 && (
                        <li>
                          <span>Tagged QR scans (events)</span>
                          <strong>{detailData.funnel?.venueTaggedQrScans}</strong>
                        </li>
                      )}
                      <li>
                        <span>Conversion (events)</span>
                        <strong>
                          {detailData.funnel?.venueFunnelConversionPct ??
                            detailData.funnel?.visitToPaymentConversion ??
                            0}
                          %
                        </strong>
                      </li>
                      <li>
                        <span>Analytics payment completions (events)</span>
                        <strong>{detailData.funnel?.analyticsCheckoutCompletions ?? 0}</strong>
                      </li>
                      <li>
                        <span>DB requests</span>
                        <strong>
                          {(detailData.mixmind?.total ?? 0) + (detailData.jukebox?.total ?? 0)}
                        </strong>
                      </li>
                      <li>
                        <span>Rejected (DB)</span>
                        <strong>
                          {(detailData.mixmind?.rejectedFailed ?? 0) + (detailData.jukebox?.rejected ?? 0)}
                        </strong>
                      </li>
                      <li>
                        <span>Pending (DB)</span>
                        <strong>
                          {(detailData.mixmind?.pending ?? 0) + (detailData.jukebox?.pending ?? 0)}
                        </strong>
                      </li>
                      <li>
                        <span>True revenue (DB)</span>
                        <strong>
                          £
                          {(
                            (detailData.mixmind?.capturedRevenue ?? 0) +
                            (detailData.jukebox?.revenue ?? 0)
                          ).toFixed(2)}
                        </strong>
                      </li>
                    </ul>
                  </section>
                )}

                {detailTab === "overview" && (
                  <section className="admin-modal-section">
                    <h3>Request pricing</h3>
                    <p className="subtitle" style={{ marginBottom: "12px", lineHeight: 1.45 }}>
                      Admin-controlled prices shown to customers on the public request page.
                    </p>
                    <div className="admin-pricing-form">
                      <label className="admin-pricing-field">
                        <span>Spotify/Jukebox Price (£)</span>
                        <input
                          type="number"
                          min="0.01"
                          max="100"
                          step="0.01"
                          value={pricingForm.spotifyJukeboxPrice}
                          onChange={(e) =>
                            setPricingForm((prev) => ({
                              ...prev,
                              spotifyJukeboxPrice: e.target.value,
                            }))
                          }
                        />
                      </label>
                      <label className="admin-pricing-field">
                        <span>DJ Normal Price (£)</span>
                        <input
                          type="number"
                          min="0.01"
                          max="100"
                          step="0.01"
                          value={pricingForm.djNormalPrice}
                          onChange={(e) =>
                            setPricingForm((prev) => ({
                              ...prev,
                              djNormalPrice: e.target.value,
                            }))
                          }
                        />
                      </label>
                      <label className="admin-pricing-field">
                        <span>DJ Priority Price (£)</span>
                        <input
                          type="number"
                          min="0.01"
                          max="100"
                          step="0.01"
                          value={pricingForm.djPriorityPrice}
                          onChange={(e) =>
                            setPricingForm((prev) => ({
                              ...prev,
                              djPriorityPrice: e.target.value,
                            }))
                          }
                        />
                      </label>
                    </div>
                    {pricingError && (
                      <p className="admin-pricing-error" role="alert">
                        {pricingError}
                      </p>
                    )}
                    {pricingMessage && (
                      <p className="admin-pricing-success">{pricingMessage}</p>
                    )}
                    <button
                      type="button"
                      className="admin-download-btn"
                      onClick={handleSaveVenuePricing}
                      disabled={pricingSaving}
                      style={{ marginTop: "12px" }}
                    >
                      {pricingSaving ? "Saving…" : "Save pricing"}
                    </button>
                  </section>
                )}

                {detailTab === "scans" && (
                  <section className="admin-modal-section">
                    <h3>Scans & conversion (events)</h3>
                    <ul className="admin-modal-kv">
                      <li>
                        <span>Page visits</span>
                        <strong>{detailData.funnel?.venuePageVisits ?? 0}</strong>
                      </li>
                      <li>
                        <span>Tagged QR scans (this venue only)</span>
                        <strong>{detailData.funnel?.venueTaggedQrScans ?? 0}</strong>
                      </li>
                      <li>
                        <span>Venue selections</span>
                        <strong>{detailData.funnel?.venueSelections ?? 0}</strong>
                      </li>
                      <li>
                        <span>Song searches</span>
                        <strong>{detailData.funnel?.songSearches ?? 0}</strong>
                      </li>
                      <li>
                        <span>Requests started</span>
                        <strong>{detailData.funnel?.requestsStarted ?? 0}</strong>
                      </li>
                      <li>
                        <span>Checkouts started</span>
                        <strong>{detailData.funnel?.checkoutsStarted ?? 0}</strong>
                      </li>
                      <li>
                        <span>Analytics payment completions</span>
                        <strong>{detailData.funnel?.analyticsCheckoutCompletions ?? 0}</strong>
                      </li>
                      <li>
                        <span>Conversion (page visits → completions)</span>
                        <strong>
                          {detailData.funnel?.venueFunnelConversionPct ??
                            detailData.funnel?.visitToPaymentConversion ??
                            0}
                          %
                        </strong>
                      </li>
                      <li>
                        <span>Busiest hour (page visits)</span>
                        <strong>{detailData.funnel?.hottestHour || "—"}</strong>
                      </li>
                    </ul>
                  </section>
                )}

                {detailTab === "revenue" && (
                  <section className="admin-modal-section">
                    <h3>Revenue (database)</h3>
                    <p className="subtitle" style={{ marginBottom: "10px", lineHeight: 1.45 }}>
                      Revenue uses captured (MixMind) and succeeded (Jukebox) payments only.
                    </p>
                    <ul className="admin-modal-kv">
                      <li>
                        <span>Captured MixMind revenue</span>
                        <strong>£{(detailData.mixmind?.capturedRevenue ?? 0).toFixed(2)}</strong>
                      </li>
                      <li>
                        <span>Succeeded Jukebox revenue</span>
                        <strong>£{(detailData.jukebox?.revenue ?? 0).toFixed(2)}</strong>
                      </li>
                      <li>
                        <span>True revenue</span>
                        <strong>
                          £
                          {(
                            (detailData.mixmind?.capturedRevenue ?? 0) +
                            (detailData.jukebox?.revenue ?? 0)
                          ).toFixed(2)}
                        </strong>
                      </li>
                    </ul>
                  </section>
                )}

                {detailTab === "requests" && (
                  <>
                    <section className="admin-modal-section">
                      <h3>DB requests</h3>
                      <ul className="admin-modal-kv">
                        <li>
                          <span>Total DB requests</span>
                          <strong>
                            {(detailData.mixmind?.total ?? 0) + (detailData.jukebox?.total ?? 0)}
                          </strong>
                        </li>
                        <li>
                          <span>MixMind requests</span>
                          <strong>{detailData.mixmind?.total ?? 0}</strong>
                        </li>
                        <li>
                          <span>Jukebox requests</span>
                          <strong>{detailData.jukebox?.total ?? 0}</strong>
                        </li>
                      </ul>
                    </section>
                    <section className="admin-modal-section">
                      <h3>MixMind (DB)</h3>
                      <ul className="admin-modal-kv">
                        <li>
                          <span>Accepted</span>
                          <strong>{detailData.mixmind?.acceptedRequests ?? detailData.mixmind?.acceptedCompleted ?? 0}</strong>
                        </li>
                        <li>
                          <span>Rejected</span>
                          <strong>{detailData.mixmind?.rejectedRequests ?? detailData.mixmind?.rejectedFailed ?? 0}</strong>
                        </li>
                        <li>
                          <span>Pending DJ decision</span>
                          <strong>{detailData.mixmind?.pendingDjRequests ?? detailData.mixmind?.pending ?? 0}</strong>
                        </li>
                        <li>
                          <span>Unpaid / abandoned</span>
                          <strong>{detailData.mixmind?.unpaidAbandonedRequests ?? detailData.mixmind?.unpaidAbandoned ?? 0}</strong>
                        </li>
                        <li>
                          <span>Earned revenue</span>
                          <strong>£{(detailData.mixmind?.earnedRevenue ?? detailData.mixmind?.capturedRevenue ?? 0).toFixed(2)}</strong>
                        </li>
                      </ul>
                    </section>
                    <section className="admin-modal-section">
                      <h3>Jukebox (DB)</h3>
                      <ul className="admin-modal-kv">
                        <li>
                          <span>Accepted</span>
                          <strong>{detailData.jukebox?.acceptedRequests ?? detailData.jukebox?.queuedSuccess ?? 0}</strong>
                        </li>
                        <li>
                          <span>Rejected</span>
                          <strong>{detailData.jukebox?.rejectedRequests ?? detailData.jukebox?.rejected ?? 0}</strong>
                        </li>
                        <li>
                          <span>Pending</span>
                          <strong>{detailData.jukebox?.pendingDjRequests ?? detailData.jukebox?.pending ?? 0}</strong>
                        </li>
                        <li>
                          <span>Unpaid / abandoned</span>
                          <strong>{detailData.jukebox?.unpaidAbandonedRequests ?? detailData.jukebox?.unpaidAbandoned ?? 0}</strong>
                        </li>
                        <li>
                          <span>Earned revenue</span>
                          <strong>£{(detailData.jukebox?.earnedRevenue ?? detailData.jukebox?.revenue ?? 0).toFixed(2)}</strong>
                        </li>
                      </ul>
                    </section>
                    <section className="admin-modal-section">
                      <h3>Recent MixMind</h3>
                      {(detailData.mixmind?.recent || []).length === 0 ? (
                        <p className="subtitle">None in range.</p>
                      ) : (
                        <ul className="admin-recent-list">
                          {detailData.mixmind.recent.map((r) => (
                            <li key={r._id}>
                              <strong>{r.title || "—"}</strong> · {r.status} · {r.paymentStatus} · £
                              {(Number(r.paidAmount) || Number(r.price) || 0).toFixed(2)}
                            </li>
                          ))}
                        </ul>
                      )}
                    </section>
                    <section className="admin-modal-section">
                      <h3>Recent Jukebox</h3>
                      {(detailData.jukebox?.recent || []).length === 0 ? (
                        <p className="subtitle">None in range.</p>
                      ) : (
                        <ul className="admin-recent-list">
                          {detailData.jukebox.recent.map((r) => (
                            <li key={r._id}>
                              <strong>{r.trackName}</strong> · {r.status} · {r.paymentStatus} · £
                              {((Number(r.amountPence) || 0) / 100).toFixed(2)}
                            </li>
                          ))}
                        </ul>
                      )}
                    </section>
                  </>
                )}

                {detailTab === "sources" && (
                  <section className="admin-modal-section">
                    <h3>Sources (events)</h3>
                    {Object.keys(detailData.sources || {}).length === 0 ? (
                      <p className="subtitle">No sources for this venue in range.</p>
                    ) : (
                      <table className="data-table admin-modal-table">
                        <thead>
                          <tr>
                            <th>Source</th>
                            <th>Visits</th>
                            <th>Selected</th>
                            <th>Analytics payment completions</th>
                            <th>Conv %</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(detailData.sources).map(([src, s]) => (
                            <tr key={src}>
                              <td>{src}</td>
                              <td>{s.visits}</td>
                              <td>{s.selections}</td>
                              <td>{s.analyticsCheckoutCompletions ?? 0}</td>
                              <td>{s.conversion}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </section>
                )}

                {detailTab === "hourly" && (
                  <section className="admin-modal-section">
                    <h3>Hourly activity (venue-tagged events)</h3>
                    {(detailData.hourlyActivity || []).length === 0 ? (
                      <p className="subtitle">No hourly data.</p>
                    ) : (
                      <div className="admin-hourly-scroll">
                        <table className="data-table admin-modal-table">
                          <thead>
                            <tr>
                              <th>Hour</th>
                              <th>Events</th>
                            </tr>
                          </thead>
                          <tbody>
                            {detailData.hourlyActivity.map((h) => (
                              <tr key={h.hour}>
                                <td>{h.hour}</td>
                                <td>{h.count}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </section>
                )}
              </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* MONEY VENUE DETAIL MODAL */}
      {moneyDetailVenueId && (
        <div
          className="admin-modal-overlay"
          role="presentation"
          onClick={() => setMoneyDetailVenueId(null)}
        >
          <div
            className="admin-modal admin-money-modal"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="admin-modal-header">
              <div>
                <h2 style={{ marginBottom: 6 }}>{moneyDetailData?.venue?.name || "Venue"}</h2>
                {moneyDetailData?.venue && (
                  <span
                    className={`admin-venue-status-badge ${
                      moneyDetailData.venue.isActive !== false ? "active" : "inactive"
                    }`}
                  >
                    {moneyDetailData.venue.isActive !== false ? "Active" : "Inactive"}
                  </span>
                )}
              </div>
              <button
                type="button"
                className="admin-modal-close"
                onClick={() => setMoneyDetailVenueId(null)}
              >
                Close
              </button>
            </div>
            <p className="subtitle admin-range-label" style={{ marginBottom: 4 }}>
              {moneyDetailData?.appliedRange?.label || "—"}
            </p>
            <p className="subtitle" style={{ fontSize: "0.78rem", opacity: 0.75, marginBottom: "10px" }}>
              Database revenue reporting — not analytics events.
            </p>
            {moneyDetailLoading && (
              <p className="subtitle" style={{ marginBottom: "12px", opacity: 0.85 }}>
                Loading venue money details…
              </p>
            )}
            {!moneyDetailLoading && moneyDetailError && (
              <div className="admin-money-error" role="alert">
                {moneyDetailError}
              </div>
            )}
            {!moneyDetailLoading && moneyDetailData && !moneyDetailError && (
              <>
                <div className="admin-detail-tabs">
                  {[
                    { id: "summary", label: "Summary" },
                    { id: "requests", label: "Requests" },
                    { id: "recent", label: "Recent Requests" },
                    { id: "download", label: "Download" },
                  ].map(({ id, label }) => (
                    <button
                      key={id}
                      type="button"
                      className={`admin-detail-tab ${moneyDetailTab === id ? "active" : ""}`}
                      onClick={() => setMoneyDetailTab(id)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="admin-modal-body">
                  {moneyDetailTab === "summary" && (
                    <section className="admin-modal-section">
                      <h3>Revenue summary</h3>
                      <ul className="admin-modal-kv admin-money-kv">
                        <li>
                          <span className="money-value-blue">Potential Revenue</span>
                          <strong className="money-value-blue">
                            {formatGbp(moneyDetailData.totals?.potentialRevenue)}
                          </strong>
                        </li>
                        <li>
                          <span className="money-value-green">Earned Revenue</span>
                          <strong className="money-value-green">
                            {formatGbp(moneyDetailData.totals?.earnedRevenue)}
                          </strong>
                        </li>
                        <li>
                          <span className="money-value-red">Lost / Refunded Revenue</span>
                          <strong className="money-value-red">
                            {formatGbp(moneyDetailData.totals?.lostRevenue)}
                          </strong>
                        </li>
                        <li>
                          <span className="money-value-yellow">Pending Revenue</span>
                          <strong className="money-value-yellow">
                            {formatGbp(moneyDetailData.totals?.pendingRevenue)}
                          </strong>
                        </li>
                        <li>
                          <span>Acceptance Rate</span>
                          <strong>{Number(moneyDetailData.totals?.acceptanceRatePct ?? 0).toFixed(1)}%</strong>
                        </li>
                        <li>
                          <span>Revenue Capture Rate</span>
                          <strong>{Number(moneyDetailData.totals?.revenueCaptureRatePct ?? 0).toFixed(1)}%</strong>
                        </li>
                      </ul>
                      <h4 style={{ marginTop: "16px" }}>MixMind vs Jukebox</h4>
                      <ul className="admin-modal-kv admin-money-kv">
                        <li>
                          <span>MixMind earned</span>
                          <strong className="money-value-green">
                            {formatGbp(moneyDetailData.totals?.mixmind?.earnedRevenue)}
                          </strong>
                        </li>
                        <li>
                          <span>Jukebox earned</span>
                          <strong className="money-value-green">
                            {formatGbp(moneyDetailData.totals?.jukebox?.earnedRevenue)}
                          </strong>
                        </li>
                      </ul>
                    </section>
                  )}

                  {moneyDetailTab === "requests" && (
                    <section className="admin-modal-section">
                      <h3>Request counts</h3>
                      <ul className="admin-modal-kv admin-money-kv">
                        <li>
                          <span className="money-value-blue">Total</span>
                          <strong className="money-value-blue">
                            {moneyDetailData.totals?.totalRequests ?? 0}
                          </strong>
                        </li>
                        <li>
                          <span className="money-value-green">Accepted</span>
                          <strong className="money-value-green">
                            {moneyDetailData.totals?.acceptedRequests ?? 0}
                          </strong>
                        </li>
                        <li>
                          <span className="money-value-red">Rejected</span>
                          <strong className="money-value-red">
                            {moneyDetailData.totals?.rejectedRequests ?? 0}
                          </strong>
                        </li>
                        <li>
                          <span className="money-value-yellow">Pending DJ</span>
                          <strong className="money-value-yellow">
                            {moneyDetailData.totals?.pendingDjRequests ?? 0}
                          </strong>
                        </li>
                        <li>
                          <span className="money-value-yellow">Unpaid / Abandoned</span>
                          <strong className="money-value-yellow">
                            {moneyDetailData.totals?.unpaidAbandonedRequests ?? 0}
                          </strong>
                        </li>
                      </ul>
                      <h4 style={{ marginTop: "16px" }}>By mode</h4>
                      <table className="data-table admin-modal-table">
                        <thead>
                          <tr>
                            <th>Mode</th>
                            <th>Total</th>
                            <th>Accepted</th>
                            <th>Rejected</th>
                            <th>Pending DJ</th>
                            <th>Unpaid</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td>MixMind</td>
                            <td>{moneyDetailData.totals?.mixmind?.totalRequests ?? 0}</td>
                            <td>{moneyDetailData.totals?.mixmind?.acceptedRequests ?? 0}</td>
                            <td>{moneyDetailData.totals?.mixmind?.rejectedRequests ?? 0}</td>
                            <td>{moneyDetailData.totals?.mixmind?.pendingDjRequests ?? 0}</td>
                            <td>{moneyDetailData.totals?.mixmind?.unpaidAbandonedRequests ?? 0}</td>
                          </tr>
                          <tr>
                            <td>Jukebox</td>
                            <td>{moneyDetailData.totals?.jukebox?.totalRequests ?? 0}</td>
                            <td>{moneyDetailData.totals?.jukebox?.acceptedRequests ?? 0}</td>
                            <td>{moneyDetailData.totals?.jukebox?.rejectedRequests ?? 0}</td>
                            <td>{moneyDetailData.totals?.jukebox?.pendingDjRequests ?? 0}</td>
                            <td>{moneyDetailData.totals?.jukebox?.unpaidAbandonedRequests ?? 0}</td>
                          </tr>
                        </tbody>
                      </table>
                    </section>
                  )}

                  {moneyDetailTab === "recent" && (
                    <section className="admin-modal-section">
                      <h3>Recent requests</h3>
                      {(moneyDetailData.recentRequests || []).length === 0 ? (
                        <p className="subtitle">No requests in this range.</p>
                      ) : (
                        <div className="admin-hourly-scroll">
                          <table className="data-table admin-modal-table admin-money-recent-table">
                            <thead>
                              <tr>
                                <th>Mode</th>
                                <th>Song</th>
                                <th>Artist</th>
                                <th>Customer</th>
                                <th>Status</th>
                                <th>Payment</th>
                                <th>Earned</th>
                                <th>Created</th>
                              </tr>
                            </thead>
                            <tbody>
                              {moneyDetailData.recentRequests.map((r) => (
                                <tr key={`${r.mode}-${r.id}`}>
                                  <td>{r.mode}</td>
                                  <td>{r.songTitle || "—"}</td>
                                  <td>{r.artist || "—"}</td>
                                  <td>{r.requesterName || "—"}</td>
                                  <td>{r.status}</td>
                                  <td>{r.paymentStatus}</td>
                                  <td className="money-value-green">{formatGbp(r.earnedRevenue)}</td>
                                  <td>{new Date(r.createdAt).toLocaleString("en-GB")}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </section>
                  )}

                  {moneyDetailTab === "download" && (
                    <section className="admin-modal-section">
                      <h3>Export report</h3>
                      <p className="subtitle" style={{ marginBottom: "14px", lineHeight: 1.45 }}>
                        One row per request in the selected date range. All amounts in £ (GBP).
                      </p>
                      <div className="admin-modal-downloads">
                        <button
                          type="button"
                          className="admin-download-btn"
                          onClick={() => {
                            const rows = moneyDetailData.reportRows || [];
                            const base = (moneyDetailData.venue?.name || "venue")
                              .replace(/[^\w-]+/g, "_")
                              .slice(0, 64);
                            downloadBlob(
                              `${base}-money-report.csv`,
                              "text/csv;charset=utf-8",
                              moneyReportToCsv(rows)
                            );
                          }}
                        >
                          Download CSV
                        </button>
                        <button
                          type="button"
                          className="admin-download-btn"
                          onClick={() => {
                            const base = (moneyDetailData.venue?.name || "venue")
                              .replace(/[^\w-]+/g, "_")
                              .slice(0, 64);
                            downloadBlob(
                              `${base}-money-report.json`,
                              "application/json;charset=utf-8",
                              JSON.stringify(buildMoneyReportJson(moneyDetailData), null, 2)
                            );
                          }}
                        >
                          Download JSON
                        </button>
                      </div>
                      <p className="subtitle" style={{ marginTop: "12px", fontSize: "0.82rem", opacity: 0.8 }}>
                        {(moneyDetailData.reportRows || []).length} request row(s) in export.
                      </p>
                    </section>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="dashboard-footer">
        <p>Last updated: {new Date().toLocaleString()}</p>
      </footer>
    </div>
  );
};

export default AdminDashboard;