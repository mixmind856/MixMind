const path = require("path");
const fs = require("fs");
const PDFDocument = require("pdfkit");

const BRAND = "#5B4BDB";
const TEXT = "#111827";
const MUTED = "#6B7280";
const BORDER = "#E5E7EB";
const LIGHT_BG = "#F9FAFB";
const GREEN = "#059669";
const PAGE_MARGIN = 52;
const CONTENT_WIDTH = 491;

function gbp(amount) {
  return `£${Number(amount || 0).toFixed(2)}`;
}

function drawDivider(doc, y, { thick = false } = {}) {
  doc
    .strokeColor(BORDER)
    .lineWidth(thick ? 1.5 : 1)
    .moveTo(PAGE_MARGIN, y)
    .lineTo(doc.page.width - PAGE_MARGIN, y)
    .stroke();
}

function drawSectionTitle(doc, title, y) {
  doc.font("Helvetica-Bold").fontSize(12).fillColor(TEXT).text(title, PAGE_MARGIN, y);
  return y + 24;
}

function drawMetaRow(doc, label, value, y) {
  doc.font("Helvetica").fontSize(10).fillColor(MUTED).text(label, PAGE_MARGIN, y, { width: 120 });
  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor(TEXT)
    .text(value, PAGE_MARGIN + 125, y, {
      width: CONTENT_WIDTH - 125,
    });
  return y + 16;
}

function drawStatRow(doc, label, value, y) {
  doc.font("Helvetica").fontSize(10).fillColor(MUTED).text(label, PAGE_MARGIN, y, { width: 260 });
  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor(TEXT)
    .text(String(value), PAGE_MARGIN + 265, y, {
      width: CONTENT_WIDTH - 265,
      align: "right",
    });
  return y + 17;
}

function ensureSpace(doc, y, needed = 80) {
  if (y + needed > doc.page.height - PAGE_MARGIN) {
    doc.addPage();
    return PAGE_MARGIN;
  }
  return y;
}

function drawBrandHeader(doc, y) {
  const logoPath = path.join(__dirname, "../assets/mixmind-logo.png");
  if (fs.existsSync(logoPath)) {
    doc.image(logoPath, PAGE_MARGIN, y, { width: 120 });
    y += 42;
  } else {
    doc
      .roundedRect(PAGE_MARGIN, y, 34, 34, 8)
      .fill(BRAND);
    doc
      .font("Helvetica-Bold")
      .fontSize(16)
      .fillColor("#FFFFFF")
      .text("M", PAGE_MARGIN + 11, y + 8);
    doc.font("Helvetica-Bold").fontSize(24).fillColor(BRAND).text("MixMind", PAGE_MARGIN + 44, y + 6);
    y += 42;
  }
  return y;
}

function generateVenuePayoutPdf(invoiceData) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: PAGE_MARGIN });
    const chunks = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    let y = PAGE_MARGIN;

    y = drawBrandHeader(doc, y);
    y += 6;

    doc.font("Helvetica-Bold").fontSize(20).fillColor(TEXT).text("Venue Payout Statement", PAGE_MARGIN, y);
    y += 30;

    doc.font("Helvetica-Bold").fontSize(15).fillColor(TEXT).text(invoiceData.venue.name, PAGE_MARGIN, y);
    y += 22;

    y = drawMetaRow(doc, "Payout Period", invoiceData.payoutPeriod, y);
    y = drawMetaRow(doc, "Issue Date", invoiceData.issueDate, y);
    if (invoiceData.statementReference) {
      y = drawMetaRow(doc, "Statement Reference", invoiceData.statementReference, y);
    }

    y += 10;
    drawDivider(doc, y, { thick: true });
    y += 22;

    y = drawSectionTitle(doc, "Venue Performance", y);
    const perf = invoiceData.performance;
    y = drawStatRow(doc, "QR Code Scans", perf.qrCodeScans, y);
    y = drawStatRow(doc, "Total Requests", perf.totalRequests, y);
    y = drawStatRow(doc, "Conversion Rate", `${Number(perf.conversionRatePct).toFixed(2)}%`, y);
    y = drawStatRow(doc, "Accepted Requests", perf.acceptedRequests, y);
    y = drawStatRow(doc, "Rejected Requests", perf.rejectedRequests, y);
    y = drawStatRow(doc, "Pending Requests", perf.pendingRequests, y);

    if (perf.rating) {
      y += 6;
      doc
        .roundedRect(PAGE_MARGIN, y, CONTENT_WIDTH, 30, 6)
        .fillAndStroke(LIGHT_BG, BORDER);
      doc
        .font("Helvetica")
        .fontSize(10)
        .fillColor(MUTED)
        .text("Performance Rating", PAGE_MARGIN + 12, y + 9);
      doc
        .font("Helvetica-Bold")
        .fontSize(11)
        .fillColor(BRAND)
        .text(`${perf.rating.stars}  ${perf.rating.label}`, PAGE_MARGIN + 12, y + 9, {
          width: CONTENT_WIDTH - 24,
          align: "right",
        });
      y += 40;
    }

    y += 6;
    drawDivider(doc, y);
    y += 20;

    y = drawSectionTitle(doc, "Music Requests", y);
    const music = invoiceData.musicRequests || invoiceData.requestBreakdown || {};
    y = drawStatRow(doc, "DJ Requests", music.djRequests ?? 0, y);
    y = drawStatRow(doc, "Playlist Mode Requests", music.playlistModeRequests ?? 0, y);

    const types = music.requestTypes || {};
    y += 8;
    drawDivider(doc, y);
    y += 16;
    doc.font("Helvetica-Bold").fontSize(10).fillColor(TEXT).text("Request Types", PAGE_MARGIN, y);
    y += 18;
    y = drawStatRow(doc, "Free Requests", types.freeRequests ?? 0, y);
    y = drawStatRow(doc, "Standard Requests", types.standardRequests ?? 0, y);
    y = drawStatRow(doc, "Queue Jump Requests", types.queueJumpRequests ?? 0, y);
    y = drawStatRow(doc, "Play Next Requests", types.playNextRequests ?? 0, y);

    y += 6;
    drawDivider(doc, y);
    y += 20;

    y = ensureSpace(doc, y, 120);
    y = drawSectionTitle(doc, "Top Requested Songs", y);
    const songs = invoiceData.topRequestedSongs || [];
    if (songs.length === 0) {
      doc.font("Helvetica").fontSize(10).fillColor(MUTED).text("No song requests in this period.", PAGE_MARGIN, y);
      y += 20;
    } else {
      songs.forEach((song, index) => {
        const label = `${index + 1}.`;
        doc.font("Helvetica-Bold").fontSize(10).fillColor(TEXT).text(label, PAGE_MARGIN, y);
        doc
          .font("Helvetica-Bold")
          .fontSize(10)
          .fillColor(TEXT)
          .text(song.title, PAGE_MARGIN + 18, y);
        if (song.artist) {
          doc
            .font("Helvetica")
            .fontSize(9)
            .fillColor(MUTED)
            .text(song.artist, PAGE_MARGIN + 18, y + 13);
        }
        doc
          .font("Helvetica")
          .fontSize(10)
          .fillColor(MUTED)
          .text(`${song.count} request${song.count === 1 ? "" : "s"}`, PAGE_MARGIN + 265, y + 2, {
            width: CONTENT_WIDTH - 265,
            align: "right",
          });
        y += song.artist ? 34 : 22;
      });
    }

    y += 6;
    drawDivider(doc, y);
    y += 20;

    y = ensureSpace(doc, y, 180);
    y = drawSectionTitle(doc, "Financial Summary", y);
    const fin = invoiceData.financials;
    y = drawStatRow(doc, "Revenue Collected", gbp(fin.grossRevenue), y);
    y = drawStatRow(doc, "Less Stripe Fees", `-${gbp(fin.stripeFees)}`, y);
    y = drawStatRow(doc, "Less MixMind Commission", `-${gbp(fin.mixmindCommission)}`, y);

    y += 8;
    drawDivider(doc, y);
    y += 14;

    doc
      .roundedRect(PAGE_MARGIN, y, CONTENT_WIDTH, 72, 8)
      .fillAndStroke("#F3F4F6", BORDER);
    doc
      .font("Helvetica-Bold")
      .fontSize(12)
      .fillColor(TEXT)
      .text("Venue Earnings", PAGE_MARGIN + 16, y + 14);
    doc
      .font("Helvetica-Bold")
      .fontSize(28)
      .fillColor(GREEN)
      .text(gbp(fin.netVenuePayout), PAGE_MARGIN + 16, y + 34, {
        width: CONTENT_WIDTH - 32,
      });
    y += 88;

    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor(MUTED)
      .text("This amount will be transferred to your nominated bank account.", PAGE_MARGIN, y, {
        width: CONTENT_WIDTH,
        align: "center",
      });
    y += 28;

    y = ensureSpace(doc, y, 90);
    drawDivider(doc, y);
    y += 20;

    doc.font("Helvetica-Bold").fontSize(9).fillColor(BRAND).text("Powered by MixMind", PAGE_MARGIN, y, {
      align: "center",
      width: CONTENT_WIDTH,
    });
    y += 16;
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor(MUTED)
      .text("Thank you for partnering with MixMind.", PAGE_MARGIN, y, {
        align: "center",
        width: CONTENT_WIDTH,
      });
    y += 14;
    doc.text("For any payout questions please contact:", PAGE_MARGIN, y, {
      align: "center",
      width: CONTENT_WIDTH,
    });
    y += 12;
    doc.font("Helvetica-Bold").fillColor(TEXT).text("support@mixmind.co.uk", PAGE_MARGIN, y, {
      align: "center",
      width: CONTENT_WIDTH,
    });

    doc.end();
  });
}

module.exports = {
  generateVenuePayoutPdf,
};
